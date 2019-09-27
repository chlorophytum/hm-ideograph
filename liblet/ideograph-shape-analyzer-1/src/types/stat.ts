export interface Stat {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}
export function createStat(): Stat {
	return {
		xMin: 0xffff,
		xMax: -0xffff,
		yMin: 0xffff,
		yMax: -0xffff
	};
}
