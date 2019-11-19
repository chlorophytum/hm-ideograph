import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CGlyph, Contour, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";
import * as _ from "lodash";

import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import Stem from "../../types/stem";
import { BlueZone, GlyphAnalysis, Interpolation, ShortAbsorption } from "../analysis";

function byPointY(p: Geometry.Point, q: Geometry.Point) {
	return p.y - q.y;
}
let STEPS = 32;

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
	if (pt.touched || pt.dontTouch || !pt.on || !strategy.DO_SHORT_ABSORPTION) return;
	let minDist = 0xffff,
		minKey = null;
	for (let m = 0; m < keys.length; m++) {
		let key = keys[m];
		const dist = Math.hypot(pt.y - key.y, pt.x - key.x);
		if (
			key.yStrongExtrema &&
			dist <= strategy.ABSORPTION_LIMIT * strategy.UPM &&
			key.id !== pt.id
		) {
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
function ipWeight(key: AdjPoint, pt: AdjPoint) {
	const xw = key.phantom ? (pt.x < key.phantom.xMin || pt.x > key.phantom.xMax ? 1000 : 0.1) : 10;
	return Math.hypot(xw * (key.x - pt.x), key.y - pt.y);
}

function interpolateByKeys(
	targets: IpSaTarget,
	pts: AdjPoint[],
	keys: AdjPoint[],
	priority: number,
	fuzz: number
) {
	for (let k = 0; k < pts.length; k++) {
		let pt = pts[k];
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
				if (!lowerK || ipWeight(keys[m], pt) < lowerDist) {
					lowerK = keys[m];
					lowerDist = ipWeight(keys[m], pt);
				}
			}
		}
		for (let m = keys.length - 1; m >= 0; m--) {
			if (compareZ(keys[m], pt, fuzz, cGT)) {
				if (!upperK || ipWeight(keys[m], pt) < upperDist) {
					upperK = keys[m];
					upperDist = ipWeight(keys[m], pt);
				}
			}
		}
		if (!lowerK || !upperK) continue;

		const upperK0 = upperK,
			lowerK0 = lowerK;

		while (upperK.linkedKey) upperK = upperK.linkedKey;
		while (lowerK.linkedKey) lowerK = lowerK.linkedKey;
		if (!upperK.phantom && !lowerK.phantom) {
			if (upperK.y > lowerK.y + fuzz) {
				pt.ipKeys = { upperK0, lowerK0, upperK, lowerK, ipPri: priority };
				targets.interpolations.push(new Interpolation(upperK, lowerK, pt, priority));
			} else if (upperK.id !== pt.id) {
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
	let radicalParts = [radical.outline].concat(radical.holes);
	let radicalPoints = _.flatten(radicalParts.map(c => c.points.slice(0, -1)));
	for (let k = 0; k < radicalPoints.length; k++) {
		const z = radicalPoints[k];
		if (z.keyPoint || z.touched || z.dontTouch) continue;
		if (!z.xExtrema && !z.yExtrema) continue;
		let candidate = null;
		for (const stem of radicalStems) {
			let reject = false;
			let sc = null;
			const highPoints = _.flatten(stem.high);
			const lowPoints = _.flatten(stem.low);
			const keyPoints = highPoints.concat(lowPoints);
			for (let j = 0; j < keyPoints.length; j++) {
				let zKey = keyPoints[j];
				if (zKey.id === z.id || !(zKey.id >= 0) || zKey.dontTouch) continue;
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
				let yDifference = z.y - (zKey.y + (z.x - zKey.x) * (zKey.slope || 0));
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
	analysis: GlyphAnalysis,
	priority: number
) {
	for (let j = 0; j < analysis.radicals.length; j++) {
		let radical = analysis.radicals[j];
		let radicalStems = analysis.stems.filter(function(s) {
			return s.belongRadical === j;
		});
		linkRadicalSoleStemPoints(shortAbsorptions, strategy, radical, radicalStems, priority);
	}
}

function convertDiagStemIp(target: IpSaTarget, s: Stem) {
	if (s.ipHigh) {
		for (let g of s.ipHigh) {
			const [z1, z2, z] = g;
			if (z.touched || z.dontTouch) continue;
			target.interpolations.push(new Interpolation(z1, z2, z, 20));
			z.touched = true;
			z.keyPoint = true;
		}
	}
	if (s.ipLow) {
		for (let g of s.ipLow) {
			const [z1, z2, z] = g;
			if (z.touched || z.dontTouch) continue;
			target.interpolations.push(new Interpolation(z1, z2, z, 20));
			z.touched = true;
			z.keyPoint = true;
		}
	}
}

function createBlueZonePhantoms(
	glyphKeyPoints: AdjPoint[],
	blues: BlueZone,
	strategy: HintingStrategy
) {
	for (let zone of [blues.topZs, blues.bottomZs]) {
		if (!zone.length) continue;
		for (let z of zone) {
			for (let step = -STEPS; step <= 2 * STEPS; step++) {
				const p = new CPoint((strategy.UPM * step) / STEPS, z.y);
				p.phantom = {
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
	p.linkedKey = l.linkedKey || r.linkedKey;
	p.phantom = {
		xMin: l.x + ((step - 1 / 2) / STEPS) * (r.x - l.x),
		xMax: l.x + ((step + 1 / 2) / STEPS) * (r.x - l.x)
	};
	return p;
}

function createStemPhantoms(glyphKeyPoints: AdjPoint[], stem: Stem, strategy: HintingStrategy) {
	for (let j = 0; j < stem.high.length; j++) {
		let l = stem.high[j][0];
		let r = stem.high[j][stem.high[j].length - 1];
		for (let step = 1; step < STEPS; step++) {
			glyphKeyPoints.push(createLRPhantom(l, r, step));
		}
	}
	for (let j = 0; j < stem.low.length; j++) {
		let l = stem.low[j][0];
		let r = stem.low[j][stem.low[j].length - 1];
		for (let step = 1; step < STEPS; step++) {
			glyphKeyPoints.push(createLRPhantom(l, r, step));
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
		z.id !== pMin.id &&
		z.id !== pMax.id &&
		!z.touched &&
		!z.dontTouch &&
		(z.yExtrema || (z.xStrongExtrema && z.turn))
	);
}

function analyzeIpSaRecords(contours: Contour[], shortAbsorptions: ShortAbsorption[]) {
	let records: IpSaRecord[] = [];

	for (let j = 0; j < contours.length; j++) {
		let contourPoints = contours[j].points.slice(0, -1);
		if (!contourPoints.length) continue;
		let contourAlignPoints = contourPoints.filter(p => p.touched).sort(byPointY);
		let contourExtrema = contourPoints.filter(p => p.xExtrema || p.yExtrema).sort(byPointY);

		let pMin: AdjPoint = contourPoints[0],
			pMax: AdjPoint = contourPoints[0];
		for (let z of contourPoints) {
			if (!pMin || z.y < pMin.y) pMin = z;
			if (!pMax || z.y > pMax.y) pMax = z;
		}

		if (contourExtrema.length > 1) {
			let extrema = contourExtrema.filter(z => isIpSaPointExtrema(z, pMin, pMax));
			let middlePoints = [];
			for (let m = 0; m < extrema.length; m++) {
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
				} else if (extrema[m].id !== pMin.id) {
					middlePoints.push(extrema[m]);
				}
			}
			let blues = contourPoints.filter(p => p.blued);
			let middlePointsL = contourExtrema.filter(p => p.xExtrema || p.yExtrema);
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
	analysis: GlyphAnalysis,
	strategy: HintingStrategy
) {
	let interpolations: (Interpolation | null)[] = [];
	let shortAbsorptions: ShortAbsorption[] = [];

	const targets: IpSaTarget = { interpolations, shortAbsorptions };

	const contours = glyph.contours;
	let glyphKeyPoints: AdjPoint[] = [];
	for (let j = 0; j < contours.length; j++) {
		for (let k = 0; k < contours[j].points.length; k++) {
			let z = contours[j].points[k];
			if ((z.touched && z.keyPoint) || z.linkedKey) {
				glyphKeyPoints.push(z);
			}
		}
	}

	for (let s of analysis.stems) {
		convertDiagStemIp(targets, s);
	}

	// blue zone phantom points
	createBlueZonePhantoms(glyphKeyPoints, analysis.blueZone, strategy);

	// stem phantom points
	for (let s = 0; s < analysis.stems.length; s++) {
		let stem = analysis.stems[s];
		createStemPhantoms(glyphKeyPoints, stem, strategy);
	}
	glyphKeyPoints = glyphKeyPoints.sort(byPointY);
	let records: IpSaRecord[] = analyzeIpSaRecords(contours, shortAbsorptions);
	for (let j = 0; j < contours.length; j++) {
		shortAbsorptionByKeys(
			targets,
			strategy,
			records[j].topBot.filter(pt => pt.xStrongExtrema),
			records[j].cka.filter(k => k.blued),
			{ direct: true },
			11
		);
		shortAbsorptionByKeys(
			targets,
			strategy,
			records[j].middlePointsL.filter(pt => pt.xStrongExtrema),
			records[j].blues.filter(k => k.blued),
			{ direct: true },
			9
		);
	}
	linkSoleStemPoints(shortAbsorptions, strategy, analysis, 7);
	let b: AdjPoint[] = [];
	for (let j = 0; j < contours.length; j++) {
		interpolateByKeys(
			targets,
			records[j].topBot,
			glyphKeyPoints,
			5,
			strategy.Y_FUZZ * strategy.UPM
		);
		interpolateByKeys(targets, records[j].topBot, glyphKeyPoints, 5, 1);
		b = b.concat(records[j].topBot.filter(z => z.touched));
	}
	glyphKeyPoints = glyphKeyPoints.concat(b).sort(byPointY);
	for (let j = 0; j < contours.length; j++) {
		interpolateByKeys(
			targets,
			records[j].middlePoints,
			glyphKeyPoints,
			3,
			strategy.Y_FUZZ * strategy.UPM
		);
		interpolateByKeys(targets, records[j].middlePoints, glyphKeyPoints, 3, 1);
		shortAbsorptionByKeys(
			targets,
			strategy,
			records[j].middlePointsL,
			records[j].middlePoints.filter(z => z.touched || z.keyPoint),
			{ ip: true },
			1
		);
	}
	interpolations = interpolations.sort(function(u, v) {
		return u && v ? u.z.x - v.z.x : 0;
	});
	// cleanup
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
				ipJ.rp1 === ipK.rp1 &&
				ipJ.rp2 === ipK.rp2 &&
				ipJ.z === ipK.z &&
				ipJ.priority !== 9 &&
				Math.abs(ipJ.z.y - ipJ.z.y) <= strategy.Y_FUZZ * strategy.UPM
			) {
				shortAbsorptions.push(new ShortAbsorption(ipJ.z, ipK.z, ipJ.priority - 1));
				interpolations[k] = null;
			}
		}
	}
	const ip: Interpolation[] = [];
	for (const t of interpolations) if (t) ip.push(t);

	return { interpolations: ip, shortAbsorptions };
}
