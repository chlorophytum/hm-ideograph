import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import Stem from "../types/stem";

export namespace HintAnalysis {
	export enum DependentHintType {
		Symmetry,
		DiagLowToHigh,
		DiagHighToLow
	}

	// Elemental
	export interface BluePoint {
		readonly top: boolean;
		readonly point: AdjPoint;
	}
	export interface InterpolationOrLink {
		readonly priority: number;
		readonly subject: AdjPoint;
		readonly ref1: AdjPoint;
		readonly ref2: null | AdjPoint;
	}
	export interface BoundaryStem {
		readonly stem: Stem;
		readonly locTop: boolean;
		readonly atBottom: boolean;
		readonly atTop: boolean;
		readonly flipsBelow: number;
		readonly flipsAbove: number;
	}
	export interface TopSemiBoundaryStem {
		readonly stem: Stem;
		readonly below: Stem;
	}
	export interface BottomSemiBoundaryStem {
		readonly stem: Stem;
		readonly above: Stem;
	}
	export interface StemPile {
		readonly bot: null | Stem;
		readonly middle: Stem[];
		readonly top: null | Stem;
		readonly annex: number[];
		readonly minDist: number[];
	}
	export interface Dependent {
		readonly type: DependentHintType;
		readonly belowFrom: null | Stem;
		readonly from: Stem;
		readonly aboveFrom: null | Stem;
		readonly to: Stem;
	}
	export interface StemEdgeAlign {
		readonly stem: Stem;
	}

	// Fetch result
	export interface FetchResults {
		boundary: BoundaryStem[];
		pile: null | StemPile;
		semiBottom: null | BottomSemiBoundaryStem;
		semiTop: null | TopSemiBoundaryStem;
		dependent: Dependent[];
	}

	// overall results
	export interface Result {
		blues: BluePoint[];
		stems: Stem[];
		fetchResults: FetchResults[];
		floatingStems: BoundaryStem[];
		interpolationsAndLinks: InterpolationOrLink[];
	}
}
