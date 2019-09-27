import { IHint } from "@chlorophytum/arch";
import { mix } from "@chlorophytum/arch/lib/support";
import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxStroke, StretchProps, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";

import HierarchySink, { DependentHintType } from "../hierarchy/sink";
import { AdjPoint } from "../types/point";
import Stem from "../types/stem";

export default class HintGenSink extends HierarchySink {
	constructor(private readonly glyphKind: string) {
		super();
	}
	private subHints: IHint[] = [];

	public addBlue(top: boolean, z: AdjPoint) {
		this.subHints.push(new EmBoxEdge.Hint(this.glyphKind, top, z.id));
	}

	public addInterpolate(rp1: number, rp2: number, z: number) {
		this.subHints.push(new Interpolate.Hint(rp1, rp2, [z]));
	}
	public addLink(rp0: number, z: number) {
		this.subHints.push(new LinkChain.Hint([rp0, z]));
	}

	public addBoundaryStem(
		stem: Stem,
		locTop: boolean,
		atBottom: boolean,
		atTop: boolean,
		stretch: StretchProps
	) {
		if (atBottom || atTop) {
			this.subHints.push(
				new EmBoxStroke.Hint(
					this.glyphKind,
					atTop,
					false,
					stem.lowKey.id,
					stem.highKey.id,
					stretch
				)
			);
		} else {
			this.subHints.push(
				new EmBoxStroke.Hint(
					this.glyphKind,
					locTop,
					true,
					stem.lowKey.id,
					stem.highKey.id,
					stretch
				)
			);
		}
	}

	public addTopSemiBoundaryStem(stem: Stem, below: Stem) {
		this.subHints.push(
			new MultipleAlignZone.Hint({
				emBoxName: this.glyphKind,
				gapMinDist: [1, stem.turnsAbove > 1 ? 2 : 1],
				inkMinDist: [1],
				bottomFree: false,
				topFree: false,
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
				emBoxName: this.glyphKind,
				gapMinDist: [stem.turnsBelow > 1 ? 2 : 1, 1],
				inkMinDist: [1],
				bottomFree: false,
				topFree: false,
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
				emBoxName: this.glyphKind,
				gapMinDist: gapMD,
				inkMinDist: inkMD,
				bottomFree: !botSame,
				topFree: !topSame,
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
		if (type === DependentHintType.DiagHighToLow && belowFrom) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.glyphKind,
					gapMinDist: [1, 3 / 4],
					inkMinDist: [1],
					bottomFree: false,
					topFree: false,
					mergePriority: [0, 1],
					allowCollide: [false, true],
					bottomPoint: belowFrom.highKey.id,
					middleStrokes: [[to.lowKey.id, to.highKey.id]],
					topPoint: from.highKey.id
				})
			);
		} else if (type === DependentHintType.DiagLowToHigh && aboveFrom) {
			this.subHints.push(
				new MultipleAlignZone.Hint({
					emBoxName: this.glyphKind,
					gapMinDist: [3 / 4, 1],
					inkMinDist: [1],
					bottomFree: false,
					topFree: false,
					mergePriority: [-1, 0],
					allowCollide: [true, false],
					bottomPoint: from.lowKey.id,
					middleStrokes: [[to.lowKey.id, to.highKey.id]],
					topPoint: aboveFrom.lowKey.id
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

	public getHint() {
		return new Sequence.Hint([
			WithDirection.Y(
				new Sequence.Hint([
					new UseEmBox.Hint(this.glyphKind, new Sequence.Hint(this.subHints))
				])
			),
			new Smooth.Hint()
		]);
	}
}
