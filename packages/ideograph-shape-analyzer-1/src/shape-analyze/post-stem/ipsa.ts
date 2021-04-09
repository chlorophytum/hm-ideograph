/* eslint-disable complexity */
import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CGlyph, Contour, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";
import * as _ from "lodash";

import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import Stem from "../../types/stem";
import { BlueZone, Interpolation, ShapeAnalysisResult, ShortAbsorption } from "../analysis";

function byPointY(p: Geometry.Point, q: Geometry.Point) {
	return p.y - q.y;
}
const STEPS = 64;

type IpSaTarget = {
	interpolations: (Interpolation | null)[];
	shortAbsorptions: (ShortAbsorption | null)[];
};
type IpSaAcceptance = {
	ip?: boolean;
	direct?: boolean;
};

function shortAbsorptionPointByKeys(
	targets: IpSaTarget,
	strategy: HintingStrategy,
	pt: AdjPoint,
	keys: AdjPoint[],
	accept: IpSaAcceptance,
	priority: number
) {
	if (pt.touched || pt.dontTouch || !pt.isCorner()) return;
	let minDist = 0xffff,
		minKey = null;
	for (let m = 0; m < keys.length; m++) {
		const key = keys[m];
		const dist = Math.hypot(pt.y - key.y, pt.x - key.x);
		if (key.yStrongExtrema && dist <= strategy.ABSORPTION_LIMIT * strategy.UPM && key !== pt) {
			if (dist < minDist) {
				minDist = dist;
				minKey = key;
			}
		}
	}
	if (minKey) {
		while (minKey.linkedKey) minKey = minKey.linkedKey;
		if (accept.ip) {
			if (
				minKey.ipKeys &&
				pt.y >= minKey.ipKeys.lowerK0.y &&
				pt.y <= minKey.ipKeys.upperK0.y
			) {
				targets.interpolations.push(
					new Interpolation(
						minKey.ipKeys.upperK,
						minKey.ipKeys.lowerK,
						pt,
						minKey.ipKeys.ipPri
					)
				);
				pt.touched = true;
				return;
			}
		}
		if (accept.direct) {
			targets.shortAbsorptions.push(
				new ShortAbsorption(minKey, pt, priority + (pt.yExtrema ? 1 : 0))
			);
			pt.touched = true;
			return;
		}
	}
}
function shortAbsorptionByKeys(
	targets: IpSaTarget,
	strategy: HintingStrategy,
	pts: AdjPoint[],
	keys: AdjPoint[],
	accept: IpSaAcceptance,
	priority: number
) {
	for (let k = 0; k < pts.length; k++) {
		shortAbsorptionPointByKeys(targets, strategy, pts[k], keys, accept, priority);
	}
}

type PtCompareFn = (key: AdjPoint, pt: AdjPoint, aux: number) => boolean;
function compareZ(key: AdjPoint, pt: AdjPoint, aux: number, f: PtCompareFn) {
	if (!f(key, pt, aux)) return false;
	while (key.linkedKey) key = key.linkedKey;
	return f(key, pt, aux);
}
function cLT(key: AdjPoint, pt: AdjPoint, aux: number) {
	return key.y + aux < pt.y;
}
function cGT(key: AdjPoint, pt: AdjPoint, aux: number) {
	return key.y - aux > pt.y;
}
function cEq(key: AdjPoint, pt: AdjPoint, aux: number) {
	return Math.abs(pt.y - key.y) < aux;
}

type IpKnotKind = { inRangWeight: number };
const IpKnotTB: IpKnotKind = { inRangWeight: 1 / 4 };
const IpKnotInner: IpKnotKind = { inRangWeight: 1 / 4 };

function ipWeight(kind: IpKnotKind, key: AdjPoint, pt: AdjPoint) {
	const inRange = key.isPhantom && pt.x >= key.isPhantom.xMin && pt.x <= key.isPhantom.xMax;
	return Math.hypot(key.x - pt.x, (inRange ? kind.inRangWeight : 1) * (key.y - pt.y));
}

