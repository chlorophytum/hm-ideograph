import { StretchProps } from "@chlorophytum/hint-embox";
import * as _ from "lodash";

import { AdjPoint } from "../types/point";
import Stem from "../types/stem";

export enum DependentHintType {
	Symmetry,
	DiagLowToHigh,
	DiagHighToLow
}
export default class HierarchySink {
	public addInterpolate(rp1: number, rp2: number, z: number) {}
	public addLink(rp0: number, z: number) {}
	public addBlue(top: boolean, z: AdjPoint) {}
	public addBoundaryStem(
		stem: Stem,
		locTop: boolean,
		atBottom: boolean,
		atTop: boolean,
		stretch: StretchProps
	) {}
	public addTopSemiBoundaryStem(stem: Stem, below: Stem) {}
	public addBottomSemiBoundaryStem(stem: Stem, above: Stem) {}
	public addStemPileHint(
		bot: null | Stem,
		middle: Stem[],
		top: null | Stem,
		botBound: boolean,
		topBound: boolean,
		annex: number[],
		turning: number[]
	) {}
	public addDependentHint(
		type: DependentHintType,
		belowFrom: null | Stem,
		from: Stem,
		aboveFrom: null | Stem,
		to: Stem
	) {}
	public addStemEdgeAlign(stem: Stem) {}
}
