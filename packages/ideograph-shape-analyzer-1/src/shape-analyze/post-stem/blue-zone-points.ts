import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CGlyph, Contour, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

export default function analyzeBlueZonePoints(
	glyph: CGlyph,
	stems: Stem[],
	strategy: HintingStrategy
) {
	// Blue zone points
	let topBluePoints = new Set<AdjPoint>();
	let bottomBluePoints = new Set<AdjPoint>();
	let glyphTopMostPoint = new Set<AdjPoint>();
	let glyphBottomMostPoint = new Set<AdjPoint>();

	// Set of points considered a decoration of an existing key point
	let decoSet = new Set<AdjPoint>();

	// We go two passes to get "better" results
	for (const point of OrderedContourPoints(glyph)) {
		if (!point.yExtrema) continue;
		considerPoint(
			glyph,
			strategy,
			stems,
			point,
			strategy.EmBox.StrokeBottom * strategy.UPM,
			strategy.EmBox.StrokeTop * strategy.UPM,
			bottomBluePoints,
			topBluePoints,
			decoSet
		);
	}

	markTouchProps(bottomBluePoints, decoSet);
	markTouchProps(topBluePoints, decoSet);

	for (const point of OrderedContourPoints(glyph)) {
		considerPoint(
			glyph,
			strategy,
			stems,
			point,
			strategy.EmBox.StrokeBottom * strategy.UPM,
			strategy.EmBox.StrokeTop * strategy.UPM,
			bottomBluePoints,
			topBluePoints,
			decoSet
		);
	}

	markTouchProps(bottomBluePoints, decoSet);
	markTouchProps(topBluePoints, decoSet);

	// For some really "narrow" glyphs, we create a blue into some other array
	for (const point of OrderedContourPoints(glyph)) {
		if (!point.yExtrema) continue;
		considerPoint(
			glyph,
			strategy,
			stems,
			point,
			glyph.stats.yMin - (bottomBluePoints.size ? 0xffff : -1),
			glyph.stats.yMax + (topBluePoints.size ? 0xffff : -1),
			glyphBottomMostPoint,
			glyphTopMostPoint,
			decoSet
		);
	}

	markTouchProps(glyphBottomMostPoint, decoSet);
	markTouchProps(glyphTopMostPoint, decoSet);
	markDecoProps(decoSet);

	return {
		topBluePoints: Array.from(topBluePoints).sort((a, b) => b.y - a.y),
		bottomBluePoints: Array.from(bottomBluePoints).sort((a, b) => b.y - a.y),
		glyphTopMostPoint: Array.from(glyphTopMostPoint),
		glyphBottomMostPoint: Array.from(glyphBottomMostPoint)
	};
}

function markTouchProps(blue: Iterable<AdjPoint>, deco: Set<AdjPoint>) {
	for (const z of blue) if (!deco.has(z)) z.touched = z.keyPoint = z.blued = true;
}
function markDecoProps(deco: Iterable<AdjPoint>) {
	for (const z of deco) {
		z.touched = z.keyPoint = z.blued = false;
		z.dontTouch = true;
	}
}

function nearTop(z1: Geometry.Point, z2: Geometry.Point, d: number) {
	return Math.hypot(z1.x - z2.x, z1.y - z2.y) < d;
}
function nearBot(z1: Geometry.Point, z2: Geometry.Point, d: number) {
	return Math.abs(z1.y - z2.y) <= d;
}

function considerPoint(
	glyph: CGlyph,
	strategy: HintingStrategy,
	stems: Stem[],
	point: AdjPoint,
	yBottom: number,
	yTop: number,
	bottomBluePoints: Set<AdjPoint>,
	topBluePoints: Set<AdjPoint>,
	decoSet: Set<AdjPoint>
) {
	const possibleTop = point.y >= yTop && point.yExtrema && !point.touched && !point.dontTouch;
	const possibleBottom =
		point.y <= yBottom && point.yExtrema && !point.touched && !point.dontTouch;
	for (let j = 0; j < glyph.contours.length; j++) {
		for (let m = 0; m < glyph.contours[j].points.length - 1; m++) {
			let zm = glyph.contours[j].points[m];
			if (!(CPoint.adjacent(point, zm) || CPoint.adjacentZ(point, zm))) continue;
			if (!(zm.touched || zm.dontTouch)) continue;

			if (zm.y <= point.y && nearTop(point, zm, strategy.STEM_SIDE_MIN_RISE * strategy.UPM)) {
				decoSet.add(point);
				return;
			}
			if (
				zm.y >= point.y &&
				nearBot(point, zm, (strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM) / 3)
			) {
				decoSet.add(point);
				return;
			}
		}
	}
	for (const stem of stems) {
		if (
			point.y < stem.y + strategy.Y_FUZZ &&
			point.y > stem.y - stem.width - strategy.Y_FUZZ &&
			point.x > stem.xMin - strategy.X_FUZZ &&
			point.x < stem.xMax + strategy.X_FUZZ
		) {
			return;
		}
	}

	if (possibleBottom) {
		bottomBluePoints.add(point);
	} else if (possibleTop) {
		topBluePoints.add(point);
	}
}

function* OrderedContourPoints(g: CGlyph) {
	for (const c of g.contours) {
		const zs = c.points.slice(0, -1).sort((a, b) => a.y - b.y);
		yield* zs;
	}
}