function interpolateByKeys(
	kind: IpKnotKind,
	targets: IpSaTarget,
	pts: AdjPoint[],
	keys: AdjPoint[],
	priority: number,
	fuzz: number
) {
	for (let k = 0; k < pts.length; k++) {
		const pt = pts[k];
		if (pt.touched || pt.dontTouch) continue;

		let upperK = null,
			upperDist = 0xffff;
		let lowerK = null,
			lowerDist = 0xffff;
		for (let m = keys.length - 1; m >= 0; m--) {
			// adjacency exclusion
			if (!compareZ(keys[m], pt, fuzz, cEq)) continue;
			if (!CPoint.adjacent(keys[m], pt) && !CPoint.adjacentZ(keys[m], pt)) continue;
			pt.dontTouch = true;
		}

		if (pt.touched || pt.dontTouch) continue;
		for (let m = keys.length - 1; m >= 0; m--) {
			if (compareZ(keys[m], pt, fuzz, cLT)) {
				if (!lowerK || ipWeight(kind, keys[m], pt) < lowerDist) {
					lowerK = keys[m];
					lowerDist = ipWeight(kind, keys[m], pt);
				}
			}
		}
		for (let m = keys.length - 1; m >= 0; m--) {
			if (compareZ(keys[m], pt, fuzz, cGT)) {
				if (!upperK || ipWeight(kind, keys[m], pt) < upperDist) {
					upperK = keys[m];
					upperDist = ipWeight(kind, keys[m], pt);
				}
			}
		}
		if (!lowerK || !upperK) continue;

		const upperK0 = upperK,
			lowerK0 = lowerK;

		while (upperK.linkedKey) upperK = upperK.linkedKey;
		while (lowerK.linkedKey) lowerK = lowerK.linkedKey;
		if (!upperK.isPhantom && !lowerK.isPhantom) {
			if (upperK.y > lowerK.y + fuzz) {
				pt.ipKeys = { upperK0, lowerK0, upperK, lowerK, ipPri: priority };
				targets.interpolations.push(new Interpolation(upperK, lowerK, pt, priority));
			} else if (upperK !== pt) {
				targets.shortAbsorptions.push(new ShortAbsorption(upperK, pt, priority));
			}
		}
		pt.touched = true;
	}
}

function linkRadicalSoleStemPoints(
	shortAbsorptions: ShortAbsorption[],
	strategy: HintingStrategy,
	radical: Radical,
	radicalStems: Stem[],
	priority: number
) {
	const radicalParts = Array.from(radical.contours());
	const radicalPoints = _.flatten(radicalParts.map(c => c.points));
	for (let k = 0; k < radicalPoints.length; k++) {
		const z = radicalPoints[k];
		if (z.isKeyPoint || z.touched || z.dontTouch || !z.queryReference()) continue;
		if (!z.xExtrema && !z.yExtrema) continue;
		let candidate = null;
		for (const stem of radicalStems) {
			let reject = false;
			let sc = null;
			const highPoints = _.flatten(stem.high);
			const lowPoints = _.flatten(stem.low);
			const keyPoints = highPoints.concat(lowPoints);
			for (let j = 0; j < keyPoints.length; j++) {
				const zKey = keyPoints[j];
				if (zKey === z || !zKey.queryReference() || zKey.dontTouch) continue;
				if (CPoint.adjacent(zKey, z) || CPoint.adjacentZ(zKey, z)) {
					reject = true;
					continue;
				}
				if (
					Math.abs(z.y - zKey.y) <= strategy.Y_FUZZ * strategy.UPM &&
					Math.abs(z.x - zKey.x) <= strategy.Y_FUZZ * strategy.UPM
				) {
					continue;
				}
				if (stem.atLeft && z.x > zKey.x) continue;
				if (stem.atRight && z.x < zKey.x) continue;

				// detect whether this sole point is attached to the stem edge.
				// in most cases, absorbing a lower point should be stricter due to the topology of ideographs
				// so we use asymmetric condition for "above" and "below" cases.
				const yDifference =
					z.y - (zKey.y + (z.x - zKey.x) * (zKey.associatedStemSlope || 0));
				if (
					!(yDifference > 0
						? yDifference < strategy.Y_FUZZ * strategy.UPM * 2
						: -yDifference < strategy.Y_FUZZ * strategy.UPM)
				) {
					continue;
				}
				if (
					sc &&
					Math.hypot(z.y - sc.y, z.x - sc.x) <= Math.hypot(z.y - zKey.y, z.x - zKey.x)
				) {
					continue;
				}
				if (!radical.includesSegmentEdge(z, zKey, 1, strategy.SLOPE_FUZZ_K, 1, 1)) continue;
				sc = zKey;
			}
			if (
				!reject &&
				sc &&
				sc.queryReference() &&
				(!candidate ||
					Math.hypot(z.y - candidate.y, z.x - candidate.x) >=
						Math.hypot(z.y - sc.y, z.x - sc.x))
			) {
				candidate = sc;
			}
		}
		// And it should have at least one segment in the glyph's outline.'
		if (candidate) {
			let key = candidate;
			while (key.linkedKey) key = key.linkedKey;
			shortAbsorptions.push(new ShortAbsorption(key, z, priority + (z.yExtrema ? 1 : 0)));
			z.touched = true;
		}
	}
}

