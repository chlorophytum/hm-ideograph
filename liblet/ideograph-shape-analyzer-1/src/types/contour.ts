import { Geometry } from "@chlorophytum/arch";

import { CPoint } from "./point";
import { createStat } from "./stat";

export default class Contour {
	public points: CPoint[] = [];
	public ccw = false;
	public stats = createStat();
	public outline = false;

	private checkYExtrema(prev: CPoint, z: CPoint, next: CPoint) {
		if ((z.y > prev.y && z.y >= next.y) || (z.y < prev.y && z.y <= next.y)) {
			z.yExtrema = true;
			z.yStrongExtrema =
				(z.y > prev.y + 1 && z.y > next.y + 1) || (z.y < prev.y - 1 && z.y < next.y - 1);
		}
	}
	private checkXExtrema(prev: CPoint, z: CPoint, next: CPoint) {
		if ((z.x > prev.x && z.x >= next.x) || (z.x < prev.x && z.x <= next.x)) {
			z.xExtrema = true;
			z.xStrongExtrema =
				(z.x > prev.x + 1 && z.x > next.x + 1) ||
				(z.x < prev.x - 1 && z.x < next.x - 1) ||
				(z.on && !prev.on && !next.on && z.x === prev.x && z.x === next.x);
			if (z.xStrongExtrema) {
				z.atLeft = z.x < prev.x - 1 && z.x < next.x - 1;
			}
		}
	}

	private checkExtrema(prev: CPoint, z: CPoint, next: CPoint) {
		this.checkYExtrema(prev, z, next);
		this.checkXExtrema(prev, z, next);
		const cross = (z.x - prev.x) * (next.y - z.y) - (z.y - prev.y) * (next.x - z.x);
		z.turn = cross > 0;
	}

	public stat() {
		let points = this.points;
		this.checkExtrema(points[points.length - 2], points[0], points[1]);
		this.checkExtrema(points[points.length - 2], points[points.length - 1], points[1]);
		for (let j = 1; j < points.length - 1; j++) {
			this.checkExtrema(points[j - 1], points[j], points[j + 1]);
		}
		let xs = this.points.map(p => p.x);
		let ys = this.points.map(p => p.y);
		this.stats.xMax = Math.max.apply(Math, xs);
		this.stats.yMax = Math.max.apply(Math, ys);
		this.stats.xMin = Math.min.apply(Math, xs);
		this.stats.yMin = Math.min.apply(Math, ys);
		this.orient();
	}

	private orient() {
		// Find out pYMin
		let jm = 0,
			ym = this.points[0].y;
		for (let j = 0; j < this.points.length - 1; j++) {
			if (this.points[j].y < ym) {
				jm = j;
				ym = this.points[j].y;
			}
		}
		let p0 = this.points[jm ? jm - 1 : this.points.length - 2],
			p1 = this.points[jm],
			p2 = this.points[jm + 1];
		let x = (p0.x - p1.x) * (p2.y - p1.y) - (p0.y - p1.y) * (p2.x - p1.x);
		if (x < 0) {
			this.ccw = true;
		} else if (x === 0) {
			this.ccw = p2.x > p1.x;
		}
		// Adjacency
		{
			let pt = this.points[0];
			for (let j = 0; j < this.points.length - 1; j++) {
				if (this.points[j].on) {
					this.points[j].prev = pt;
					pt.next = this.points[j];
					pt = this.points[j];
				}
			}
			this.points[0].prev = pt;
			pt.next = this.points[0];
		}
		// Direct adjacency
		{
			let pt = this.points[0];
			for (let j = 0; j < this.points.length - 1; j++) {
				this.points[j].prevZ = pt;
				pt.nextZ = this.points[j];
				pt = this.points[j];
			}
			this.points[0].prevZ = pt;
			pt.nextZ = this.points[0];
		}
	}

	public includesPoint(z: Geometry.Point) {
		return inPoly(z, this.points);
	}
	public includes(that: Contour) {
		for (let j = 0; j < that.points.length - 1; j++) {
			if (!inPoly(that.points[j], this.points)) return false;
		}
		return true;
	}
}

export function inPoly(point: Geometry.Point, vs: Geometry.Point[]) {
	// ray-casting algorithm based on
	// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

	let x = point.x,
		y = point.y;

	let inside = 0;
	for (let i = 0, j = vs.length - 2; i < vs.length - 1; j = i++) {
		let xi = vs[i].x,
			yi = vs[i].y;
		let xj = vs[j].x,
			yj = vs[j].y;
		if (xi === x && yi === y) return true;
		let intersect =
			yi > y !== yj > y &&
			(yj > yi
				? (x - xi) * (yj - yi) < (xj - xi) * (y - yi)
				: (x - xi) * (yj - yi) > (xj - xi) * (y - yi));
		if (intersect) {
			if (yi > yj) inside += 1;
			else inside -= 1;
		}
	}

	return !!inside;
}
