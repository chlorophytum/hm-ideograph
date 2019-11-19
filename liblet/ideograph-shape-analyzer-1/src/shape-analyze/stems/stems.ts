import { Support } from "@chlorophytum/arch";
import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { overlapInfo, overlapRatio } from "../../si-common/overlap";
import { expandZ, leftmostZ_SS, rightmostZ_SS, slopeOf } from "../../si-common/seg";
import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import { Seg, SegSpan } from "../../types/seg";
import Stem from "../../types/stem";

import { calculateExp, calculateMinMax, calculateYW } from "./calc";
import findHorizontalSegments from "./segments";
import { splitDiagonalStems } from "./split";

function byPointY(a: SegSpan, b: SegSpan) {
	if (a[0].y !== b[0].y) return a[0].y - b[0].y;
	return a[0].x - b[0].x;
}
function byPointX(a: SegSpan, b: SegSpan) {
	if (a[0].x !== b[0].x) return a[0].x - b[0].x;
	return a[0].y - b[0].y;
}

const PROPORTION = 1.25;
const PROBES = 8;

const MATCH_OPPOSITE = 1;
const MATCH_SAME_SIDE = 2;

function testExpandRho(
	rho: number,
	p: AdjPoint,
	q: AdjPoint,
	coP: AdjPoint,
	coQ: AdjPoint,
	slope1: number,
	slope2: number,
	radical: Radical,
	upm: number
) {
	const left = expandZ(
		radical,
		Support.mixZ(p, q, rho),
		-1,
		-Support.mix(slope1, slope2, rho),
		upm
	);
	const right = expandZ(
		radical,
		Support.mixZ(coP, coQ, rho),
		1,
		Support.mix(slope1, slope2, rho),
		upm
	);
	return right.x - left.x < Math.abs(p.y - q.y) * PROPORTION;
}

function stemShapeIsIncorrect(
	radical: Radical,
	strategy: HintingStrategy,
	u: Seg,
	v: Seg,
	mh: number
) {
	const p = leftmostZ_SS(u);
	const q = leftmostZ_SS(v);
	const coP = rightmostZ_SS(u);
	const coQ = rightmostZ_SS(v);
	const upm = strategy.UPM;
	const sProp = Support.clamp(0, (Math.max(coP.x - p.x, coQ.x - q.x) / strategy.UPM) * 2, 1);

	const slope1 = slopeOf(u),
		slope2 = slopeOf(v),
		slope = (slope1 + slope2) / 2;
	if (
		slope >= 0
			? slope1 > strategy.SLOPE_FUZZ * sProp && slope2 > strategy.SLOPE_FUZZ * sProp
			: slope1 < -strategy.SLOPE_FUZZ_NEG * sProp && slope2 < -strategy.SLOPE_FUZZ_NEG * sProp
	) {
		return true;
	}
	if (Math.abs(p.y - q.y) > mh) {
		return true;
	}

	if (
		coP.x - p.x >= Math.abs(p.y - q.y) * PROPORTION &&
		coQ.x - q.x >= Math.abs(p.y - q.y) * PROPORTION
	) {
		return false;
	}
	// do some expansion
	if (testExpandRho(0, p, q, coP, coQ, slope1, slope2, radical, upm)) return true;
	if (testExpandRho(1, p, q, coP, coQ, slope1, slope2, radical, upm)) return true;
	for (let rho = 1; rho < PROBES; rho++) {
		if (testExpandRho(rho / PROBES, p, q, coP, coQ, slope1, slope2, radical, upm)) return true;
	}
	return false;
}