function linkSoleStemPoints(
	shortAbsorptions: ShortAbsorption[],
	strategy: HintingStrategy,
	analysis: ShapeAnalysisResult,
	priority: number
) {
	for (let j = 0; j < analysis.radicals.length; j++) {
		const radical = analysis.radicals[j];
		const radicalStems = analysis.stems.filter(function (s) {
			return s.belongRadical === j;
		});
		linkRadicalSoleStemPoints(shortAbsorptions, strategy, radical, radicalStems, priority);
	}
}

function convertDiagStemIp(target: IpSaTarget, s: Stem) {
	if (s.ipHigh) {
		for (const g of s.ipHigh) {
			const [z1, z2, z] = g;
			if (z.touched || z.dontTouch || !z.queryReference()) continue;
			target.interpolations.push(new Interpolation(z1, z2, z, 20));
			z.touched = true;
			z.isKeyPoint = true;
		}
	}
	if (s.ipLow) {
		for (const g of s.ipLow) {
			const [z1, z2, z] = g;
			if (z.touched || z.dontTouch || !z.queryReference()) continue;
			target.interpolations.push(new Interpolation(z1, z2, z, 20));
			z.touched = true;
			z.isKeyPoint = true;
		}
	}
}

function createBlueZonePhantoms(
	glyphKeyPoints: AdjPoint[],
	blues: BlueZone,
	strategy: HintingStrategy
) {
	for (const zone of [blues.topZs, blues.bottomZs]) {
		if (!zone.length) continue;
		for (const z of zone) {
			for (let step = -STEPS; step <= 2 * STEPS; step++) {
				const p = new CPoint((strategy.UPM * step) / STEPS, z.y);
				p.isPhantom = {
					xMin: (strategy.UPM * (step - 1 / 2)) / STEPS,
					xMax: (strategy.UPM * (step - 1 / 2)) / STEPS
				};
				p.linkedKey = z;
				glyphKeyPoints.push(p);
			}
		}
	}
}

function createLRPhantom(l: AdjPoint, r: AdjPoint, step: number) {
	const p = new CPoint(l.x + (step / STEPS) * (r.x - l.x), l.y + (step / STEPS) * (r.y - l.y));
	p.linkedKey = step * 2 <= STEPS ? l : r;
	p.isPhantom = {
		xMin: l.x + ((step - 1 / 2) / STEPS) * (r.x - l.x),
		xMax: l.x + ((step + 1 / 2) / STEPS) * (r.x - l.x)
	};
	return p;
}
function createLRYPhantom(z: AdjPoint, xMin: number, xMax: number, step: number) {
	const p = new CPoint(xMin + (step / STEPS) * xMax - xMin, z.y);
	p.linkedKey = z;
	p.isPhantom = {
		xMin: xMin + ((step - 1 / 2) / STEPS) * (xMax - xMin),
		xMax: xMin + ((step + 1 / 2) / STEPS) * (xMax - xMin)
	};
	return p;
}

function createStemPhantoms(glyphKeyPoints: AdjPoint[], stem: Stem, strategy: HintingStrategy) {
	for (let j = 0; j < stem.high.length; j++) {
		const l = stem.high[j][0];
		const r = stem.high[j][stem.high[j].length - 1];
		for (let step = 0; step <= STEPS; step++) {
			if (l.x <= r.x) glyphKeyPoints.push(createLRPhantom(l, r, step));
			else glyphKeyPoints.push(createLRPhantom(r, l, step));
		}
	}
	for (let j = 0; j < stem.low.length; j++) {
		const l = stem.low[j][0];
		const r = stem.low[j][stem.low[j].length - 1];
		for (let step = 0; step <= STEPS; step++) {
			if (l.x <= r.x) glyphKeyPoints.push(createLRPhantom(l, r, step));
			else glyphKeyPoints.push(createLRPhantom(r, l, step));
		}
	}
}

type IpSaRecord = {
	topBot: [AdjPoint, AdjPoint];
	middlePoints: AdjPoint[];
	middlePointsL: AdjPoint[];
	blues: AdjPoint[];
	cka: AdjPoint[];
};

function isIpSaPointExtrema(z: AdjPoint, pMin: AdjPoint, pMax: AdjPoint) {
	return (
		z !== pMin &&
		z !== pMax &&
		!z.touched &&
		!z.dontTouch &&
		(z.yExtrema || (z.xStrongExtrema && z.isTurnAround))
	);
}

