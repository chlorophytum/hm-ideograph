/* eslint-disable complexity */
import { Geometry } from "@chlorophytum/arch";

import Radical from "../types/radical";
import { Seg, SegSpan } from "../types/seg";
import Stem from "../types/stem";

import { expandZ, leftmostZ_S, rightmostZ_S, slopeOf } from "./seg";

export interface OverlapEvent {
	at: number;
	on: boolean;
	a: boolean;
}

function byAt(p: OverlapEvent, q: OverlapEvent) {
	return p.at - q.at;
}

function pushEvents(
	events: OverlapEvent[],
	seg: SegSpan,
	s: number,
	isA: boolean,
	radical?: Radical
) {
	let z0: Geometry.Point = leftmostZ_S(seg),
		zm: Geometry.Point = rightmostZ_S(seg);
	// once radical is present we would expand the segments
	// so that the overlapping factor would be more accurate
	if (radical) {
		z0 = expandZ(radical, z0, -1, -s, 1000);
		zm = expandZ(radical, zm, 1, s, 1000);
	}
	if (z0.x < zm.x) {
		events.push({ at: z0.x, on: true, a: isA });
		events.push({ at: zm.x, on: false, a: isA });
	}
}

export function overlapInfo(a: Seg, b: Seg, ra?: Radical, rb?: Radical) {
	const slopeA = slopeOf(a),
		slopeB = slopeOf(b);
	const events: OverlapEvent[] = [];
	for (let j = 0; j < a.length; j++) {
		pushEvents(events, a[j], slopeA, true, ra);
	}
	for (let j = 0; j < b.length; j++) {
		pushEvents(events, b[j], slopeB, false, rb);
	}
	events.sort(byAt);
	let len = 0,
		la = 0,
		lb = 0;
	let st = 0,
		sa = 0,
		sb = 0;
	let ac = 0;
	let bc = 0;
	for (let j = 0; j < events.length; j++) {
		const e = events[j];
		const intersectBefore = ac * bc;
		const ab = ac,
			bb = bc;
		if (e.a) {
			if (e.on) ac += 1;
			else ac -= 1;
		} else {
			if (e.on) bc += 1;
			else bc -= 1;
		}
		if (ac * bc && !intersectBefore) st = e.at;
		if (!(ac * bc) && intersectBefore) len += e.at - st;
		if (ac && !ab) sa = e.at;
		if (!ac && ab) la += e.at - sa;
		if (bc && !bb) sb = e.at;
		if (!bc && bb) lb += e.at - sb;
	}
	return {
		len: len,
		la: la,
		lb: lb
	};
}

export type OverlapOp = (a: number, b: number) => number;

export function overlapRatio(a: Seg, b: Seg, op: OverlapOp) {
	const i = overlapInfo(a, b);
	return op(i.len / i.la, i.len / i.lb);
}
export function stemOverlapRatio(a: Stem, b: Stem, op: OverlapOp) {
	const ovr = Math.max(
		overlapRatio(a.lowExp, b.lowExp, op),
		overlapRatio(a.highExp, b.lowExp, op),
		overlapRatio(a.lowExp, b.highExp, op),
		overlapRatio(a.highExp, b.highExp, op)
	);
	const lenRaw = Math.max(
		overlapInfo(a.low, b.low).len,
		overlapInfo(a.high, b.low).len,
		overlapInfo(a.low, b.high).len,
		overlapInfo(a.high, b.high).len
	);
	if (!lenRaw) {
		return 0;
	} else {
		return ovr;
	}
}
export function stemOverlapLength(a: Stem, b: Stem) {
	const len = Math.max(
		overlapInfo(a.lowExp, b.lowExp).len,
		overlapInfo(a.highExp, b.lowExp).len,
		overlapInfo(a.lowExp, b.highExp).len,
		overlapInfo(a.highExp, b.highExp).len
	);
	const lenRaw = Math.max(
		overlapInfo(a.low, b.low).len,
		overlapInfo(a.high, b.low).len,
		overlapInfo(a.low, b.high).len,
		overlapInfo(a.high, b.high).len
	);

	if (!lenRaw) {
		return 0;
	} else {
		return len;
	}
}

export function transitionClosure(d: boolean[][]) {
	const o = [];
	for (let j = 0; j < d.length; j++) {
		o[j] = d[j].slice(0);
	}
	for (let m = 0; m < o.length; m++) {
		for (let j = 0; j < o.length; j++) {
			for (let k = 0; k < o.length; k++) o[j][k] = o[j][k] || (o[j][m] && o[m][k]);
		}
	}
	return o;
}

export function transitiveReduce(g: boolean[][]) {
	const o = [];
	for (let j = 0; j < g.length; j++) {
		o[j] = g[j].slice(0);
	}
	for (let m = 0; m < o.length; m++) {
		for (let j = 0; j < o.length; j++) {
			for (let k = 0; k < o.length; k++) o[j][k] = o[j][k] || (o[j][m] && o[m][k]);
		}
	}
	for (let x = 0; x < g.length; x++) {
		g[x][x] = false;
	}
	for (let x = 0; x < g.length; x++) {
		for (let y = 0; y < g.length; y++) {
			for (let z = 0; z < g.length; z++) {
				if (g[x][y] && o[y][z]) g[x][z] = false;
			}
		}
	}
}

export function isSideTouch(a: Stem, b: Stem) {
	return (a.xMin < b.xMin && a.xMax < b.xMax) || (a.xMin > b.xMin && a.xMax > b.xMax);
}
