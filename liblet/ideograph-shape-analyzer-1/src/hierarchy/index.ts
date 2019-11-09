import * as _ from "lodash";

import { GlyphAnalysis } from "../analyze/analysis";
import { stemsAreSimilar } from "../analyze/stems/rel";
import {
	atGlyphBottom,
	atGlyphTop,
	atRadicalBottomMost,
	isHangingHookShape
} from "../si-common/stem-spatial";
import { HintingStrategy } from "../strategy";
import Stem from "../types/stem";

import HierarchySink, { DependentHintType } from "./sink";

interface LpRec {
	weight: number;
	next: number;
}
function LP(
	g: boolean[][],
	w1: number[][],
	w2: number[][],
	j: number,
	cache: (LpRec | null)[]
): LpRec {
	if (cache[j]) return cache[j]!;
	let c: LpRec = {
		weight: 0,
		next: -1
	};
	for (let k = j; k-- > 0; ) {
		if (!g[j][k]) continue;
		const ck = LP(g, w1, w2, k, cache);
		const newWeight = ck.weight + w1[j][k];
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
	type: DependentHintType;
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

export default class HierarchyAnalyzer {
	private stemMask: number[];
	public lastPathWeight = 0;
	public loops = 0;

	constructor(private analysis: GlyphAnalysis, private readonly strategy: HintingStrategy) {
		this.stemMask = [];
		for (let j = 0; j < analysis.stems.length; j++) {
			this.stemMask[j] = MaskState.Available;
		}
	}

	public pre(sink: HierarchySink) {
		for (const z of this.analysis.blueZone.topZs) sink.addBlue(true, z);
		for (const z of this.analysis.blueZone.bottomZs) sink.addBlue(false, z);
		for (const z of this.analysis.nonBlueTopBottom.topZs) sink.addBlue(true, z);
		for (const z of this.analysis.nonBlueTopBottom.bottomZs) sink.addBlue(false, z);
	}

	public fetch(sink: HierarchySink) {
		this.loops++;

		const sidPath = this.getKeyPath();
		if (!sidPath.length) return;

		const dependents = this.getDependents(sidPath);

		const { bot, top, sidPile } = this.getBotTopSid(sidPath);
		if (!this.stemIsValid(bot) || !this.stemIsValid(top) || !sidPile.length) return;

		const sp = this.analyzePileSpatial(bot, sink, top);

		const { sidPileMiddle, repeatPatternMask } = this.getMiddleStems(sidPile, sp, bot, top);

		if (sidPileMiddle.length) {
			const spMD = this.getMinGap(
				this.analysis.collisionMatrices.flips,
				top,
				bot,
				sidPileMiddle
			);
			const merging = this.getMergePriority(
				this.analysis.collisionMatrices.annexation,
				top,
				bot,
				sidPileMiddle,
				spMD,
				repeatPatternMask
			);
			sink.addStemPileHint(
				this.analysis.stems[bot],
				sidPileMiddle.map(j => this.analysis.stems[j]),
				this.analysis.stems[top],
				sp.botIsBoundary,
				sp.topIsBoundary,
				merging,
				spMD
			);
		} else if (sp.botIsBoundary && !sp.topIsBoundary && !sp.botAtGlyphBottom) {
			sink.addBottomSemiBoundaryStem(this.analysis.stems[bot], this.analysis.stems[top]);
		} else if (sp.topIsBoundary && !sp.topAtGlyphTop && !sp.botIsBoundary) {
			sink.addTopSemiBoundaryStem(this.analysis.stems[top], this.analysis.stems[bot]);
		}

		for (const dependent of dependents) {
			sink.addDependentHint(
				dependent.type,
				this.getStemBelow(bot, sidPile, top, dependent.fromStem),
				this.analysis.stems[dependent.fromStem],
				this.getStemAbove(bot, sidPile, top, dependent.fromStem),
				this.analysis.stems[dependent.toStem]
			);
		}

		for (const j of sidPath) this.stemMask[j] = MaskState.Hinted;
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
		return this.analysis.stems[j];
	}
	private stemIsNotAnalyzed(j: number) {
		return this.analysis.stems[j] && !this.stemMask[j];
	}

	private getKeyPath() {
		this.lastPathWeight = 0;
		let pathStart = -1;
		let lpCache: (LpRec | null)[] = [];
		for (let j = 0; j < this.analysis.stems.length; j++) {
			LP(
				this.analysis.directOverlaps,
				this.analysis.stemOverlapLengths,
				this.analysis.collisionMatrices.flips,
				j,
				lpCache
			);
		}
		for (let j = 0; j < this.analysis.stems.length; j++) {
			if (lpCache[j]!.weight > this.lastPathWeight) {
				this.lastPathWeight = lpCache[j]!.weight;
				pathStart = j;
			}
		}
		let path: number[] = [];
		while (pathStart >= 0) {
			path.push(pathStart);
			const next = lpCache[pathStart]!.next;
			if (pathStart >= 0 && next >= 0) this.analysis.directOverlaps[pathStart][next] = false;
			pathStart = next;
		}
		for (let m = 0; m < path.length; m++) {
			const sm = this.analysis.stems[path[m]];
			if (!sm || !sm.rid) continue;
			if ((!sm.hasGlyphStemBelow && sm.diagHigh) || (!sm.hasGlyphStemAbove && sm.diagLow)) {
				// Our key path is on a strange track
				// We selected a diagonal stroke half, but it is not a good half
				// Try to swap. 2 parts of a diagonal never occur in a path, so swapping is ok.
				let opposite = -1;
				for (let j = 0; j < this.analysis.stems.length; j++) {
					if (j !== path[m] && this.analysis.stems[j].rid === sm.rid) opposite = j;
				}
				if (opposite >= 0 && !this.stemMask[opposite]) path[m] = opposite;
			}
		}
		return _.uniq(path);
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
				const lastStem = this.analysis.stems[sidPileMiddle[patternEnd]];
				const currentStem = this.analysis.stems[sidPileMiddle[sid]];

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
			for (let k = 0; k < this.analysis.stems.length; k++) {
				if (this.stemMask[k] || k === j) continue;
				if (
					this.analysis.stems[j].rid &&
					this.analysis.stems[j].rid === this.analysis.stems[k].rid
				) {
					if (this.analysis.stems[j].diagLow && this.analysis.stems[k].diagHigh) {
						this.stemMask[k] = MaskState.Dependent;
						dependents.push({
							type: DependentHintType.DiagLowToHigh,
							fromStem: j,
							toStem: k
						});
						continue;
					}
					if (this.analysis.stems[j].diagHigh && this.analysis.stems[k].diagLow) {
						this.stemMask[k] = MaskState.Dependent;
						dependents.push({
							type: DependentHintType.DiagHighToLow,
							fromStem: j,
							toStem: k
						});
						continue;
					}
				}
				if (this.analysis.symmetry[j][k] || this.analysis.symmetry[k][j]) {
					this.stemMask[k] = MaskState.Dependent;
					dependents.push({ type: DependentHintType.Symmetry, fromStem: j, toStem: k });
					continue;
				}
			}
		}
		return dependents;
	}

	private analyzePileSpatial(bot: number, sink: HierarchySink, top: number) {
		let botIsBoundary = false,
			botAtGlyphBottom = false,
			topIsBoundary = false,
			topAtGlyphTop = false;
		if (!this.stemMask[bot]) {
			this.stemMask[bot] = MaskState.Hinted;
			botAtGlyphBottom =
				atGlyphBottom(this.analysis.stems[bot], this.strategy) &&
				!isHangingHookShape(this.analysis.stems[bot], this.strategy);
			sink.addBoundaryStem(
				this.analysis.stems[bot],
				false,
				botAtGlyphBottom,
				atGlyphTop(this.analysis.stems[bot], this.strategy),
				this.strategy.EmBoxStretch
			);
			botIsBoundary = true;
		}
		if (!this.stemMask[top]) {
			this.stemMask[top] = MaskState.Hinted;
			topAtGlyphTop = atGlyphTop(this.analysis.stems[top], this.strategy);
			sink.addBoundaryStem(
				this.analysis.stems[top],
				true,
				atGlyphBottom(this.analysis.stems[top], this.strategy),
				topAtGlyphTop,
				this.strategy.EmBoxStretch
			);
			topIsBoundary = true;
		}
		return { botAtGlyphBottom, topAtGlyphTop, botIsBoundary, topIsBoundary };
	}

	private getStemBelow(bot: number, middle: number[], top: number, j: number): Stem | null {
		const c = [bot, ...middle, top];
		const jj = c.indexOf(j);
		if (jj > 0) return this.analysis.stems[c[jj - 1]];
		else return null;
	}
	private getStemAbove(bot: number, middle: number[], top: number, j: number): Stem | null {
		const c = [bot, ...middle, top];
		const jj = c.lastIndexOf(j);
		if (jj >= 0 && jj < c.length - 1) return this.analysis.stems[c[jj + 1]];
		else return null;
	}

	private collectIpSaCalls(sink: HierarchySink) {
		let a: number[][] = [];
		for (const ip of this.analysis.interpolations) {
			a.push([ip.priority, ip.rp1.id, ip.rp2.id, ip.z.id]);
		}
		for (const ip of this.analysis.shortAbsorptions) {
			a.push([ip.priority, ip.rp0.id, ip.z.id]);
		}
		a.sort((p, q) => q[0] - p[0]);
		for (const x of a) {
			if (x.length > 3) {
				sink.addInterpolate(x[1], x[2], x[3]);
			} else {
				sink.addLink(x[1], x[2]);
			}
		}
	}

	public post(sink: HierarchySink) {
		for (let j = 0; j < this.analysis.stems.length; j++) {
			if (!this.stemMask[j]) {
				sink.addBoundaryStem(
					this.analysis.stems[j],
					!this.analysis.stems[j].hasGlyphStemAbove,
					atGlyphBottom(this.analysis.stems[j], this.strategy),
					atGlyphTop(this.analysis.stems[j], this.strategy),
					this.strategy.EmBoxStretch
				);
			}
		}
		for (const stem of this.analysis.stems) {
			sink.addStemEdgeAlign(stem);
		}
		this.collectIpSaCalls(sink);
	}

	private getMergePairData(
		m: number[][],
		j: number,
		k: number,
		index: number,
		repeatGapSide: boolean,
		repeatGapCenter: boolean,
		gaps: MergeDecideGap[]
	) {
		const sj = this.analysis.stems[j];
		const sk = this.analysis.stems[k];
		const multiplier =
			j === k || m[j][k] >= this.strategy.DEADLY_MERGE
				? 0
				: sj.xMin >= sk.xMin && sj.xMax <= sk.xMax
				? -1
				: 1;
		gaps.push({
			index,
			sidAbove: j,
			sidBelow: k,
			multiplier,
			order: 0,
			merged: false,
			repeatGapMultiplier: repeatGapCenter ? 1 / 256 : repeatGapSide ? 1 / 16 : 1
		});
	}

	private optimizeMergeGaps(m: number[][], gaps: MergeDecideGap[]) {
		let n = 1 + gaps.length;
		for (;;) {
			let mergeGapId = -1;
			let minCost = this.strategy.DEADLY_MERGE;
			for (let j = 0; j < gaps.length; j++) {
				const gap = gaps[j];
				if (!gap.multiplier || gap.merged) continue;
				gap.merged = true; // pretend we are merged
				let jMin = j,
					jMax = j;
				while (jMin >= 0 && gaps[jMin].merged) jMin--;
				while (jMax < gaps.length && gaps[jMax].merged) jMax++;

				let cost = 0;
				for (let p = jMin + 1; p < jMax; p++) {
					for (let q = jMin + 1; q <= p; q++) {
						cost +=
							m[gaps[p].sidAbove][gaps[q].sidBelow] *
							Math.min(gaps[p].repeatGapMultiplier, gaps[q].repeatGapMultiplier);
					}
				}

				if (cost < minCost) {
					minCost = cost;
					mergeGapId = j;
				}

				gap.merged = false;
			}
			if (mergeGapId >= 0) {
				gaps[mergeGapId].order = n;
				gaps[mergeGapId].merged = true;
				n--;
			} else {
				return;
			}
		}
	}

	private getMergePriority(
		m: number[][],
		top: number,
		bot: number,
		middle: number[],
		md: number[],
		rpm: boolean[]
	) {
		let gaps: MergeDecideGap[] = [];
		this.getMergePairData(m, middle[0], bot, 0, rpm[0], false, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMergePairData(
				m,
				middle[j],
				middle[j - 1],
				j,
				rpm[j] || rpm[j - 1],
				rpm[j] && rpm[j - 1],
				gaps
			);
		}
		this.getMergePairData(
			m,
			top,
			middle[middle.length - 1],
			middle.length,
			rpm[middle.length - 1],
			false,
			gaps
		);
		this.optimizeMergeGaps(m, gaps);

		return gaps.map((x, j) => x.order * x.multiplier * (md[j] ? 0 : 1));
	}

	private getMinGapData(f: number[][], j: number, k: number, gaps: number[]) {
		gaps.push(f[j][k] > 1 || f[k][j] > 1 ? 1 : 0);
	}
	private getMinGap(f: number[][], top: number, bot: number, middle: number[]) {
		let gaps: number[] = [];
		this.getMinGapData(f, middle[0], bot, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMinGapData(f, middle[j], middle[j - 1], gaps);
		}
		this.getMinGapData(f, top, middle[middle.length - 1], gaps);
		return gaps;
	}
}