function analyzeIpSaRecords(contours: Contour[], shortAbsorptions: ShortAbsorption[]) {
	const records: IpSaRecord[] = [];

	for (let j = 0; j < contours.length; j++) {
		const contourPoints = contours[j].points;
		if (!contourPoints.length) continue;
		const contourAlignPoints = contourPoints.filter(p => p.touched).sort(byPointY);
		const contourExtrema = contourPoints.filter(p => p.xExtrema || p.yExtrema).sort(byPointY);

		let pMin: AdjPoint = contourPoints[0],
			pMax: AdjPoint = contourPoints[0];
		for (const z of contourPoints) {
			if (!z.queryReference()) continue;
			if (!pMin.queryReference() || z.y < pMin.y) pMin = z;
			if (!pMax.queryReference() || z.y > pMax.y) pMax = z;
		}

		if (contourExtrema.length > 1) {
			const extrema = contourExtrema.filter(z => isIpSaPointExtrema(z, pMin, pMax));
			const middlePoints = [];
			for (let m = 0; m < extrema.length; m++) {
				if (!extrema[m].queryReference()) continue;
				if (extrema[m].y === pMin.y) {
					if (!CPoint.adjacent(pMin, extrema[m])) {
						shortAbsorptions.push(new ShortAbsorption(pMin, extrema[m], 1));
					}
					extrema[m].touched = true;
					extrema[m].dontTouch = true;
				} else if (extrema[m].y === pMax.y) {
					if (!CPoint.adjacent(pMax, extrema[m])) {
						shortAbsorptions.push(new ShortAbsorption(pMax, extrema[m], 1));
					}
					extrema[m].touched = true;
					extrema[m].dontTouch = true;
				} else if (extrema[m] !== pMin) {
					middlePoints.push(extrema[m]);
				}
			}
			const blues = contourPoints.filter(p => p.blued);
			const middlePointsL = contourExtrema.filter(
				p => p.queryReference() && (p.xExtrema || p.yExtrema)
			);
			records.push({
				topBot: [pMin, pMax],
				middlePoints: middlePoints,
				middlePointsL: middlePointsL,
				blues: blues,
				cka: contourAlignPoints
			});
		} else {
			records.push({
				topBot: [pMin, pMax],
				middlePoints: [],
				middlePointsL: [],
				blues: [],
				cka: contourAlignPoints
			});
		}
	}

	return records;
}

