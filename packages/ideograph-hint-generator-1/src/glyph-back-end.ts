import { IHint, Support } from "@chlorophytum/arch";
import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxStroke, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";
import { HintAnalysis, HintingStrategy, Stem } from "@chlorophytum/ideograph-shape-analyzer-1";
import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared/src";

import * as util from "util";

function ref(z: AdjPoint) {
	const r = z.queryReference();
	if (!r) throw new Error("Unable to reference point: " + util.inspect(z));
	return r;
}

export class GlyphHintGenBackEnd {
	constructor(private readonly params: HintingStrategy) {}
	private blueHints: IHint[] = [];
	private boundaryStemsBottom: Stem[] = [];
	private boundaryStemsTop: Stem[] = [];
	private boundaryHintsFree: IHint[] = [];
	private subHints: IHint[] = [];

	public process(ar: HintAnalysis.Result) {
		this.pass1(ar);
		return this.pass2();
	}

	private pass1(ar: HintAnalysis.Result) {
		for (const blue of ar.blues) this.addBlue(blue);
		for (const fr of ar.fetchResults) {
			if (fr.boundaryBottom) this.addBoundaryStem(fr.boundaryBottom);
			if (fr.boundaryTop) this.addBoundaryStem(fr.boundaryTop);
			if (fr.pile) this.addStemPileHint(fr.pile);
			if (fr.semiBottom) this.addBottomSemiBoundaryStem(fr.semiBottom);
			if (fr.semiTop) this.addTopSemiBoundaryStem(fr.semiTop);
			for (const dependent of fr.dependent) this.addDependentHint(dependent);
		}
		for (const fs of ar.floatingStems) this.addBoundaryStem(fs);
		for (const s of ar.stems) this.addStemEdgeAlign(s);
		for (const link of ar.interpolationsAndLinks) this.addInterpolateOrLink(link);
	}

	private pass2() {
		return new Sequence.Hint([
			WithDirection.Y(
				new Sequence.Hint([
					new UseEmBox.Hint(
						this.params.emboxSystemName,
						new Sequence.Hint([
							...this.blueHints,
							...this.convertBoundaryStemHints(),
							...this.boundaryHintsFree,
							...this.subHints
						])
					)
				])
			),
			new Smooth.Hint()
		]);
	}

	private addBlue(blue: HintAnalysis.BluePoint) {
		this.blueHints.push(
			new EmBoxEdge.Hint(this.params.emboxSystemName, blue.top, ref(blue.point))
		);
	}

	private addInterpolateOrLink(fn: HintAnalysis.InterpolationOrLink) {
		if (fn.ref2) {
			this.subHints.push(new Interpolate.Hint(ref(fn.ref1), ref(fn.ref2), [ref(fn.subject)]));
		} else {
			this.subHints.push(new LinkChain.Hint([ref(fn.ref1), ref(fn.subject)]));
		}
	}

	private addBoundaryStem(boundary: HintAnalysis.BoundaryStem) {
		if (boundary.atBottom) {
			this.boundaryStemsBottom.push(boundary.stem);
		} else if (boundary.atTop) {
			this.boundaryStemsTop.push(boundary.stem);
		} else {
			this.boundaryHintsFree.push(
				new EmBoxStroke.Hint(this.params.emboxSystemName, {
					atTop: boundary.locTop,
					spur: true,
					zsBot: ref(boundary.stem.lowKey),
					zsTop: ref(boundary.stem.highKey),
					leavePixelsAbove: 1, // Ignore on purpose for diagonal dots, etc.
					leavePixelsBelow: Math.max(1, Math.min(2, boundary.flipsBelow))
				})
			);
		}
	}

