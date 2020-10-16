import { Glyph } from "@chlorophytum/arch";
import { ContourMaker } from "../types/contour";
import { CGlyph } from "../types/glyph";

export function createGlyph(input: Glyph.Geom) {
	let contours = [];
	for (let j = 0; j < input.length; j++) {
		const c = ContourMaker.processPoints(input[j]);
		if (c) contours.push(c);
	}
	const glyph = new CGlyph(contours);
	glyph.stat();
	return glyph;
}