export default function AnalyzeIpSa(
	glyph: CGlyph,
	analysis: ShapeAnalysisResult,
	strategy: HintingStrategy
) {
	let interpolations: (Interpolation | null)[] = [];
	const shortAbsorptions: ShortAbsorption[] = [];

	const targets: IpSaTarget = { interpolations, shortAbsorptions };

	const contours = glyph.contours;
	let glyphKeyPoints: AdjPoint[] = [];
	for (let j = 0; j < contours.length; j++) {
		for (let k = 0; k < contours[j].points.length; k++) {
			const z = contours[j].points[k];
			if ((z.touched && z.isKeyPoint) || z.linkedKey) {
				glyphKeyPoints.push(z);
			}
		}
	}

	for (const s of analysis.stems) convertDiagStemIp(targets, s);

	// blue zone phantom points
	createBlueZonePhantoms(glyphKeyPoints, analysis.blueZone, strategy);

	// stem phantom points
	for (let s = 0; s < analysis.stems.length; s++) {
		const stem = analysis.stems[s];
		createStemPhantoms(glyphKeyPoints, stem, strategy);
	}
	glyphKeyPoints = glyphKeyPoints.sort(byPointY);
	const records: IpSaRecord[] = analyzeIpSaRecords(contours, shortAbsorptions);
	for (let j = 0; j < contours.length; j++) {
		shortAbsorptionByKeys(
			targets,
			strategy,
			records[j].topBot.filter(pt => pt.xStrongExtrema),
			records[j].cka.filter(k => k.blued),
			{ direct: true },
			13
		);
		shortAbsorptionByKeys(
			targets,
			strategy,
			records[j].middlePointsL.filter(pt => pt.xStrongExtrema),
			records[j].blues.filter(k => k.blued),
			{ direct: true },
			11
		);
	}
	linkSoleStemPoints(shortAbsorptions, strategy, analysis, 9);

	// Do per-radical analysis
	const IP_STRICT = strategy.Y_FUZZ * strategy.UPM;
	const IP_LOOSE = 0.5;
	for (const radical of analysis.radicals) {
		const radicalContours = Array.from(radical.contours());
		const radicalContourIndexes = radicalContours.map(c => contours.indexOf(c));
		let xMin = 0xffff,
			xMax = -0xffff;
		const radicalPoints = new Set<AdjPoint>();
		for (const c of radicalContours) {
			for (const z of c.points) {
				radicalPoints.add(z);
				if (z.x < xMin) xMin = z.x;
				if (z.x > xMax) xMax = z.x;
			}
		}

		let b: AdjPoint[] = [];

		// Outline top-bottom
		{
			const j = radicalContourIndexes[0];
			if (j < 0) continue;
			interpolateByKeys(IpKnotTB, targets, records[j].topBot, glyphKeyPoints, 7, IP_STRICT);
			interpolateByKeys(IpKnotTB, targets, records[j].topBot, glyphKeyPoints, 7, IP_LOOSE);
			b = b.concat(records[j].topBot.filter(z => z.touched));
		}

		// Amend phantoms
		{
			const radicalKeyPoints = [...glyphKeyPoints, ...b].filter(z => {
				while (z.linkedKey) z = z.linkedKey;
				return radicalPoints.has(z);
			});
			let yMin = 0xffff,
				yMax = -0xffff,
				zyMin: AdjPoint | null = null,
				zyMax: AdjPoint | null = null;
			for (const z of radicalKeyPoints) {
				if (z.y < yMin) {
					yMin = z.y;
					zyMin = z;
				}
				if (z.y > yMax) {
					yMax = z.y;
					zyMax = z;
				}
			}
			for (let step = 1; step < STEPS; step++) {
				if (zyMin) b.push(createLRYPhantom(zyMin, xMin, xMax, step));
				if (zyMax) b.push(createLRYPhantom(zyMax, xMin, xMax, step));
			}
		}

		// Holes top-bottom
		{
			const radicalKeyPoints = [...glyphKeyPoints, ...b].filter(z => {
				while (z.linkedKey) z = z.linkedKey;
				return radicalPoints.has(z);
			});
			for (let jr = 1; jr < radicalContours.length; jr++) {
				const j = radicalContourIndexes[jr];
				if (j < 0) continue;
				interpolateByKeys(
					IpKnotInner,
					targets,
					records[j].topBot,
					radicalKeyPoints,
					5,
					IP_STRICT
				);
				interpolateByKeys(
					IpKnotInner,
					targets,
					records[j].topBot,
					radicalKeyPoints,
					5,
					IP_LOOSE
				);
				b = b.concat(records[j].topBot.filter(z => z.touched));
			}
		}

		// Inners
		{
			const radicalKeyPoints = [...glyphKeyPoints, ...b].filter(z => {
				while (z.linkedKey) z = z.linkedKey;
				return radicalPoints.has(z);
			});
			for (let jr = 0; jr < radicalContours.length; jr++) {
				const j = radicalContourIndexes[jr];
				if (j < 0) continue;
				interpolateByKeys(
					IpKnotInner,
					targets,
					records[j].middlePoints,
					radicalKeyPoints,
					3,
					IP_STRICT
				);
				interpolateByKeys(
					IpKnotInner,
					targets,
					records[j].middlePoints,
					radicalKeyPoints,
					3,
					IP_LOOSE
				);
				shortAbsorptionByKeys(
					targets,
					strategy,
					records[j].middlePointsL,
					records[j].middlePoints.filter(z => z.touched || z.isKeyPoint),
					{ ip: true },
					1
				);
			}
		}
	}

	// Cleanup
	interpolations = interpolations.sort((u, v) => (u && v ? u.subject.x - v.subject.x : 0));
	return cleanupInterpolations(glyph, strategy, interpolations, shortAbsorptions);
}

function cleanupInterpolations(
	glyph: CGlyph,
	strategy: HintingStrategy,
	interpolations: (Interpolation | null)[],
	shortAbsorptions: ShortAbsorption[]
) {
	for (let j = 0; j < interpolations.length; j++) {
		const ipJ = interpolations[j];
		if (!ipJ) continue;
		for (let k = j + 1; k < interpolations.length; k++) {
			const ipK = interpolations[k];
			if (
				ipK &&
				ipJ.ref1 === ipK.ref1 &&
				ipJ.ref2 === ipK.ref2 &&
				ipJ.subject === ipK.subject &&
				ipJ.priority !== 9 &&
				Math.abs(ipJ.subject.y - ipJ.subject.y) <= strategy.Y_FUZZ * strategy.UPM
			) {
				shortAbsorptions.push(
					new ShortAbsorption(ipJ.subject, ipK.subject, ipJ.priority - 1)
				);
				interpolations[k] = null;
			}
		}
	}
	const ip: Interpolation[] = [];
	for (const t of interpolations) if (t) ip.push(t);

	return { interpolations: ip, shortAbsorptions };
}
