import { Geometry } from "@chlorophytum/arch";

import { HintingStrategy } from "../../strategy";
import CGlyph from "../../types/glyph";
import { AdjPoint, CPoint } from "../../types/point";
import Stem from "../../types/stem";

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
	bottomBluePoints: AdjPoint[],
	topBluePoints: AdjPoint[],
	yBottom: number,
	yTop: number
) {
	let isDecoTop = false;
	let isDecoBot = false;
	for (let j = 0; j < glyph.contours.length; j++) {
		for (let m = 0; m < glyph.contours[j].points.length - 1; m++) {
			let zm = glyph.contours[j].points[m];
			if (
				(zm.touched || zm.dontTouch) &&
				(CPoint.adjacent(point, zm) || CPoint.adjacentZ(point, zm)) &&
				zm.y <= point.y &&
				nearTop(point, zm, strategy.STEM_SIDE_MIN_RISE * strategy.UPM)
			) {
				isDecoTop = true;
				point.dontTouch = true;
			}
			if (
				(zm.touched || zm.dontTouch) &&
				(CPoint.adjacent(point, zm) || CPoint.adjacentZ(point, zm)) &&
				zm.y >= point.y &&
				nearBot(point, zm, (strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM) / 3)
			) {
				isDecoBot = true;
				point.dontTouch = true;
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

	if (!isDecoTop && point.y >= yTop && point.yExtrema && !point.touched && !point.dontTouch) {
		point.touched = true;
		point.keyPoint = true;
		point.blued = true;
		topBluePoints.push(point);
	}
	if (!isDecoBot && point.y <= yBottom && point.yExtrema && !point.touched && !point.dontTouch) {
		point.touched = true;
		point.keyPoint = true;
		point.blued = true;
		bottomBluePoints.push(point);
	}
}

export default function analyzeBlueZonePoints(
	glyph: CGlyph,
	stems: Stem[],
	strategy: HintingStrategy
) {
	// Blue zone points
	let topBluePoints: AdjPoint[] = [];
	let bottomBluePoints: AdjPoint[] = [];
	let glyphTopMostPoint: AdjPoint[] = [];
	let glyphBottomMostPoint: AdjPoint[] = [];

	// We go two passes to get "better" results
	for (let j = 0; j < glyph.contours.length; j++) {
		for (let k = 0; k < glyph.contours[j].points.length - 1; k++) {
			let point = glyph.contours[j].points[k];
			if (!point.yExtrema) continue;
			considerPoint(
				glyph,
				strategy,
				stems,
				point,
				bottomBluePoints,
				topBluePoints,
				strategy.EmBox.StrokeBottom * strategy.UPM,
				strategy.EmBox.StrokeTop * strategy.UPM
			);
		}
	}
	for (let j = 0; j < glyph.contours.length; j++) {
		for (let k = 0; k < glyph.contours[j].points.length - 1; k++) {
			let point = glyph.contours[j].points[k];
			considerPoint(
				glyph,
				strategy,
				stems,
				point,
				bottomBluePoints,
				topBluePoints,
				strategy.EmBox.StrokeBottom * strategy.UPM,
				strategy.EmBox.StrokeTop * strategy.UPM
			);
		}
	}

	// For some really "narrow" glyphs, we create a blue into some other array
	for (let j = 0; j < glyph.contours.length; j++) {
		for (let k = 0; k < glyph.contours[j].points.length - 1; k++) {
			let point = glyph.contours[j].points[k];
			if (!point.yExtrema) continue;
			considerPoint(
				glyph,
				strategy,
				stems,
				point,
				glyphBottomMostPoint,
				glyphTopMostPoint,
				glyph.stats.yMin - (bottomBluePoints.length ? 0xffff : -1),
				glyph.stats.yMax + (topBluePoints.length ? 0xffff : -1)
			);
		}
	}

	return {
		topBluePoints: topBluePoints.sort((a, b) => b.y - a.y),
		bottomBluePoints: bottomBluePoints.sort((a, b) => b.y - a.y),
		glyphTopMostPoint,
		glyphBottomMostPoint
	};
}
