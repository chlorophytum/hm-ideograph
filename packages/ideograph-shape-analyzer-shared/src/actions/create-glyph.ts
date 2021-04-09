import { Glyph } from "@chlorophytum/arch";

import { IdeographHintingParams } from "../interfaces/params";
import { ContourMaker } from "../types/contour";
import { CGlyph } from "../types/glyph";

export function createGlyph(
	input: Glyph.Geom,
	params: IdeographHintingParams & { readonly UPM: number }
) {
	const contours = [];
	for (let j = 0; j < input.length; j++) {
		const c = ContourMaker.processPoints(input[j], { dicingLength: params.UPM / 32 });
		if (c) contours.push(c);
	}
	const glyph = new CGlyph(contours);
	glyph.stat();
	return glyph;
}
