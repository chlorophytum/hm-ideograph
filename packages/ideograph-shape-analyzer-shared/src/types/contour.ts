import { Geometry, Support } from "@chlorophytum/arch";

import { CPoint } from "./point";
import { createStat } from "./stat";

export class Contour {
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
				(z.isCorner() &&
					!prev.isCorner() &&
					!next.isCorner() &&
					z.x === prev.x &&
					z.x === next.x);
			if (z.xStrongExtrema) {
				z.atLeft = z.x < prev.x - 1 && z.x < next.x - 1;
			}
		}
	}

	private checkExtrema(k: number) {
		const z = this.points[k],
			prev = this.points[this.cyc(k - 1)],
			next = this.points[this.cyc(k + 1)];
		this.checkYExtrema(prev, z, next);
		this.checkXExtrema(prev, z, next);
		const cross = (z.x - prev.x) * (next.y - z.y) - (z.y - prev.y) * (next.x - z.x);
		z.isTurnAround = cross > 0;
	}

	private amendExtrema(k: number) {
		const z = this.points[k],
			prev = this.points[this.cyc(k - 1)],
			next = this.points[this.cyc(k + 1)];
		if (!(z.isCorner() && !prev.isCorner() && !next.isCorner())) return;
		if (z.y === prev.y && z.y === next.y && !z.yExtrema) {
			z.yExtrema = prev.yExtrema || next.yExtrema;
			z.yStrongExtrema = prev.yStrongExtrema || next.yStrongExtrema;
			prev.yExtrema = next.yExtrema = false;
			prev.yStrongExtrema = next.yStrongExtrema = false;
		}
		if (z.x === prev.x && z.x === next.x && !z.xExtrema) {
			z.xExtrema = prev.xExtrema || next.xExtrema;
			z.xStrongExtrema = prev.xStrongExtrema || next.xStrongExtrema;
			prev.xExtrema = next.xExtrema = false;
			prev.xStrongExtrema = next.xStrongExtrema = false;
		}
	}

	private cyc(n: number) {
		return (n + this.points.length) % this.points.length;
	}
	public stat() {
		this.markAdj();
		this.markAdjZ();

		for (let j = 0; j < this.points.length; j++) this.checkExtrema(j);
		for (let j = 0; j < this.points.length; j++) this.amendExtrema(j);

		const xs = this.points.map(p => p.x);
		const ys = this.points.map(p => p.y);
		this.stats.xMax = Math.max(...xs);
		this.stats.yMax = Math.max(...ys);
		this.stats.xMin = Math.min(...xs);
		this.stats.yMin = Math.min(...ys);
		this.orient();
	}

	private markAdj() {
		const corners = this.points.filter(z => z.queryReference());
		for (let m = 0; m < corners.length; m++) {
			const prev = corners[(m - 1 + corners.length) % corners.length];
			const curr = corners[m];
			const next = corners[(m + 1 + corners.length) % corners.length];
			curr.prev = prev;
			curr.next = next;
		}
	}
	private markAdjZ() {
		const points = this.points;
		for (let m = 0; m < points.length; m++) {
			const prev = points[(m - 1 + points.length) % points.length];
			const curr = points[m];
			const next = points[(m + 1 + points.length) % points.length];
			curr.prevZ = prev;
			curr.nextZ = next;
		}
	}
	private orient() {
		// Find out pYMin
		let jm = 0,
			ym = this.points[0].y;
		for (let j = 1; j < this.points.length; j++) {
			if (this.points[j].y < ym) {
				jm = j;
				ym = this.points[j].y;
			}
		}
		const p0 = this.points[this.cyc(jm - 1)],
			p1 = this.points[jm],
			p2 = this.points[this.cyc(jm + 1)];
		const x = (p0.x - p1.x) * (p2.y - p1.y) - (p0.y - p1.y) * (p2.x - p1.x);
		if (x < 0) {
			this.ccw = true;
		} else if (x === 0) {
			this.ccw = p2.x > p1.x;
		}
	}

	public includesPoint(z: Geometry.Point) {
		return inPoly(z, this.points);
	}
	public includes(that: Contour) {
		for (let j = 0; j < that.points.length; j++) {
			if (!inPoly(that.points[j], this.points)) return false;
		}
		return true;
	}
}

function inPoly(point: Geometry.Point, vs: Geometry.Point[]) {
	// ray-casting algorithm based on
	// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

	const x = point.x,
		y = point.y;

	let inside = 0;
	for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		const xi = vs[i].x,
			yi = vs[i].y;
		const xj = vs[j].x,
			yj = vs[j].y;
		if (xi === x && yi === y) return true;
		const intersect =
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

export type ContourMakingOptions = { dicingLength: number };
export class ContourMaker {
	private constructor(private readonly options: ContourMakingOptions) {}
	private cResult: CPoint[] = [];
	private zPending: CPoint[] = [];

	public static processPoints(contour: Geometry.GlyphPoint[], options: ContourMakingOptions) {
		const st = new ContourMaker(options);
		const jStart = this.findCornerIndex(contour);
		if (jStart < 0) return null;
		const zStart: CPoint = CPoint.from(contour[jStart]);
		st.zPending.push(zStart);

		for (let k = 1; k < contour.length; k++) {
			const z = CPoint.from(contour[(jStart + k) % contour.length]);
			switch (z.type) {
				case Geometry.GlyphPointType.Quadratic:
					st.introduceQuadratic(z);
					break;
				default:
					st.flush(CPoint.cornerFrom(z));
					break;
			}
		}
		st.flush(zStart);

		const ret = new Contour();
		ret.points = st.cResult;
		return ret;
	}

	private static findCornerIndex(contour: Geometry.GlyphPoint[]) {
		for (let j = 0; j < contour.length; j++) {
			if (contour[j].type === Geometry.GlyphPointType.Corner) return j;
		}
		return -1;
	}

	private isPendingLine() {
		return this.zPending.length === 1;
	}
	private isPendingQuadratic() {
		return (
			this.zPending.length === 2 &&
			this.zPending[1].type === Geometry.GlyphPointType.Quadratic
		);
	}
	private introduceQuadratic(z: CPoint) {
		if (this.isPendingQuadratic()) {
			const mid = new CPoint(
				(this.zPending[1].x + z.x) / 2,
				(this.zPending[1].y + z.y) / 2,
				Geometry.GlyphPointType.OnCurvePhantom
			);
			this.flush(mid);
			this.zPending.push(z);
		} else {
			this.zPending.push(z);
		}
	}

	private flush(z: CPoint) {
		if (this.isPendingQuadratic()) {
			this.cResult.push(this.zPending[0]);
			this.flushQuadraticInners(this.zPending[0], this.zPending[1], z);
		} else if (this.isPendingLine()) {
			const a = this.zPending[0];
			this.cResult.push(a);
			const arcLength = Math.hypot(a.x - z.x, a.y - z.y);
			const stops = Math.round(arcLength / this.options.dicingLength);
			for (let k = 1; k < stops; k++) {
				const mid = new CPoint(
					Support.mix(a.x, z.x, k / stops),
					Support.mix(a.y, z.y, k / stops),
					Geometry.GlyphPointType.OnCurvePhantom
				);
				this.cResult.push(mid);
			}
		} else {
			for (const z1 of this.zPending) this.cResult.push(z1);
		}
		this.zPending.length = 1;
		this.zPending[0] = z;
	}
	private flushQuadraticInners(a: CPoint, b: CPoint, c: CPoint) {
		// Use control polygon for better results
		this.cResult.push(b);
	}
}
