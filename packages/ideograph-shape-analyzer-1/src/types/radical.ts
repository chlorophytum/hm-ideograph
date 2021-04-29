import { Geometry, Support } from "@chlorophytum/arch";
import { mixZ } from "@chlorophytum/arch/lib/support";
import { AdjPoint, Contour } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { SegSpan } from "./seg";
import Stem from "./stem";

export class ContourIsland {
	constructor(public boundary: Contour) {}
	public holes: Contour[] = [];

	public includes(z: Geometry.Point) {
		if (!this.boundary.includesPoint(z)) return false;
		for (let j = 0; j < this.holes.length; j++) {
			if (this.holes[j].includesPoint(z)) return false;
		}
		return true;
	}

	public *contours() {
		yield this.boundary;
		yield* this.holes;
	}
}

export default class Radical {
	constructor(public readonly isTopLevel: boolean, public islands: ContourIsland[]) {}
	public subs: Radical[] = [];

	public segments: SegSpan[] = [];
	public stems: Stem[] = [];

	get outlineCcw() {
		return this.islands[0].boundary.ccw;
	}
	public *contours() {
		for (const island of this.islands) yield* island.contours();
	}
	public *outlineContours() {
		for (const island of this.islands) yield island.boundary;
	}
	public *points() {
		for (const c of this.contours()) for (const z of c.points) yield z;
	}
	public includes(z: Geometry.Point) {
		for (const island of this.islands) if (island.includes(z)) return true;
		return false;
	}

	public includesEdge(z: Geometry.Point, mu: number, mv: number) {
		if (this.includes(z)) return true;
		for (let u = -mu; u <= mu; u++) {
			for (let v = -mv; v <= mv; v++) {
				if (this.includes({ x: z.x + u, y: z.y + v })) return true;
			}
		}
		return false;
	}

	public includesSegment(z1: Geometry.Point, z2: Geometry.Point) {
		const SEGMENTS = 64;
		for (let s = 1; s < SEGMENTS; s++) {
			const test = {
				x: z2.x + (z1.x - z2.x) * (s / SEGMENTS),
				y: z2.y + (z1.y - z2.y) * (s / SEGMENTS)
			};
			if (!this.includes(test)) return false;
		}
		return true;
	}

	public includesSegmentEdge(
		z1: Geometry.Point,
		z2: Geometry.Point,
		umx: number,
		umy: number,
		deltaX: number,
		deltaY: number
	) {
		if (this.includesSegment(z1, z2)) {
			return true;
		}
		for (let u1 = -umx; u1 <= umx; u1++) {
			for (let u2 = -umy; u2 <= umy; u2++) {
				for (let u3 = -umx; u3 <= umx; u3++) {
					for (let u4 = -umy; u4 <= umy; u4++) {
						const z1a = { x: z1.x + u1 * deltaX, y: z1.y + u2 * deltaY };
						const z2a = { x: z2.x + u3 * deltaX, y: z2.y + u4 * deltaY };
						if (this.includesSegment(z1a, z2a)) return true;
					}
				}
			}
		}
		return false;
	}

	// eslint-disable-next-line complexity
	public includesDiSegment(s1: AdjPoint[], s2: AdjPoint[]) {
		for (let k = 0; k < s1.length; k++) {
			const zTopic = s1[k];
			let zClose = s2[0],
				dClose = Math.hypot(zTopic.x - zClose.x, zTopic.y - zClose.y);
			for (let m = 1; m < s2.length; m++) {
				const zTest = s2[m];
				const dTest = Math.hypot(zTopic.x - zTest.x, zTopic.y - zTest.y);
				if (dTest < dClose) {
					zClose = zTest;
					dClose = dTest;
				}
			}
			if (k > 0 && !this.includeTriangleImpl(zTopic, s1[k - 1], zClose)) return false;
			if (k + 1 < s1.length && !this.includeTriangleImpl(zTopic, s1[k + 1], zClose))
				return false;
		}
		return true;
	}
	private includeTriangleImpl(a: AdjPoint, b: AdjPoint, c: AdjPoint) {
		const midAB = mixZ(a, b, 0.5);
		let n = 0;
		if (this.includesSegmentEdge(a, c, 1, 1, 1, 1)) n++;
		if (this.includesSegmentEdge(midAB, c, 1, 1, 1, 1)) n++;
		if (this.includesSegmentEdge(b, c, 1, 1, 1, 1)) n++;
		return n > 1;
	}
}
