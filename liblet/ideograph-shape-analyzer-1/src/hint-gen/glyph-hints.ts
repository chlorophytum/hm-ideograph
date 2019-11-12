import { IHint } from "@chlorophytum/arch";
import { mix } from "@chlorophytum/arch/lib/support";
import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxStroke, StretchProps, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";

import { HintingStrategy } from "../strategy";
import { AdjPoint } from "../types/point";
import Stem from "../types/stem";

export enum DependentHintType {
	Symmetry,
	DiagLowToHigh,
	DiagHighToLow
}

export class HintGenSink {
	constructor(private readonly params: HintingStrategy) {}
	private blueHints: IHint[] = [];
	private boundaryStemsBottom: Stem[] = [];
	private boundaryStemsTop: Stem[] = [];
	private boundaryHintsFree: IHint[] = [];
	private subHints: IHint[] = [];

	public addBlue(top: boolean, z: AdjPoint) {
		this.blueHints.push(new EmBoxEdge.Hint(this.params.emboxSystemName, top, z.id));
	}

	public addInterpolate(rp1: number, rp2: number, z: number) {
		this.subHints.push(new Interpolate.Hint(rp1, rp2, [z]));
	}
	public addLink(rp0: number, z: number) {
		this.subHints.push(new LinkChain.Hint([rp0, z]));
	}

	public addBoundaryStem(stem: Stem, locTop: boolean, atBottom: boolean, atTop: boolean) {
		if (atBottom) {
			this.boundaryStemsBottom.push(stem);
		} else if (atTop) {
			this.boundaryStemsTop.push(stem);
		} else {
			this.boundaryHintsFree.push(
				new EmBoxStroke.Hint(this.params.emboxSystemName, {
					atTop: locTop,
					spur: true,
					zsBot: stem.lowKey.id,
					zsTop: stem.highKey.id
				})
			);
		}
	}

	public addTopSemiBoundaryStem(stem: Stem, below: Stem) {
		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: [1, stem.turnsAbove > 1 ? 2 : 1],
				inkMinDist: [1],
				mergePriority: [0, 0],
				allowCollide: [false, false],
				topPoint: -1,
				middleStrokes: [[stem.lowKey.id, stem.highKey.id]],
				bottomPoint: below.highKey.id
			})
		);
	}
	public addBottomSemiBoundaryStem(stem: Stem, above: Stem) {
		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: [stem.turnsBelow > 1 ? 2 : 1, 1],
				inkMinDist: [1],
				mergePriority: [0, 0],
				allowCollide: [false, false],
				topPoint: above.lowKey.id,
				middleStrokes: [[stem.lowKey.id, stem.highKey.id]],
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

	public addStemPileHint(
		bot: null | Stem,
		middle: Stem[],
		top: null | Stem,
		botIsBoundary: boolean,
		topIsBoundary: boolean,
		annex: number[],
		turning: number[]
	) {
		if (!middle.length) return;

		const botSame = bot === middle[0];
		const topSame = top === middle[middle.length - 1];
		const zBot = !bot ? -1 : botSame ? bot.lowKey.id : bot.highKey.id;
		const zTop = !top ? -1 : topSame ? top.highKey.id : top.lowKey.id;
		let inkMD: number[] = Array(middle.length).fill(1);
		let gapMD: number[] = turning.map(t => (t ? 2 : 1));

		const allowCollide = annex.map(a => true);

		// Fix gapMD
		if (botSame) gapMD[0] = 0;
		if (!this.tbCollidable(bot, middle[0])) {
			allowCollide[0] = false;
		}

		if (topSame) gapMD[middle.length] = 0;
		if (!this.tbCollidable(top, middle[middle.length - 1])) {
			allowCollide[middle.length] = false;
		}

		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.params.emboxSystemName,
				gapMinDist: gapMD,
				inkMinDist: inkMD,
				mergePriority: annex,
				allowCollide,
				bottomPoint: zBot,
				topPoint: zTop,
				middleStrokes: middle.map(s => [s.lowKey.id, s.highKey.id])
			})
		);
	}

	public addDependentHint(
		type: DependentHintType,
		belowFrom: null | Stem,
		from: Stem,
		aboveFrom: null | Stem,
		to: Stem
	) {
		if (type === DependentHintType.DiagHighToLow) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [1, 3 / 4],
					inkMinDist: [1],
					mergePriority: [0, 1],
					allowCollide: [false, true],
					bottomPoint: belowFrom ? belowFrom.highKey.id : -1,
					middleStrokes: [[to.lowKey.id, to.highKey.id]],
					topPoint: from.highKey.id
				})
			);
		} else if (type === DependentHintType.DiagLowToHigh) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.params.emboxSystemName,
					gapMinDist: [3 / 4, 1],
					inkMinDist: [1],
					mergePriority: [-1, 0],
					allowCollide: [true, false],
					bottomPoint: from.lowKey.id,
					middleStrokes: [[to.lowKey.id, to.highKey.id]],
					topPoint: aboveFrom ? aboveFrom.lowKey.id : -1
				})
			);
		} else {
			this.subHints.push(new LinkChain.Hint([from.lowKey.id, to.lowKey.id]));
			this.subHints.push(new LinkChain.Hint([from.highKey.id, to.highKey.id]));
		}
	}

	public addStemEdgeAlign(stem: Stem) {
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
					zsTop: bot[0].highKey.id
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
					zsTop: top[0].highKey.id
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

	public getHint() {
		return new Sequence.Hint([
			WithDirection.Y(
				new Sequence.Hint([
					new UseEmBox.Hint(
						this.params.emboxSystemName,
						this.params.EmBoxStretch,
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
}