function uuMatchable(sj: SegSpan, sk: SegSpan, radical: Radical, strategy: HintingStrategy) {
	let slope = (slopeOf([sj]) + slopeOf([sk])) / 2;
	let ref = leftmostZ_SS([sj]);
	let focus = leftmostZ_SS([sk]);
	let desired = ref.y + (focus.x - ref.x) * slope;
	let delta = Math.abs(focus.x - ref.x) * strategy.SLOPE_FUZZ_P + strategy.Y_FUZZ * strategy.UPM;
	return Math.abs(focus.y - desired) <= delta && segmentJoinable(sj, sk, radical);
}
function segmentJoinable(pivot: SegSpan, segment: SegSpan, radical: Radical) {
	for (let k = 0; k < pivot.length; k++) {
		for (let j = 0; j < segment.length; j++) {
			if (!radical.includesSegmentEdge(segment[j], pivot[k], 2, 2, 1, 1)) continue;
			return true;
		}
	}
	return false;
}

function udMatchable(sj: SegSpan, sk: SegSpan, radical: Radical, strategy: HintingStrategy) {
	if (!radical.includesTetragon(sj, sk, strategy.X_FUZZ * strategy.UPM)) return false;
	const slopeJ = slopeOf([sj]);
	const slopeK = slopeOf([sk]);
	if (!!slopeJ !== !!slopeK && Math.abs(slopeJ - slopeK) >= strategy.SLOPE_FUZZ / 2) return false;
	return true;
}

function segOverlapIsValid(
	highEdge: Seg,
	lowEdge: Seg,
	strategy: HintingStrategy,
	radical: Radical
) {
	const segOverlap = overlapInfo(highEdge, lowEdge, radical, radical);
	const segOverlap0 = overlapInfo(highEdge, lowEdge);

	const ovlExt = Math.min(segOverlap.len / segOverlap.la, segOverlap.len / segOverlap.lb);
	const ovlOri = Math.min(segOverlap0.len / segOverlap0.la, segOverlap0.len / segOverlap0.lb);

	return ovlExt * ovlOri >= strategy.STROKE_SEGMENTS_MIN_OVERLAP;
}

function identifyStem(
	radical: Radical,
	_used: number[],
	segments: SegSpan[],
	graph: number[][],
	ove: number[][],
	up: boolean[],
	j: number,
	strategy: HintingStrategy
) {
	let candidate = { high: [] as number[], low: [] as number[] };
	const maxStemWidth = strategy.UPM * strategy.CANONICAL_STEM_WIDTH * strategy.MAX_STEM_WDTH_X;
	if (up[j]) {
		candidate.high.push(j);
	} else {
		candidate.low.push(j);
	}
	let used = [..._used];
	used[j] = 1;
	let rounds = 0;
	while (rounds < 3) {
		rounds += 1;
		let expandingU = false;
		let expandingD = true;
		let pass = 0;
		while (expandingU || expandingD) {
			pass += 1;
			if (pass % 2) {
				expandingD = false;
			} else {
				expandingU = false;
			}
			let maxOve = -1;
			let sk = null;
			for (let k = 0; k < segments.length; k++) {
				if ((used[k] && used[k] <= pass) || (up[k] !== up[j]) !== !!(pass % 2)) {
					continue;
				}
				let sameSide, otherSide;
				if (up[k]) {
					sameSide = candidate.high;
					otherSide = candidate.low;
				} else {
					sameSide = candidate.low;
					otherSide = candidate.high;
				}
				let matchD = true;
				let matchU = !sameSide.length;
				for (let s = 0; s < sameSide.length; s++) {
					let hj = sameSide[s];
					if (graph[k][hj] === MATCH_SAME_SIDE || graph[hj][k] === MATCH_SAME_SIDE) {
						matchU = true;
					}
				}
				for (let s = 0; s < otherSide.length; s++) {
					let hj = otherSide[s];
					if (graph[k][hj] !== MATCH_OPPOSITE && graph[hj][k] !== MATCH_OPPOSITE) {
						matchD = false;
					}
				}
				if (matchU && matchD) {
					let oveK = 0;
					for (let j of otherSide) oveK = Math.max(oveK, ove[j][k]);

					if (oveK > maxOve) {
						sk = { sid: k, ove: oveK, sameSide, otherSide };
						maxOve = oveK;
					}
				}
			}
			if (sk) {
				sk.sameSide.push(sk.sid);
				if (pass % 2) {
					expandingD = true;
				} else {
					expandingU = true;
				}
				used[sk.sid] = pass;
			}
		}
		if (candidate.high.length && candidate.low.length) {
			let highEdge = [];
			let lowEdge = [];
			for (let m = 0; m < candidate.high.length; m++) {
				highEdge[m] = segments[candidate.high[m]];
			}
			for (let m = 0; m < candidate.low.length; m++) {
				lowEdge[m] = segments[candidate.low[m]];
			}
			highEdge = highEdge.sort(byPointX);
			lowEdge = lowEdge.sort(byPointX).reverse();

			if (!segOverlapIsValid(highEdge, lowEdge, strategy, radical)) continue;
			if (stemShapeIsIncorrect(radical, strategy, highEdge, lowEdge, maxStemWidth)) continue;

			for (let s of candidate.high) _used[s] = 1;
			for (let s of candidate.low) _used[s] = 1;
			return { high: highEdge, low: lowEdge };
		}
	}
	return null;
}