	private addTopSemiBoundaryStem(boundary: HintAnalysis.TopSemiBoundaryStem) {
		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: [1, boundary.stem.turnsAbove > 1 ? 2 : 1],
				inkMinDist: [1],
				mergePriority: [0, 0],
				allowCollide: [false, false],
				topPoint: null,
				middleStrokes: [[ref(boundary.stem.lowKey), ref(boundary.stem.highKey)]],
				bottomPoint: ref(boundary.below.highKey)
			})
		);
	}
	private addBottomSemiBoundaryStem(boundary: HintAnalysis.BottomSemiBoundaryStem) {
		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: [boundary.stem.turnsBelow > 1 ? 2 : 1, 1],
				inkMinDist: [1],
				mergePriority: [0, 0],
				allowCollide: [false, false],
				topPoint: ref(boundary.above.lowKey),
				middleStrokes: [[ref(boundary.stem.lowKey), ref(boundary.stem.highKey)]],
				bottomPoint: null
			})
		);
	}

	private tbCollidable(top: null | Stem, s: Stem) {
		if (!top || top === s) return false;
		return (
			s.xMin > Support.mix(top.xMin, top.xMax, 1 / 10) &&
			s.xMax < Support.mix(top.xMin, top.xMax, 1 - 1 / 10)
		);
	}

	private addStemPileHint(pile: HintAnalysis.StemPile) {
		if (!pile.middle.length) return;

		const botSame = pile.bot === pile.middle[0];
		const topSame = pile.top === pile.middle[pile.middle.length - 1];
		const zBot = !pile.bot ? null : botSame ? ref(pile.bot.lowKey) : ref(pile.bot.highKey);
		const zTop = !pile.top ? null : topSame ? ref(pile.top.highKey) : ref(pile.top.lowKey);
		let inkMD: number[] = Array(pile.middle.length).fill(1);
		let gapMD: number[] = pile.minDist.map(t => (t ? 2 : 1));

		const allowCollide = pile.annex.map(a => true);

		// Fix gapMD
		if (botSame) gapMD[0] = 0;
		if (!this.tbCollidable(pile.bot, pile.middle[0])) {
			allowCollide[0] = false;
		}

		if (topSame) gapMD[pile.middle.length] = 0;
		if (!this.tbCollidable(pile.top, pile.middle[pile.middle.length - 1])) {
			allowCollide[pile.middle.length] = false;
		}

		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: gapMD,
				inkMinDist: inkMD,
				mergePriority: pile.annex,
				allowCollide,
				bottomPoint: zBot,
				topPoint: zTop,
				middleStrokes: pile.middle.map(s => [ref(s.lowKey), ref(s.highKey)])
			})
		);
	}

	private addDependentHint(dependent: HintAnalysis.Dependent) {
		if (dependent.type === HintAnalysis.DependentHintType.DiagHighToLow) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					giveUpMode: +1, // high to low
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [1, 3 / 4],
					inkMinDist: [1],
					mergePriority: [0, 1],
					allowCollide: [false, true],
					bottomPoint: dependent.belowFrom ? ref(dependent.belowFrom.highKey) : null,
					middleStrokes: [[ref(dependent.to.lowKey), ref(dependent.to.highKey)]],
					topPoint: ref(dependent.from.highKey)
				})
			);
		} else if (dependent.type === HintAnalysis.DependentHintType.DiagLowToHigh) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					giveUpMode: -1, // low to high
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [3 / 4, 1],
					inkMinDist: [1],
					mergePriority: [-1, 0],
					allowCollide: [true, false],
					bottomPoint: ref(dependent.from.lowKey),
					middleStrokes: [[ref(dependent.to.lowKey), ref(dependent.to.highKey)]],
					topPoint: dependent.aboveFrom ? ref(dependent.aboveFrom.lowKey) : null
				})
			);
		} else {
			this.subHints.push(
				new LinkChain.Hint([ref(dependent.from.lowKey), ref(dependent.to.lowKey)])
			);
			this.subHints.push(
				new LinkChain.Hint([ref(dependent.from.highKey), ref(dependent.to.highKey)])
			);
		}
	}

	private addStemEdgeAlign(stem: Stem) {
		if (stem.highAlign.length) {
			this.subHints.push(
				new LinkChain.Hint([ref(stem.highKey), ...stem.highAlign.map(z => ref(z))])
			);
		}
		if (stem.lowAlign.length) {
			this.subHints.push(
				new LinkChain.Hint([ref(stem.lowKey), ...stem.lowAlign.map(z => ref(z))])
			);
		}
	}

	private convertBoundaryStemHints() {
		const hints: IHint[] = [];
		const bot = this.boundaryStemsBottom.sort((a, b) => a.lowKey.y - b.lowKey.y);
		const top = this.boundaryStemsTop.sort((a, b) => b.lowKey.y - a.lowKey.y);
		if (bot.length) {
			hints.push(
				new EmBoxStroke.Hint(this.params.emboxSystemName, {
					atTop: false,
					spur: false,
					zsBot: ref(bot[0].lowKey),
					zsTop: ref(bot[0].highKey),
					leavePixelsAbove: 0,
					leavePixelsBelow: 0
				})
			);
			for (let k = 1; k < bot.length; k++) {
				hints.push(
					new MultipleAlignZone.Hint({
						emBoxName: this.params.emboxSystemName,
						gapMinDist: [3 / 4, 1],
						inkMinDist: [1],
						bottomBalanceForbidden: true,
						mergePriority: [-1, 0],
						allowCollide: [true, false],
						bottomPoint: ref(bot[0].lowKey),
						middleStrokes: [[ref(bot[k].lowKey), ref(bot[k].highKey)]],
						topPoint: null
					})
				);
			}
		}
		if (top.length) {
			hints.push(
				new EmBoxStroke.Hint(this.params.emboxSystemName, {
					atTop: true,
					spur: false,
					zsBot: ref(top[0].lowKey),
					zsTop: ref(top[0].highKey),
					leavePixelsAbove: 0,
					leavePixelsBelow: 0
				})
			);
			for (let k = 1; k < top.length; k++) {
				hints.push(
					new MultipleAlignZone.Hint({
						emBoxName: this.params.emboxSystemName,
						gapMinDist: [1, 3 / 4],
						inkMinDist: [1],
						topBalanceForbidden: true,
						mergePriority: [0, 1],
						allowCollide: [false, true],
						bottomPoint: null,
						middleStrokes: [[ref(top[k].lowKey), ref(top[k].highKey)]],
						topPoint: ref(top[0].highKey)
					})
				);
			}
		}
		return hints;
	}
}
