/* eslint-disable complexity */
import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import Stem, { StemSharedBoolKeys, StemSharedNumberKeys } from "../../types/stem";

import { calculateMinMax } from "./calc";

function pointBelowStem(point: Geometry.Point, stem: Stem, fuzz: number) {
	return point.y < stem.y - stem.width - fuzz;
}

function PtAbove(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.y > stem.y && point.x < xMax - yFuzz && point.x > xMin + yFuzz) {
		stem.hasGlyphPointAbove = true;
		stem.glyphCenterRise = Math.max(stem.glyphCenterRise || 0, point.y - stem.y);
		if (sameRadical) {
			stem.hasRadicalPointAbove = true;
			stem.radicalCenterRise = Math.max(stem.radicalCenterRise || 0, point.y - stem.y);
		}
	}
}
function PtRightAdjAbove(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.y > stem.y && point.x >= xMax - yFuzz && point.x <= xMax + yFuzz) {
		stem.hasGlyphRightAdjacentPointAbove = true;
		stem.glyphRightAdjacentRise = Math.max(stem.glyphRightAdjacentRise || 0, point.y - stem.y);
		if (sameRadical) {
			stem.hasRadicalRightAdjacentPointAbove = true;
			stem.radicalRightAdjacentRise = Math.max(
				stem.radicalRightAdjacentRise || 0,
				point.y - stem.y
			);
		}
	}
}
function PtLeftAdjAbove(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.y > stem.y && point.x <= xMin + yFuzz && point.x >= xMin - yFuzz) {
		stem.hasGlyphLeftAdjacentPointAbove = true;
		stem.glyphLeftAdjacentRise = Math.max(stem.glyphLeftAdjacentRise || 0, point.y - stem.y);
		if (sameRadical) {
			stem.hasRadicalLeftAdjacentPointAbove = true;
			stem.radicalLeftAdjacentRise = Math.max(
				stem.radicalLeftAdjacentRise || 0,
				point.y - stem.y
			);
		}
	}
}
function PtRightDistAbove(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.y > stem.y && point.x >= xMax + yFuzz) {
		stem.hasGlyphRightDistancedPointAbove = true;
		stem.glyphRightDistancedRise = Math.max(
			stem.glyphRightDistancedRise || 0,
			point.y - stem.y
		);
		if (sameRadical) {
			stem.hasRadicalRightDistancedPointAbove = true;
			stem.radicalRightDistancedRise = Math.max(
				stem.radicalRightDistancedRise || 0,
				point.y - stem.y
			);
		}
	}
}
function PtLeftDistAbove(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.y > stem.y && point.x <= xMin - yFuzz) {
		stem.hasGlyphLeftDistancedPointAbove = true;
		stem.glyphLeftDistancedRise = Math.max(stem.glyphLeftDistancedRise || 0, point.y - stem.y);
		if (sameRadical) {
			stem.hasRadicalLeftDistancedPointAbove = true;
			stem.radicalLeftDistancedRise = Math.max(
				stem.radicalLeftDistancedRise || 0,
				point.y - stem.y
			);
		}
	}
}
function FoldAbove(
	point: AdjPoint,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (point.prev && point.prev.prev && point.prev.prev.prev) {
		const z1 = point,
			z2 = point.prev,
			z3 = point.prev.prev,
			z4 = point.prev.prev.prev;
		if (
			z2.x === z3.x &&
			z1.x < z2.x === z4.x < z3.x &&
			((z2.y > stem.y + yFuzz && z3.y >= stem.y && z2.x < xMax && z2.x > xMin) ||
				(z3.y > stem.y + yFuzz && z2.y >= stem.y && z3.x < xMax && z3.x > xMin))
		) {
			if (
				(!z2.atLeft && z2.x > xMin + (xMax - xMin) * 0.2) ||
				(z2.atLeft && z2.x < xMax - (xMax - xMin) * 0.2)
			) {
				stem.hasGlyphFoldAbove = true;
				if (sameRadical) {
					stem.hasRadicalFoldAbove = true;
				}
			} else if (z2.x < xMax - (xMax - xMin) * 0.2 && z2.x > xMin + (xMax - xMin) * 0.2) {
				stem.hasGlyphSideFoldAbove = true;
				if (sameRadical) {
					stem.hasRadicalSideFoldAbove = true;
				}
			}
		}
	}
}

