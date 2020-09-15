import { Geometry, Glyph } from "@chlorophytum/arch";

import { Contour } from "../types/contour";
import { CGlyph } from "../types/glyph";
import { CPoint } from "../types/point";

function rotatePoints<A extends Geometry.Point>(c: A[]) {
	let zm = c[0],
		jm = 0;
	for (let j = 1; j < c.length; j++) {
		if (c[j].x + c[j].y < zm.x + zm.y) {
			zm = c[j];
			jm = j;
		}
	}
	return [...c.slice(jm), ...c.slice(0, jm)];
}

export function createGlyph(input: Glyph.Geom) {
	let contours = [],
		indexedPoints = [];
	let ptIndex = 0;
	for (let j = 0; j < input.length; j++) {
		const c = input[j];
		const currentContour = new Contour();
		for (let k = 0; k < c.length; k++) {
			const pt = new CPoint(c[k].x, c[k].y, c[k].on, c[k].references);
			currentContour.points.push(pt);
			indexedPoints[ptIndex] = pt;
			ptIndex++;
		}
		if (currentContour.points.length < 1) continue;
		currentContour.points = rotatePoints(currentContour.points);
		currentContour.points.push(currentContour.points[0]);
		contours.push(currentContour);
	}
	const glyph = new CGlyph(contours);
	glyph.stat();
	glyph.nPoints = ptIndex - 1;
	return glyph;
}
