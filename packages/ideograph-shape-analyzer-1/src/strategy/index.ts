import { IFontSource, Variation } from "@chlorophytum/arch";
import {
	DefaultIdeographHintingParams,
	IdeographHintingParams
} from "@chlorophytum/ideograph-shape-analyzer-shared";

const PREVENT_ANNEX = 1e12;

export type EmBoxProps = {
	Bottom: number;
	Top: number;
	StrokeBottom: number;
	StrokeTop: number;
	SpurBottom: number;
	SpurTop: number;
	SmallSizeExpansionRate: number;
};

export const DefaultEmBoxProps: EmBoxProps = {
	Bottom: -120 / 1000,
	Top: 880 / 1000,
	StrokeBottom: (380 - 440) / 1000,
	StrokeTop: (380 + 440) / 1000,
	SpurBottom: (380 - 475) / 1000,
	SpurTop: (380 + 475) / 1000,
	SmallSizeExpansionRate: 1
};

export type HintingStrategy = IdeographHintingParams & {
	readonly UPM: number;
	readonly instanceForAnalysis?: null | undefined | Variation.Instance;

	readonly EmBox: EmBoxProps;

	readonly CANONICAL_STEM_WIDTH: number;
	readonly MAX_STEM_WDTH_X: number;
	readonly ABSORPTION_LIMIT: number;
	readonly STEM_SIDE_MIN_RISE: number;
	readonly STEM_SIDE_MIN_DESCENT: number;
	readonly STEM_CENTER_MIN_RISE: number;
	readonly STEM_CENTER_MIN_DESCENT: number;
	readonly STEM_SIDE_MIN_DIST_RISE: number;
	readonly STEM_SIDE_MIN_DIST_DESCENT: number;

	readonly X_FUZZ: number;
	readonly Y_FUZZ: number;
	readonly Y_FUZZ_DIAG: number;
	readonly SLOPE_FUZZ: number;
	readonly SLOPE_FUZZ_POS: number;
	readonly SLOPE_FUZZ_POST: number;
	readonly SLOPE_FUZZ_NEG: number;
	readonly SLOPE_FUZZ_K: number;
	readonly SLOPE_FUZZ_R: number;
	readonly SLOPE_FUZZ_P: number;
	readonly COEFF_A_SAME_RADICAL: number;
	readonly COEFF_A_SHAPE_LOST: number;
	readonly COEFF_A_SHAPE_LOST_B: number;
	readonly COEFF_A_SHAPE_LOST_XX: number;
	readonly COEFF_A_SHAPE_LOST_XR: number;
	readonly COEFF_A_TOP_BOT_MERGED: number;
	readonly COEFF_A_TOP_BOT_MERGED_SR: number;
	readonly COEFF_A_FEATURE_LOSS: number;
	readonly COEFF_A_FEATURE_LOSS_XR: number;
	readonly COEFF_A_RADICAL_MERGE: number;
	readonly COEFF_A_REPEAT_PATTERN: number;
	readonly COEFF_S: number;
	readonly COEFF_DISTORT: number;
	readonly COEFF_PROXIMITY_SQUASH_HAPPENED: number;
	readonly COEFF_TOP_BOT_PROXIMITY: number;
	readonly COEFF_STRICT_TOP_BOT_PROXIMITY: number;
	readonly STROKE_SEGMENTS_MIN_OVERLAP: number;
	readonly COLLISION_MIN_OVERLAP_RATIO: number;
	readonly SIDE_TOUCH_LIMIT: number;
	readonly TOP_BOT_MIN_UNBALANCE_AS_SHAPE_LOSS: number;
	readonly SYMMETRY_TEST_PPEM: number;
	readonly BOTH_OVERLAP_H: number;
	readonly BOTH_OVERLAP_V: number;

	readonly DoOutlineDicing: boolean;
	readonly OutlineDicingStepLength?: undefined | null | number;
};

const DefaultAnalyzerStrategy = {
	// Em-box
	EmBox: DefaultEmBoxProps,

	// Stem identification
	CANONICAL_STEM_WIDTH: 67 / 1000,
	MAX_STEM_WDTH_X: 1.5,
	ABSORPTION_LIMIT: 120 / 1000,
	STEM_SIDE_MIN_RISE: 36 / 1000,
	STEM_SIDE_MIN_DESCENT: 53 / 1000,
	STEM_CENTER_MIN_RISE: 36 / 1000,
	STEM_CENTER_MIN_DESCENT: 50 / 1000,
	STEM_SIDE_MIN_DIST_RISE: 75 / 1000,
	STEM_SIDE_MIN_DIST_DESCENT: 75 / 1000,

	// Internal coefficients. Do not touch.
	X_FUZZ: 7 / 1000,
	Y_FUZZ: 8 / 1000,
	Y_FUZZ_DIAG: 15 / 1000,
	SLOPE_FUZZ: 0.2,
	SLOPE_FUZZ_POS: 0.2,
	SLOPE_FUZZ_POST: 0.275,
	SLOPE_FUZZ_NEG: 0.075,
	SLOPE_FUZZ_K: 0.035,
	SLOPE_FUZZ_R: 0.01,
	SLOPE_FUZZ_P: 0.005,
	COEFF_A_SAME_RADICAL: 4000,
	COEFF_A_SHAPE_LOST: 25,
	COEFF_A_SHAPE_LOST_B: 100,
	COEFF_A_SHAPE_LOST_XX: PREVENT_ANNEX,
	COEFF_A_SHAPE_LOST_XR: PREVENT_ANNEX,
	COEFF_A_TOP_BOT_MERGED: 3,
	COEFF_A_TOP_BOT_MERGED_SR: 15,
	COEFF_A_FEATURE_LOSS: 1000,
	COEFF_A_FEATURE_LOSS_XR: 30,
	COEFF_A_RADICAL_MERGE: 2,
	COEFF_A_REPEAT_PATTERN: 65536,
	COEFF_S: 100,
	COEFF_DISTORT: 5,
	COEFF_PROXIMITY_SQUASH_HAPPENED: 3,
	COEFF_TOP_BOT_PROXIMITY: 5,
	COEFF_STRICT_TOP_BOT_PROXIMITY: 30,
	STROKE_SEGMENTS_MIN_OVERLAP: 0.0875,
	COLLISION_MIN_OVERLAP_RATIO: 0.15,
	SIDE_TOUCH_LIMIT: 0.075,
	TOP_BOT_MIN_UNBALANCE_AS_SHAPE_LOSS: 0.25,
	SYMMETRY_TEST_PPEM: 32,
	BOTH_OVERLAP_H: 0.8,
	BOTH_OVERLAP_V: 0.85,

	// Outline dicing control
	DoOutlineDicing: false
};

export async function createHintingStrategy<GID>(
	font: IFontSource<GID>,
	partialStrategy: null | undefined | Partial<HintingStrategy>
): Promise<HintingStrategy> {
	return {
		...DefaultIdeographHintingParams,
		...DefaultAnalyzerStrategy,
		...partialStrategy,
		UPM: font.metadata.upm
	};
}
