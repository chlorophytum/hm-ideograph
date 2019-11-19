import { IHint } from "@chlorophytum/arch";
import { mix } from "@chlorophytum/arch/lib/support";
import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxStroke, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";
import { HintAnalysis, HintingStrategy, Stem } from "@chlorophytum/ideograph-shape-analyzer-1";

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
			for (const bound of fr.boundary) this.addBoundaryStem(bound);
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
			new EmBoxEdge.Hint(this.params.emboxSystemName, blue.top, blue.point.id)
		);
	}

	private addInterpolateOrLink(fn: HintAnalysis.InterpolationOrLink) {
		if (fn.ref2) {
			this.subHints.push(new Interpolate.Hint(fn.ref1.id, fn.ref2.id, [fn.subject.id]));
		} else {
			this.subHints.push(new LinkChain.Hint([fn.ref1.id, fn.subject.id]));
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
					zsBot: boundary.stem.lowKey.id,
					zsTop: boundary.stem.highKey.id,
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
				topPoint: -1,
				middleStrokes: [[boundary.stem.lowKey.id, boundary.stem.highKey.id]],
				bottomPoint: boundary.below.highKey.id
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
				topPoint: boundary.above.lowKey.id,
				middleStrokes: [[boundary.stem.lowKey.id, boundary.stem.highKey.id]],
				bottomPoint: -1
			})
		);
	}

	private tbCollidable(top: null | Stem, s: Stem) {
		if (!top || top === s) return false;
		return (
			s.xMin > mix(top.xMin, top.xMax, 1 / 10) && s.xMax < mix(top.xMin, top.xMax, 1 - 1 / 10)
		);
	}

	private addStemPileHint(pile: HintAnalysis.StemPile) {
		if (!pile.middle.length) return;

		const botSame = pile.bot === pile.middle[0];
		const topSame = pile.top === pile.middle[pile.middle.length - 1];
		const zBot = !pile.bot ? -1 : botSame ? pile.bot.lowKey.id : pile.bot.highKey.id;
		const zTop = !pile.top ? -1 : topSame ? pile.top.highKey.id : pile.top.lowKey.id;
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
				middleStrokes: pile.middle.map(s => [s.lowKey.id, s.highKey.id])
			})
		);
	}

	private addDependentHint(dependent: HintAnalysis.Dependent) {
		if (dependent.type === HintAnalysis.DependentHintType.DiagHighToLow) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [1, 3 / 4],
					inkMinDist: [1],
					mergePriority: [0, 1],
					allowCollide: [false, true],
					bottomPoint: dependent.belowFrom ? dependent.belowFrom.highKey.id : -1,
					middleStrokes: [[dependent.to.lowKey.id, dependent.to.highKey.id]],
					topPoint: dependent.from.highKey.id
				})
			);
		} else if (dependent.type === HintAnalysis.DependentHintType.DiagLowToHigh) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [3 / 4, 1],
					inkMinDist: [1],
					mergePriority: [-1, 0],
					allowCollide: [true, false],
					bottomPoint: dependent.from.lowKey.id,
					middleStrokes: [[dependent.to.lowKey.id, dependent.to.highKey.id]],
					topPoint: dependent.aboveFrom ? dependent.aboveFrom.lowKey.id : -1
				})
			);
		} else {
			this.subHints.push(
				new LinkChain.Hint([dependent.from.lowKey.id, dependent.to.lowKey.id])
			);
			this.subHints.push(
				new LinkChain.Hint([dependent.from.highKey.id, dependent.to.highKey.id])
			);
		}
	}

	private addStemEdgeAlign(stem: Stem) {
		if (stem.highAlign.length) {
			this.subHints.push(
				new LinkChain.Hint([stem.highKey.id, ...stem.highAlign.map(z => z.id)])
			);
		}
		if (stem.lowAlign.length) {
			this.subHints.push(
				new LinkChain.Hint([stem.lowKey.id, ...stem.lowAlign.map(z => z.id)])
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
					zsBot: bot[0].lowKey.id,
					zsTop: bot[0].highKey.id,
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
						bottomPoint: bot[0].lowKey.id,
						middleStrokes: [[bot[k].lowKey.id, bot[k].highKey.id]],
						topPoint: -1
					})
				);
			}
		}
		if (top.length) {
			hints.push(
				new EmBoxStroke.Hint(this.params.emboxSystemName, {
					atTop: true,
					spur: false,
					zsBot: top[0].lowKey.id,
					zsTop: top[0].highKey.id,
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
						bottomPoint: -1,
						middleStrokes: [[top[k].lowKey.id, top[k].highKey.id]],
						topPoint: top[0].highKey.id
					})
				);
			}
		}
		return hints;
	}
}
