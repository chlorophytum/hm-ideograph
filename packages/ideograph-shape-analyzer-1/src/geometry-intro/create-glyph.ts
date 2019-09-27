import { Glyph, IFontSource } from "@chlorophytum/arch";
import { ContourMaker, CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../strategy";

export async function fetchGeometry<GID>(
	font: IFontSource<GID>,
	params: HintingStrategy,
	gid: GID
) {
	const inst = params.instanceForAnalysis
		? (await font.convertUserInstanceToNormalized({ user: params.instanceForAnalysis })) || null
		: null;
	return await font.getGeometry(gid, inst);
}

export function createGlyph(input: Glyph.Geom, params: HintingStrategy) {
	const contours = [];
	const dicingParams = {
		dicingLength:
			params.DoOutlineDicing || params.instanceForAnalysis
				? params.UPM * (params.OutlineDicingStepLength ?? 0.5 * params.CANONICAL_STEM_WIDTH)
				: undefined
	};
	for (let j = 0; j < input.length; j++) {
		const c = ContourMaker.processPoints(input[j], dicingParams);
		if (c) contours.push(c);
	}
	const glyph = new CGlyph(contours);
	glyph.stat();
	return glyph;
}