function PtBelow(
	point: AdjPoint,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (pointBelowStem(point, stem, yFuzz) && point.x < xMax - yFuzz && point.x > xMin + yFuzz) {
		stem.hasGlyphPointBelow = true;
		stem.glyphCenterDescent = Math.max(
			stem.glyphCenterDescent || 0,
			stem.y - stem.width - point.y
		);
		if (sameRadical) {
			stem.hasRadicalPointBelow = true;
			stem.radicalCenterDescent = Math.max(
				stem.radicalCenterDescent || 0,
				stem.y - stem.width - point.y
			);
		}
		if (point.yStrongExtrema) {
			stem.hasGlyphVFoldBelow = true;
			if (sameRadical) {
				stem.hasRadicalVFoldBelow = true;
			}
		}
	}
}
function PtRightAdjBelow(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (pointBelowStem(point, stem, yFuzz) && point.x >= xMax - yFuzz && point.x <= xMax + yFuzz) {
		stem.hasGlyphRightAdjacentPointBelow = true;
		stem.glyphRightAdjacentDescent = Math.max(
			stem.glyphRightAdjacentDescent || 0,
			stem.y - stem.width - point.y
		);
		if (sameRadical) {
			stem.hasRadicalRightAdjacentPointBelow = true;
			stem.radicalRightAdjacentDescent = Math.max(
				stem.radicalRightAdjacentDescent || 0,
				stem.y - stem.width - point.y
			);
		}
	}
}
function PtLeftAdjBelow(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (pointBelowStem(point, stem, yFuzz) && point.x <= xMin + yFuzz && point.x >= xMin - yFuzz) {
		stem.hasGlyphLeftAdjacentPointBelow = true;
		stem.glyphLeftAdjacentDescent = Math.max(
			stem.glyphLeftAdjacentDescent || 0,
			stem.y - stem.width - point.y
		);
		if (sameRadical) {
			stem.hasRadicalLeftAdjacentPointBelow = true;
			stem.radicalLeftAdjacentDescent = Math.max(
				stem.radicalLeftAdjacentDescent || 0,
				stem.y - stem.width - point.y
			);
		}
	}
}
function PtRightDistBelow(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (pointBelowStem(point, stem, yFuzz) && point.x >= xMax + yFuzz) {
		stem.hasGlyphRightDistancedPointBelow = true;
		stem.glyphRightDistancedDescent = Math.max(
			stem.glyphRightDistancedDescent || 0,
			stem.y - stem.width - point.y
		);
		if (sameRadical) {
			stem.hasRadicalRightDistancedPointBelow = true;
			stem.radicalRightDistancedDescent = Math.max(
				stem.radicalRightDistancedDescent || 0,
				stem.y - stem.width - point.y
			);
		}
	}
}
function PtLeftDistBelow(
	point: Geometry.Point,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (pointBelowStem(point, stem, yFuzz) && point.x <= xMin - yFuzz) {
		stem.hasGlyphLeftDistancedPointBelow = true;
		stem.glyphLeftDistancedDescent = Math.max(
			stem.glyphLeftDistancedDescent || 0,
			stem.y - stem.width - point.y
		);
		if (sameRadical) {
			stem.hasRadicalLeftDistancedPointBelow = true;
			stem.radicalLeftDistancedDescent = Math.max(
				stem.radicalLeftDistancedDescent || 0,
				stem.y - stem.width - point.y
			);
		}
	}
}
function FoldBelow(
	point: AdjPoint,
	stem: Stem,
	xMin: number,
	xMax: number,
	yFuzz: number,
	sameRadical: boolean
) {
	if (
		pointBelowStem(point, stem, yFuzz) &&
		point.xStrongExtrema &&
		!(point.yExtrema && !point.yStrongExtrema) &&
		point.x < xMax + Math.min((xMax - xMin) / 3, stem.width) &&
		point.x > xMin - Math.min((xMax - xMin) / 3, stem.width)
	) {
		if (
			(!point.atLeft && point.x > xMin + (xMax - xMin) * 0.2) ||
			(point.atLeft && point.x < xMax - (xMax - xMin) * 0.2)
		) {
			stem.hasGlyphFoldBelow = true;
			if (sameRadical) {
				stem.hasRadicalFoldBelow = true;
			}
		} else if (point.x < xMax - (xMax - xMin) * 0.2 && point.x > xMin + (xMax - xMin) * 0.2) {
			stem.hasGlyphSideFoldBelow = true;
			if (sameRadical) {
				stem.hasRadicalSideFoldBelow = true;
			}
		}
	}
}

