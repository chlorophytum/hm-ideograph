import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import Radical from "../types/radical";
import { Seg, SegSpan } from "../types/seg";

export function minMaxOfSeg(u: Seg) {
	let min = 0xffff,
		max = -0xffff;
	for (let s = 0; s < u.length; s++) {
		for (let k = 0; k < u[s].length; k++) {
			if (u[s][k].x < min) min = u[s][k].x;
			if (u[s][k].x > max) max = u[s][k].x;
		}
	}
	return { min: min, max: max };
}

export function segmentsProximity(s1: Seg, s2: Seg) {
	let count = 0;
	for (let j = 0; j < s1.length; j++) {
		for (let k = 0; k < s2.length; k++) {
			if (CPoint.adjacent(s1[j][0], s2[k][0])) count += 1;
			if (CPoint.adjacent(s1[j][0], s2[k][1])) count += 1;
			if (CPoint.adjacent(s1[j][1], s2[k][0])) count += 1;
			if (CPoint.adjacent(s1[j][1], s2[k][1])) count += 1;
		}
	}
	return (2 * count) / (s1.length + s2.length);
}

export function leftmostZ_S(seg: SegSpan): AdjPoint {
	let m = seg[0];
	for (const z of seg) if (!m || (z && z.x < m.x)) m = z;
	return m;
}
export function rightmostZ_S(seg: SegSpan): AdjPoint {
	let m = seg[0];
	for (const z of seg) if (!m || (z && z.x > m.x)) m = z;
	return m;
}

export function leftmostZ_SS(s: Seg): AdjPoint {
	let m = s[0][0];
	for (const seg of s) for (const z of seg) if (!m || (z && z.x < m.x)) m = z;
	return m;
}
export function rightmostZ_SS(s: Seg): AdjPoint {
	let m = s[0][0];
	for (const seg of s) for (const z of seg) if (!m || (z && z.x > m.x)) m = z;
	return m;
}
export function leftmostZ_SS_Ref(s: Seg): null | AdjPoint {
	let m: AdjPoint | null = null;
	for (const seg of s)
		for (const z of seg) if (z.queryReference() && (!m || (z && z.x < m.x))) m = z;
	return m;
}
export function rightmostZ_SS_Ref(s: Seg): null | AdjPoint {
	let m: AdjPoint | null = null;
	for (const seg of s)
		for (const z of seg) if (z.queryReference() && (!m || (z && z.x > m.x))) m = z;
	return m;
}

export function expandZ(
	radical: Radical,
	z: Geometry.Point,
	dx: number,
	dy: number,
	maxTicks: number
): AdjPoint {
	const z1 = { x: z.x + dx, y: z.y + dy };
	let steps = 0;
	while (radical.includesEdge(z1, 0, 2) && steps < maxTicks) {
		z1.x += dx;
		z1.y += dy;
		steps++;
	}
	z1.x -= dx;
	z1.y -= dy;
	return new CPoint(z1.x, z1.y);
}
export function expandZ0(
	radical: Radical,
	z: Geometry.Point,
	dx: number,
	dy: number,
	maxTicks: number
): AdjPoint {
	const z1 = { x: z.x + dx, y: z.y + dy };
	let steps = 0;
	while (radical.includes(z1) && steps < maxTicks) {
		z1.x += dx;
		z1.y += dy;
		steps++;
	}
	z1.x -= dx;
	z1.y -= dy;
	return new CPoint(z1.x, z1.y);
}

export function slopeOf(s: Seg) {
	let sy = 0,
		sx = 0,
		n = 0;
	for (let j = 0; j < s.length; j++) {
		for (let k = 0; k < s[j].length; k++) {
			sy += s[j][k].y;
			sx += s[j][k].x;
			n += 1;
		}
	}
	const ax = sx / n,
		ay = sy / n;
	let b1num = 0,
		b1den = 0;
	for (let j = 0; j < s.length; j++) {
		for (let k = 0; k < s[j].length; k++) {
			b1num += (s[j][k].x - ax) * (s[j][k].y - ay);
			b1den += (s[j][k].x - ax) * (s[j][k].x - ax);
		}
	}
	return b1num / b1den;
}
