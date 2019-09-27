import * as Util from "util";

import { Geometry } from "@chlorophytum/arch";

export interface AdjPoint {
	readonly x: number;
	readonly y: number;
	isCorner(): boolean;
	queryReference(): null | Geometry.PointReference;

	readonly prev?: AdjPoint;
	readonly next?: AdjPoint;
	readonly prevZ?: AdjPoint;
	readonly nextZ?: AdjPoint;
	readonly xExtrema?: boolean;
	readonly xStrongExtrema?: boolean;
	readonly yExtrema?: boolean;
	readonly yStrongExtrema?: boolean;
	readonly atLeft?: boolean;
	readonly isTurnAround?: boolean;
	readonly isPhantom?: IpPhantom;
	touched?: boolean;
	dontTouch?: boolean;
	isKeyPoint?: boolean;
	linkedKey?: undefined | null | AdjPoint;
	associatedStemSlope?: number;
	blued?: boolean;
	ipKeys?: IpKeys;
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
		public readonly x: number,
		public readonly y: number,
		public readonly type: number = Geometry.GlyphPointType.Corner,
		private readonly rawReferences: null | Geometry.PointReference[] = null
	) {
		this.references = type === Geometry.GlyphPointType.Corner ? rawReferences : null;
	}

	public static from(gz: Geometry.GlyphPoint) {
		return new CPoint(gz.x, gz.y, gz.type, gz.references);
	}
	public static cornerFrom(gz: Geometry.GlyphPoint) {
		return new CPoint(gz.x, gz.y, Geometry.GlyphPointType.Corner, gz.references);
	}

	public references: null | Geometry.PointReference[];
	public xExtrema: boolean = false;
	public xStrongExtrema: boolean = false;
	public yExtrema: boolean = false;
	public yStrongExtrema: boolean = false;
	public atLeft: boolean = false;
	public isTurnAround: boolean = false;
	public touched: boolean = false;
	public dontTouch: boolean = false;
	public isKeyPoint: boolean = false;
	public linkedKey?: AdjPoint;
	public associatedStemSlope?: number;
	public blued?: boolean;

	public prev?: AdjPoint;
	public next?: AdjPoint;
	public prevZ?: AdjPoint;
	public nextZ?: AdjPoint;
	public ipKeys?: IpKeys;
	public isPhantom?: IpPhantom;

	public queryReference() {
		return this.references && this.references.length > 0 ? this.references[0] : null;
	}
	public isCorner() {
		return this.type === Geometry.GlyphPointType.Corner;
	}

	public static adjacentZ(p: AdjPoint, q: AdjPoint) {
		return p.nextZ === q || p.prevZ === q || q.nextZ === p || q.prevZ === p;
	}

	public static adjacent(p: AdjPoint, q: AdjPoint) {
		return p.next === q || p.prev === q || q.next === p || q.prev === p;
	}

	[Util.inspect.custom](depth: number, options: Util.InspectOptionsStylized) {
		const posStr =
			`(${options.stylize(this.formatCoord(this.x), "number")}, ` +
			`${options.stylize(this.formatCoord(this.y), "number")})`;
		if (this.references && this.references.length) {
			return `${posStr}${options.stylize("#" + this.references[0].id, "special")}`;
		} else if (this.rawReferences && this.rawReferences.length) {
			return `${posStr}${options.stylize(`(#${this.rawReferences[0].id})`, "special")}`;
		} else {
			return posStr;
		}
	}

	private formatCoord(x: number) {
		return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
	}
}