function analyzeRadicalPointsToStemRelationships(
	radical: Radical,
	stem: Stem,
	sameRadical: boolean,
	strategy: HintingStrategy
) {
	stem.proximityUp = 0;
	stem.proximityDown = 0;
	const yFuzz = strategy.Y_FUZZ * strategy.UPM || 15;
	const a0 = stem.low[0][0].x,
		az = stem.low[stem.low.length - 1][stem.low[stem.low.length - 1].length - 1].x;
	const b0 = stem.high[0][0].x,
		bz = stem.high[stem.high.length - 1][stem.high[stem.high.length - 1].length - 1].x;
	const xMin = Math.min(a0, b0, az, bz),
		xMax = Math.max(a0, b0, az, bz);
	const radicalParts = [radical.outline].concat(radical.holes);
	for (let j = 0; j < radicalParts.length; j++) {
		for (let k = 0; k < radicalParts[j].points.length; k++) {
			const point = radicalParts[j].points[k];
			if (!point.queryReference()) continue;
			PtAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtRightAdjAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtLeftAdjAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtRightDistAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtLeftDistAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			FoldAbove(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtRightAdjBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtLeftAdjBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtRightDistBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
			PtLeftDistBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
			FoldBelow(point, stem, xMin, xMax, yFuzz, sameRadical);
		}
	}
}

function analyzePointToStemSpatialRelationships(
	stem: Stem,
	radicals: Radical[],
	strategy: HintingStrategy
) {
	for (let rad = 0; rad < radicals.length; rad++) {
		const radical = radicals[rad];
		const sameRadical = radical === radicals[stem.belongRadical];
		analyzeRadicalPointsToStemRelationships(radical, stem, sameRadical, strategy);
	}
	calculateMinMax(stem, radicals, strategy);
}

export function analyzeStemSpatialRelationships(
	stems: Stem[],
	radicals: Radical[],
	overlaps: number[][],
	strategy: HintingStrategy
) {
	for (let k = 0; k < stems.length; k++) {
		analyzePointToStemSpatialRelationships(stems[k], radicals, strategy);
		for (let j = 0; j < stems.length; j++) {
			if (
				overlaps[j][k] > strategy.COLLISION_MIN_OVERLAP_RATIO &&
				stems[j].y > stems[k].y &&
				!(stems[j].rid && stems[j].rid === stems[k].rid)
			) {
				stems[k].hasGlyphStemAbove = true;
				stems[j].hasGlyphStemBelow = true;
				if (stems[j].belongRadical === stems[k].belongRadical) {
					stems[j].hasSameRadicalStemBelow = true;
					stems[k].hasSameRadicalStemAbove = true;
				}
			}
		}
	}
	// share stat data between two halves of diagonal stems
	for (let j = 0; j < stems.length; j++) {
		for (let k = 0; k < j; k++) {
			const sR = stems[j],
				sL = stems[k];
			if (!(sR.rid && sR.rid === sL.rid && sR.atRight && sL.atLeft)) continue;
			for (const p of StemSharedBoolKeys) sR[p] = sL[p] = !!sR[p] || !!sL[p];
			for (const p of StemSharedNumberKeys) sR[p] = sL[p] = Math.max(sR[p] || 0, sL[p] || 0);
			sR.xMinP = sL.xMinP = Math.min(sR.xMin, sL.xMin);
			sR.xMaxP = sL.xMaxP = Math.max(sR.xMax, sL.xMax);
			sR.xMinExP = sL.xMinExP = Math.min(sR.xMinEx, sL.xMinEx);
			sR.xMaxExP = sL.xMaxExP = Math.max(sR.xMaxEx, sL.xMaxEx);
		}
	}
}

function analyzePBS(u: Stem, v: Stem, radical: Radical, strategy: HintingStrategy) {
	const yFuzz = strategy.Y_FUZZ * strategy.UPM || 15;
	const radicalParts = [radical.outline].concat(radical.holes);
	let ans = 0;
	for (let j = 0; j < radicalParts.length; j++) {
		for (let k = 0; k < radicalParts[j].points.length; k++) {
			const point = radicalParts[j].points[k];
			if (
				(!u.hasGlyphPointAbove ||
					!v.hasGlyphPointBelow ||
					point.xExtrema ||
					point.yExtrema) &&
				point.y > v.y + yFuzz &&
				point.y < u.y - u.width - yFuzz &&
				point.x > v.xMin + yFuzz &&
				point.x < v.xMax - yFuzz &&
				point.x > u.xMin + yFuzz &&
				point.x < u.xMax - yFuzz
			) {
				if (ans < 1) ans = 1;
				if (point.xStrongExtrema && ans < 2) {
					ans = 2;
				}
			}
		}
	}
	return ans;
}

export function analyzePointBetweenStems(
	stems: Stem[],
	radicals: Radical[],
	strategy: HintingStrategy
) {
	const res: number[][] = [];
	for (let sj = 0; sj < stems.length; sj++) {
		res[sj] = [];
		for (let sk = 0; sk < sj; sk++) {
			res[sj][sk] = 0;
			for (let rad = 0; rad < radicals.length; rad++) {
				res[sj][sk] += analyzePBS(stems[sj], stems[sk], radicals[rad], strategy);
			}
		}
	}
	return res;
}

export function analyzeEntireContourAboveBelow(glyph: CGlyph, stems: Stem[]) {
	for (let j = 0; j < stems.length; j++) {
		const sj = stems[j];
		for (let c = 0; c < glyph.contours.length; c++) {
			const cr = glyph.contours[c];
			if (cr.stats.xMin >= sj.xMin && cr.stats.xMax <= sj.xMax && cr.stats.yMin >= sj.y) {
				sj.hasEntireContourAbove = true;
			}
			if (
				cr.stats.xMin >= sj.xMin &&
				cr.stats.xMax <= sj.xMax &&
				cr.stats.yMax <= sj.y - sj.width
			) {
				sj.hasEntireContourBelow = true;
			}
		}
	}
}

export function stemsAreSimilar(strategy: HintingStrategy, last: Stem, current: Stem) {
	return (
		((current.belongRadical === last.belongRadical &&
			current.hasSameRadicalStemBelow &&
			last.hasSameRadicalStemAbove) ||
			(!current.hasSameRadicalStemBelow &&
				!current.hasSameRadicalStemAbove &&
				!last.hasSameRadicalStemBelow &&
				!last.hasSameRadicalStemAbove)) &&
		Math.abs(last.xMinEx - current.xMinEx) < strategy.UPM * strategy.X_FUZZ &&
		Math.abs(last.xMaxEx - current.xMaxEx) < strategy.UPM * strategy.X_FUZZ &&
		Math.abs(last.width - current.width) < strategy.UPM * strategy.Y_FUZZ
	);
}