function pairSegmentsForRadical(radicals: Radical[], r: number, strategy: HintingStrategy) {
	const radical = radicals[r];
	let graph: number[][] = [],
		ove: number[][] = [],
		up: boolean[] = [];
	let segments = radical.segments.sort(byPointY);
	for (let j = 0; j < segments.length; j++) {
		graph[j] = [];
		ove[j] = [];
		for (let k = 0; k < segments.length; k++) {
			graph[j][k] = 0;
			ove[j][k] = 0;
		}
	}
	for (let j = 0; j < segments.length; j++) {
		let sj = segments[j];
		let upperEdgeJ = radical.outline.ccw !== sj[0].x < sj[sj.length - 1].x;
		up[j] = upperEdgeJ;
		for (let k = 0; k < j; k++) {
			let sk = segments[k];
			let upperEdgeK = radical.outline.ccw !== sk[0].x < sk[sk.length - 1].x;
			if (upperEdgeJ === upperEdgeK) {
				// Both upper
				graph[j][k] = graph[k][j] = uuMatchable(sj, sk, radical, strategy)
					? MATCH_SAME_SIDE
					: 0;
			} else {
				graph[j][k] = graph[k][j] = udMatchable(sj, sk, radical, strategy)
					? MATCH_OPPOSITE
					: 0;
			}
			ove[j][k] = ove[k][j] = overlapRatio([sj], [sk], Math.min);
		}
	}
	let candidates = [];
	let used: number[] = [];
	for (let j = 0; j < segments.length; j++) {
		if (used[j]) continue;
		const stroke = identifyStem(radical, used, segments, graph, ove, up, j, strategy);
		if (stroke) candidates.push(stroke);
	}
	return candidates.map(s => {
		const stem = new Stem(s.high, s.low, r);
		calculateMinMax(stem, radicals, strategy);
		return stem;
	});
}

function pairSegments(radicals: Radical[], strategy: HintingStrategy) {
	let stems: Stem[] = [];
	for (let r = 0; r < radicals.length; r++) {
		let radicalStems = pairSegmentsForRadical(radicals, r, strategy);
		stems = stems.concat(radicalStems);
		radicals[r].stems = radicalStems;
	}
	return stems;
}

function byY(a: Stem, b: Stem) {
	if (a.y < b.y) return -1;
	if (a.y > b.y) return 1;
	if (a.width > b.width) return -1;
	if (a.width < b.width) return 1;
	return 0;
}

export default function findStems(radicals: Radical[], strategy: HintingStrategy) {
	findHorizontalSegments(radicals, strategy);
	let ss = pairSegments(radicals, strategy).sort(byY);
	ss = splitDiagonalStems(ss, strategy);
	for (let s of ss) {
		calculateYW(s);
		calculateMinMax(s, radicals, strategy);
		calculateExp(s, radicals[s.belongRadical]);
	}
	return ss.sort(byY);
}
