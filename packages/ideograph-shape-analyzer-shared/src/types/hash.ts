import * as crypto from "crypto";

import { CGlyph } from "./glyph";
function simpleHash(text: string) {
	const hash = crypto.createHash("sha1");
	hash.update(text);
	return hash.digest("hex");
}
export function combineHash(...texts: string[]) {
	const hash = crypto.createHash("sha1");
	for (const text of texts) hash.update(simpleHash(text));
	return hash.digest("hex");
}
export function hashGlyphContours(glyph: CGlyph) {
	const input = glyph.contours;
	let buf = "";
	for (let j = 0; j < input.length; j++) {
		buf += "a";
		let c = input[j];
		for (let k = 0; k < c.points.length; k++) {
			buf += "z" + c.points[k].type + " ";
			buf += c.points[k].x + " " + c.points[k].y;
		}
	}
	return combineHash(buf);
}
