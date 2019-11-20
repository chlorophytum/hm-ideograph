import { Geometry, Support } from "@chlorophytum/arch";
import { AdjPoint, Contour } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { SegSpan } from "./seg";
import Stem from "./stem";

export default class Radical {
	constructor(public outline: Contour) {}
	public holes: Contour[] = [];
	public subs: Radical[] = [];
	public segments: SegSpan[] = [];
	public stems: Stem[] = [];

	public includes(z: Geometry.Point) {
		if (!this.outline.includesPoint(z)) return false;
		for (let j = 0; j < this.holes.length; j++) {
			if (this.holes[j].includesPoint(z)) return false;
		}
		return true;
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
			let test = {
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
						let z1a = { x: z1.x + u1 * deltaX, y: z1.y + u2 * deltaY };
						let z2a = { x: z2.x + u3 * deltaX, y: z2.y + u4 * deltaY };
						if (this.includesSegment(z1a, z2a)) return true;
					}
				}
			}
		}
		return false;
	}

	public includesTetragon(s1: AdjPoint[], s2: AdjPoint[], _dS: number) {
		let xMin1 = s1[0].x,
			xMax1 = s1[0].x,
			xMin2 = s2[0].x,
			xMax2 = s2[0].x;
		for (let u = 0; u < s1.length; u++) {
			if (s1[u].x < xMin1) xMin1 = s1[u].x;
			if (s1[u].x > xMax1) xMax1 = s1[u].x;
		}
		for (let u = 0; u < s2.length; u++) {
			if (s2[u].x < xMin2) xMin2 = s2[u].x;
			if (s2[u].x > xMax2) xMax2 = s2[u].x;
		}
		const dS = Math.min(_dS, (xMax1 - xMin1) / 3, (xMax2 - xMin2) / 3);
		for (let u = 0; u < s1.length - 1; u++) {
			for (let v = 0; v < s2.length - 1; v++) {
				let p = s1[u],
					q = s1[u + 1];
				let r = s2[v],
					s = s2[v + 1];
				if (p.x > q.x) {
					let t = p;
					p = q;
					q = t;
				}
				if (r.x > s.x) {
					let t = r;
					r = s;
					s = t;
				}
				const N = 8;
				for (let sg = 0; sg <= N; sg++) {
					let zTop = Support.mixZ(p, q, sg / N);
					let zBot = Support.mixZ(r, s, sg / N);
					if (!p.turn && zTop.x < xMin1 + dS) continue;
					if (!q.turn && zTop.x > xMax1 - dS) continue;
					if (!r.turn && zBot.x < xMin2 + dS) continue;
					if (!s.turn && zBot.x > xMax2 - dS) continue;
					if (!this.includesSegmentEdge(zTop, zBot, 1, 1, 1, 1)) return false;
				}
			}
		}
		return true;
	}
}
