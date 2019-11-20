import { Geometry } from "@chlorophytum/arch";

export interface AdjPoint extends Geometry.GlyphPoint {
	prev?: AdjPoint;
	next?: AdjPoint;
	prevZ?: AdjPoint;
	nextZ?: AdjPoint;
	xExtrema?: boolean;
	xStrongExtrema?: boolean;
	yExtrema?: boolean;
	yStrongExtrema?: boolean;
	atLeft?: boolean;
	turn?: boolean;
	touched?: boolean;
	dontTouch?: boolean;
	keyPoint?: boolean;
	linkedKey?: AdjPoint;
	slope?: number;
	blued?: boolean;
	ipKeys?: IpKeys;
	phantom?: IpPhantom;
}

export interface IpPhantom {
	xMin: number;
	xMax: number;
}
export interface IpKeys {
	upperK0: AdjPoint;
	lowerK0: AdjPoint;
	upperK: AdjPoint;
	lowerK: AdjPoint;
	ipPri: number;
}

export class CPoint implements AdjPoint {
	constructor(
		public x: number,
		public y: number,
		public on: boolean = true,
		public id: number = -1
	) {}
	public xExtrema: boolean = false;
	public xStrongExtrema: boolean = false;
	public yExtrema: boolean = false;
	public yStrongExtrema: boolean = false;
	public atLeft: boolean = false;
	public turn: boolean = false;
	public touched: boolean = false;
	public dontTouch: boolean = false;
	public keyPoint: boolean = false;
	public linkedKey?: AdjPoint;
	public slope?: number;
	public blued?: boolean;

	public prev?: AdjPoint;
	public next?: AdjPoint;
	public prevZ?: AdjPoint;
	public nextZ?: AdjPoint;
	public ipKeys?: IpKeys;
	public phantom?: IpPhantom;

	public static adjacentZ(p: AdjPoint, q: AdjPoint) {
		return p.nextZ === q || p.prevZ === q || q.nextZ === p || q.prevZ === p;
	}

	public static adjacent(p: AdjPoint, q: AdjPoint) {
		return p.next === q || p.prev === q || q.next === p || q.prev === p;
	}
}
