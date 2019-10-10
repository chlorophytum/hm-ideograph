import { StretchProps } from "@chlorophytum/hint-embox";

const DEADLY = 1e12;

const DefaultStretch: StretchProps = {
	PIXEL_RATIO_TO_MOVE: 1.7,
	PIXEL_SHIFT_TO_MOVE: 0.7,
	STRETCH_BOTTOM_A: -0.5,
	STRETCH_BOTTOM_X: 2.5,
	STRETCH_TOP_A: -0.5,
	STRETCH_TOP_X: 2.5,
	CUTIN: 0
};

const DefaultUnicodeRanges: [number, number][] = [
	[0x2e80, 0x2fff], // Radicals
	[0x31c0, 0x31e3], // Strokes
	[0x3400, 0x4dbf], // ExtA
	[0x4e00, 0x9fff], // URO
	[0xf900, 0xfa6f], // Compatibility
	[0x20000, 0x2ffff], // SIP
	[0xac00, 0xd7af] // Hangul
];
const DefaultScriptTags = [`hani`, `hang`];
const DefaultFeatureTags = [
	`locl`,
	`smpl`,
	`trad`,
	`tnam`,
	`jp78`,
	`jp83`,
	`jp90`,
	`jp04`,
	`hojo`,
	`nlck`,
	`expt`
];
for (let cv = 0; cv <= 99; cv++) {
	let cvTag: string = "" + cv;
	while (cvTag.length < 2) cvTag = "0" + cvTag;
	DefaultFeatureTags.push(`cv` + cvTag);
	DefaultFeatureTags.push(`ss` + cvTag);
}

const DefaultStrategy = {
	// Coverage
	groupName: "Ideographs",
	acceptAllGlyphs: false,
	trackScripts: DefaultScriptTags,
	trackFeatures: DefaultFeatureTags,
	unicodeRanges: DefaultUnicodeRanges,

	// Parameters
	CANONICAL_STEM_WIDTH: 67 / 1000,
	CANONICAL_STEM_WIDTH_LIMIT_X: 1.5,
	ABSORPTION_LIMIT: 120 / 1000,
	STEM_SIDE_MIN_RISE: 36 / 1000,
	STEM_SIDE_MIN_DESCENT: 53 / 1000,
	STEM_CENTER_MIN_RISE: 36 / 1000,
	STEM_CENTER_MIN_DESCENT: 50 / 1000,
	STEM_SIDE_MIN_DIST_RISE: 75 / 1000,
	STEM_SIDE_MIN_DIST_DESCENT: 75 / 1000,
	X_FUZZ: 7 / 1000,
	Y_FUZZ: 8 / 1000,
	Y_FUZZ_DIAG: 15 / 1000,
	EMBOX_BOTTOM: -120 / 1000,
	EMBOX_TOP: 880 / 1000,
	EMBOX_BOTTOM_STROKE: (380 - 425) / 1000,
	EMBOX_TOP_STROKE: (380 + 425) / 1000,
	EMBOX_BOTTOM_ARCH: (380 - 455) / 1000,
	EMBOX_TOP_ARCH: (380 + 455) / 1000,
	EMBOX_BOTTOM_SPUR: (380 - 475) / 1000,
	EMBOX_TOP_SPUR: (380 + 475) / 1000,
	SLOPE_FUZZ: 0.144,
	SLOPE_FUZZ_POS: 0.156,
	SLOPE_FUZZ_POST: 0.25,
	SLOPE_FUZZ_NEG: 0.075,
	SLOPE_FUZZ_K: 0.035,
	SLOPE_FUZZ_R: 0.01,
	SLOPE_FUZZ_P: 0.005,
	COEFF_A_MULTIPLIER: 1,
	COEFF_A_SAME_RADICAL: 4000,
	COEFF_A_SHAPE_LOST: 25,
	COEFF_A_SHAPE_LOST_XX: DEADLY,
	COEFF_A_SHAPE_LOST_XR: DEADLY,
	COEFF_A_TOPBOT_MERGED: 3,
	COEFF_A_TOPBOT_MERGED_SR: 15,
	COEFF_A_FEATURE_LOSS: 1000,
	COEFF_A_FEATURE_LOSS_XR: 30,
	COEFF_A_RADICAL_MERGE: 2,
	COEFF_OVERSEP: 10000,
	COEFF_C_MULTIPLIER: 100,
	COEFF_C_SHAPE_LOST_XX: 250,
	COEFF_C_FEATURE_LOSS: 12,
	COEFF_C_SAME_RADICAL: 6,
	COEFF_S: 100,
	COEFF_DISTORT: 5,
	COEFF_PBS_MIN_PROMIX: 3,
	COEFF_TOP_BOT_PROMIX: 5,
	COEFF_STRICT_TOP_BOT_PROMIX: 30,
	STROKE_SEGMENTS_MIN_OVERLAP: 0.0875,
	COLLISION_MIN_OVERLAP_RATIO: 0.15,
	SIDETOUCH_LIMIT: 0.05,
	TBST_LIMIT: 0.25,
	DO_SHORT_ABSORPTION: true,
	SYMMETRY_TEST_PPEM: 32,
	DEADLY_MERGE: 1e10,
	EmBoxStretch: DefaultStretch
};

export type HintingStrategy = Readonly<typeof DefaultStrategy> & { readonly UPM: number };

export function createHintingStrategy(upm: number, partialStrategy?: Partial<HintingStrategy>) {
	if (!partialStrategy) return { ...DefaultStrategy, UPM: upm };
	return { ...DefaultStrategy, ...partialStrategy, UPM: upm };
}
