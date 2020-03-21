import { CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";
import * as _ from "lodash";

import { ShapeAnalysisResult } from "../shape-analyze/analysis";
import analyzePostStemHints from "../shape-analyze/post-stem";
import analyzeRadicals from "../shape-analyze/radicals";
import analyzeStems from "../shape-analyze/stems";
import { stemsAreSimilar } from "../shape-analyze/stems/rel";
import { atGlyphBottom, atGlyphTop, isHangingHookShape } from "../si-common/stem-spatial";
import { HintingStrategy } from "../strategy";
import Stem from "../types/stem";

import { MergeCalculator } from "./calc-annex";
import { DisjointSet } from "./disjoint-set";
import { HintAnalysis } from "./type";

interface LpRec {
	weight: number;
	next: number;
}
function LP(
	g: boolean[][],
	ds: DisjointSet,
	w1: number[][],
	w2: number[][],
	j: number,
	cache: (LpRec | null)[]
): LpRec {
	if (cache[j]) return cache[j]!;
	let c: LpRec = { weight: 0, next: -1 };
	for (let k = j; k-- > 0; ) {
		if (!g[j][k]) continue;

		let deltaWeight = 0;
		const linkedStems = [...ds.sameSet(k)];
		for (const s of linkedStems) deltaWeight += w1[j][s];
		deltaWeight *= linkedStems.length;

		const ck = LP(g, ds, w1, w2, k, cache);
		const newWeight = ck.weight + deltaWeight;
		if (newWeight > c.weight) {
			c.weight = newWeight;
			c.next = k;
		}
	}
	cache[j] = c;
	return c;
}

enum MaskState {
	Available = 0,
	Dependent = 1,
	Hinted = 2
}

interface DependentHint {
	type: HintAnalysis.DependentHintType;
	fromStem: number;
	toStem: number;
}

interface MergeDecideGap {
	index: number;
	sidAbove: number;
	sidBelow: number;
	multiplier: number;
	repeatGapMultiplier: number;
	order: number;
	merged: boolean;
}

interface StemPileSpatial {
	botAtGlyphBottom: boolean;
	topAtGlyphTop: boolean;
	botIsBoundary: boolean;
	topIsBoundary: boolean;
}

class HintAnalyzer {
	private stemMask: number[];
	private dependentSet: DisjointSet;
	public lastPathWeight = 0;
	public loops = 0;
	constructor(private sa: ShapeAnalysisResult, private readonly strategy: HintingStrategy) {
		this.stemMask = [];
		this.dependentSet = new DisjointSet(sa.stems.length);
		for (let j = 0; j < sa.stems.length; j++) {
			this.stemMask[j] = MaskState.Available;
		}
	}

	public pre(hr: HintAnalysis.Result) {
		hr.stems = this.sa.stems;
		for (const z of this.sa.blueZone.topZs) {
			hr.blues.push({ top: true, point: z });
		}
		for (const z of this.sa.blueZone.bottomZs) {
			hr.blues.push({ top: false, point: z });
		}
		for (const z of this.sa.nonBlueTopBottom.topZs) {
			hr.blues.push({ top: true, point: z });
		}
		for (const z of this.sa.nonBlueTopBottom.bottomZs) {
			hr.blues.push({ top: false, point: z });
		}
	}

	public fetch(hr: HintAnalysis.Result) {
		const fr: HintAnalysis.FetchResults = {
			boundary: [],
			pile: null,
			semiBottom: null,
			semiTop: null,
			dependent: []
		};
		this.loops++;

		const sidPath = this.getKeyPath();
		if (!sidPath.length) return;
		const dependents = this.getDependents(sidPath);

		this.removeSidPathLinks(dependents, sidPath);

		const { bot, top, sidPile } = this.getBotTopSid(sidPath);
		if (!this.stemIsValid(bot) || !this.stemIsValid(top) || !sidPile.length) return;

		const sp = {
			...this.analyzeBottomStemSpatial(fr, bot),
			...this.analyzeTopStemSpatial(fr, top)
		};

		const { sidPileMiddle, repeatPatternMask } = this.getMiddleStems(sidPile, sp, bot, top);

		if (sidPileMiddle.length) {
			const mc = new MergeCalculator(this.sa, this.strategy);
			const spMD = mc.getMinGap(this.sa.collisionMatrices.flips, top, bot, sidPileMiddle);
			const annex = mc.getMergePriority(
				this.sa.collisionMatrices.annexation,
				top,
				bot,
				sidPileMiddle,
				spMD,
				repeatPatternMask
			);
			fr.pile = {
				bot: this.sa.stems[bot],
				middle: sidPileMiddle.map(j => this.sa.stems[j]),
				top: this.sa.stems[top],
				annex: annex,
				minDist: spMD
			};
		} else if (sp.botIsBoundary && !sp.topIsBoundary && !sp.botAtGlyphBottom) {
			fr.semiBottom = {
				stem: this.sa.stems[bot],
				above: this.sa.stems[top]
			};
		} else if (sp.topIsBoundary && !sp.topAtGlyphTop && !sp.botIsBoundary) {
			fr.semiTop = {
				stem: this.sa.stems[top],
				below: this.sa.stems[bot]
			};
		}

		for (const dependent of dependents) {
			fr.dependent.push({
				type: dependent.type,
				belowFrom: this.getStemBelow(bot, sidPile, top, dependent.fromStem),
				from: this.sa.stems[dependent.fromStem],
				aboveFrom: this.getStemAbove(bot, sidPile, top, dependent.fromStem),
				to: this.sa.stems[dependent.toStem]
			});
		}
		hr.fetchResults.push(fr);
		for (const j of sidPath) this.stemMask[j] = MaskState.Hinted;
	}

	private removeSidPathLinks(dependents: DependentHint[], sidPath: number[]) {
		for (const dependent of dependents) {
			this.dependentSet.union(dependent.toStem, dependent.fromStem);
		}
		for (let m = 1; m < sidPath.length; m++) {
			for (const p of this.dependentSet.sameSet(sidPath[m - 1])) {
				for (const q of this.dependentSet.sameSet(sidPath[m])) {
					this.sa.directOverlaps[p][q] = this.sa.directOverlaps[q][p] = false;
				}
			}
		}
	}

	private getBotTopSid(sidPath: number[]) {
		let ixTop = 0;
		while (
			ixTop < sidPath.length &&
			this.stemIsValid(sidPath[ixTop]) &&
			this.stemIsValid(sidPath[ixTop + 1]) &&
			!this.stemIsNotAnalyzed(sidPath[ixTop]) &&
			!this.stemIsNotAnalyzed(sidPath[ixTop + 1])
		) {
			ixTop++;
		}
		let ixBot = sidPath.length - 1;
		while (
			ixBot > ixTop &&
			this.stemIsValid(sidPath[ixBot]) &&
			this.stemIsValid(sidPath[ixBot - 1]) &&
			!this.stemIsNotAnalyzed(sidPath[ixBot]) &&
			!this.stemIsNotAnalyzed(sidPath[ixBot - 1])
		) {
			ixBot--;
		}

		let sidPile: number[] = [];
		for (let s = ixTop; s <= ixBot; s++) {
			if (this.stemIsValid(sidPath[s]) && this.stemIsNotAnalyzed(sidPath[s])) {
				sidPile.push(sidPath[s]);
			}
		}
		return { top: sidPath[ixTop], bot: sidPath[ixBot], sidPile: sidPile.reverse() };
	}

	private stemIsValid(j: number) {
		return this.sa.stems[j];
	}
	private stemIsNotAnalyzed(j: number) {
		return this.sa.stems[j] && !this.stemMask[j];
	}

	private getKeyPath() {
		const lpCache = this.computeLpCache();
		const path = this.fetchKeyPath(lpCache);
		this.amendKeyPath(path);
		return _.uniq(path);
	}

	private computeLpCache() {
		let lpCache: (LpRec | null)[] = [];
		for (let j = 0; j < this.sa.stems.length; j++) {
			LP(
				this.sa.directOverlaps,
				this.dependentSet,
				this.sa.stemOverlapLengths,
				this.sa.collisionMatrices.flips,
				j,
				lpCache
			);
		}
		return lpCache;
	}

	private fetchKeyPath(lpCache: (LpRec | null)[]) {
		let pathStart = -1;
		this.lastPathWeight = 0;
		for (let j = 0; j < this.sa.stems.length; j++) {
			if (lpCache[j]!.weight > this.lastPathWeight) {
				this.lastPathWeight = lpCache[j]!.weight;
				pathStart = j;
			}
		}

		let path: number[] = [];
		while (pathStart >= 0) {
			path.push(pathStart);
			const next = lpCache[pathStart]!.next;
			pathStart = next;
			if (this.stemMask[next]) break;
		}

		return path;
	}

	private amendKeyPath(path: number[]) {
		for (let m = 0; m < path.length; m++) {
			const sm = this.sa.stems[path[m]];
			if (!sm || !sm.rid) continue;
			if ((!sm.hasGlyphStemBelow && sm.diagHigh) || (!sm.hasGlyphStemAbove && sm.diagLow)) {
				// Our key path is on a strange track
				// We selected a diagonal stroke half, but it is not a good half
				// Try to swap. 2 parts of a diagonal never occur in a path, so swapping is ok.
				let opposite = -1;
				for (let j = 0; j < this.sa.stems.length; j++) {
					if (j !== path[m] && this.sa.stems[j].rid === sm.rid) opposite = j;
				}
				if (opposite >= 0 && !this.stemMask[opposite]) path[m] = opposite;
			}
		}
	}

	private getMiddleStems(sidPile: number[], sp: StemPileSpatial, bot: number, top: number) {
		const repeatPatternsOrig = this.findRepeatPatterns(sidPile);
		const m = this.filterRepeatPatternStemIDs(sidPile, repeatPatternsOrig);

		const sidPileMiddle: number[] = [];
		const mask: boolean[] = [];
		for (let j = 0; j < m.sidPileMiddle.length; j++) {
			const item = m.sidPileMiddle[j];
			if (!sp.botAtGlyphBottom && item === bot) continue;
			if (!sp.topAtGlyphTop && item === top) continue;
			sidPileMiddle.push(item);
			mask.push(m.repeatPatternMask[j]);
		}
		return { sidPileMiddle, repeatPatternMask: mask };
	}

	private findRepeatPatterns(sidPileMiddle: number[]) {
		let repeatPatterns: [number, number][] = [];
		let patternStart = 0,
			patternEnd = 0;
		for (let sid = 1; sid < sidPileMiddle.length - 1; sid++) {
			if (!patternStart) {
				patternStart = patternEnd = sid;
			} else {
				const lastStem = this.sa.stems[sidPileMiddle[patternEnd]];
				const currentStem = this.sa.stems[sidPileMiddle[sid]];

				if (stemsAreSimilar(this.strategy, currentStem, lastStem)) {
					patternEnd = sid;
				} else {
					this.flushRepeatPattern(repeatPatterns, patternStart, patternEnd);
					patternStart = patternEnd = sid;
				}
			}
		}
		this.flushRepeatPattern(repeatPatterns, patternStart, patternEnd);
		return repeatPatterns;
	}

	private flushRepeatPattern(
		repeatPatterns: [number, number][],
		patternStart: number,
		patternEnd: number
	) {
		if (patternEnd <= patternStart) return;
		if (
			repeatPatterns.length &&
			repeatPatterns[repeatPatterns.length - 1][0] + 1 === patternStart
		) {
			repeatPatterns[repeatPatterns.length - 1][1] = patternEnd;
		} else {
			repeatPatterns.push([patternStart, patternEnd]);
		}
	}

	private filterRepeatPatternStemIDs(
		pile: readonly number[],
		repeatPatterns: readonly [number, number][]
	) {
		let mask: boolean[] = [];
		for (const [s, e] of repeatPatterns) for (let j = s; j <= e; j++) mask[j] = true;
		return { sidPileMiddle: pile, repeatPatternMask: mask };
	}

	private repeatStemMergePri(n: number) {
		const a: number[] = [];
		for (let j = 0; j <= n; j++) {
			a.push(j === 0 || j === n ? 0 : j * (j % 2 ? 1 : -1));
		}
		return a;
	}

	private getDependents(path: number[]) {
		let dependents: DependentHint[] = [];

		for (const j of path) {
			if (this.stemMask[j]) continue;
			for (let k = 0; k < this.sa.stems.length; k++) {
				if (this.stemMask[k] || k === j) continue;
				if (this.sa.stems[j].rid && this.sa.stems[j].rid === this.sa.stems[k].rid) {
					if (this.sa.stems[j].diagLow && this.sa.stems[k].diagHigh) {
						this.stemMask[k] = MaskState.Dependent;
						dependents.push({
							type: HintAnalysis.DependentHintType.DiagLowToHigh,
							fromStem: j,
							toStem: k
						});
						continue;
					}
					if (this.sa.stems[j].diagHigh && this.sa.stems[k].diagLow) {
						this.stemMask[k] = MaskState.Dependent;
						dependents.push({
							type: HintAnalysis.DependentHintType.DiagHighToLow,
							fromStem: j,
							toStem: k
						});
						continue;
					}
				}
				if (this.sa.symmetry[j][k] || this.sa.symmetry[k][j]) {
					this.stemMask[k] = MaskState.Dependent;
					dependents.push({
						type: HintAnalysis.DependentHintType.Symmetry,
						fromStem: j,
						toStem: k
					});
					continue;
				}
			}
		}
		return dependents;
	}

	private analyzeBottomStemSpatial(fr: HintAnalysis.FetchResults, bot: number) {
		let botIsBoundary = false,
			botAtGlyphBottom = false;
		if (!this.stemMask[bot]) {
			const stem = this.sa.stems[bot];
			this.stemMask[bot] = MaskState.Hinted;
			botAtGlyphBottom =
				atGlyphBottom(stem, this.strategy) && !isHangingHookShape(stem, this.strategy);

			fr.boundary.push({
				stem: stem,
				locTop: false,
				atBottom: botAtGlyphBottom,
				atTop: atGlyphTop(stem, this.strategy),
				flipsBelow: stem.turnsBelow,
				flipsAbove: stem.turnsAbove
			});

			botIsBoundary = true;
		}

		return { botAtGlyphBottom, botIsBoundary };
	}
	private analyzeTopStemSpatial(fr: HintAnalysis.FetchResults, top: number) {
		let topIsBoundary = false,
			topAtGlyphTop = false;
		if (!this.stemMask[top]) {
			const stem = this.sa.stems[top];
			this.stemMask[top] = MaskState.Hinted;
			topAtGlyphTop = atGlyphTop(stem, this.strategy);

			fr.boundary.push({
				stem: stem,
				locTop: true,
				atBottom: atGlyphBottom(stem, this.strategy),
				atTop: topAtGlyphTop,
				flipsBelow: stem.turnsBelow,
				flipsAbove: stem.turnsAbove
			});

			topIsBoundary = true;
		}
		return { topAtGlyphTop, topIsBoundary };
	}

	private getStemBelow(bot: number, middle: number[], top: number, j: number): Stem | null {
		const c = [bot, ...middle, top];
		const jj = c.indexOf(j);
		if (jj > 0) return this.sa.stems[c[jj - 1]];
		else return null;
	}
	private getStemAbove(bot: number, middle: number[], top: number, j: number): Stem | null {
		const c = [bot, ...middle, top];
		const jj = c.lastIndexOf(j);
		if (jj >= 0 && jj < c.length - 1) return this.sa.stems[c[jj + 1]];
		else return null;
	}

	private collectIpSaCalls() {
		let a: HintAnalysis.InterpolationOrLink[] = [
			...this.sa.interpolations,
			...this.sa.shortAbsorptions
		];

		a.sort((p, q) => q.priority - p.priority);
		return a;
	}

	public post(hr: HintAnalysis.Result) {
		for (let j = 0; j < this.sa.stems.length; j++) {
			if (!this.stemMask[j]) {
				const stem = this.sa.stems[j];

				hr.floatingStems.push({
					stem: stem,
					locTop: !stem.hasGlyphStemAbove,
					atBottom: atGlyphBottom(stem, this.strategy),
					atTop: atGlyphTop(stem, this.strategy),
					flipsBelow: stem.turnsBelow,
					flipsAbove: stem.turnsAbove
				});
			}
		}
		hr.interpolationsAndLinks = this.collectIpSaCalls();
	}
}

export default function analyzeGlyph(strategy: HintingStrategy, glyph: CGlyph) {
	const analysis = new ShapeAnalysisResult();
	analysis.radicals = analyzeRadicals(glyph.contours);
	analyzeStems(glyph, strategy, analysis);
	analyzePostStemHints(glyph, strategy, analysis);

	const ha = new HintAnalyzer(analysis, strategy);
	const hr: HintAnalysis.Result = {
		blues: [],
		stems: [],
		fetchResults: [],
		floatingStems: [],
		interpolationsAndLinks: []
	};

	ha.pre(hr);
	do {
		ha.fetch(hr);
	} while (ha.lastPathWeight && ha.loops < 256);
	ha.post(hr);
	return hr;
}
