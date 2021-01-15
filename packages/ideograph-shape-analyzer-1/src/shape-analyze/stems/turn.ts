import { Support } from "@chlorophytum/arch";
import { CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";
import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

const SIZE = 256;

export class Bitmap {
	public scale: number;
	public yMin: number;
	public yMax: number;

	constructor(strategy: HintingStrategy, public array: number[][]) {
		let scale = strategy.UPM / SIZE;
		let yMin = Math.floor((strategy.EmBox.Bottom * strategy.UPM) / scale);
		let yMax = Math.ceil((strategy.EmBox.Top * strategy.UPM) / scale);
		this.scale = scale;
		this.yMin = yMin;
		this.yMax = yMax;
		this.array = array;
	}
	public transform(x: number, y: number) {
		return {
			x: Math.round(x / this.scale),
			y: Math.round(y / this.scale) - this.yMin
		};
	}
	public access(x: number, y: number) {
		if (x < 0 || x > SIZE * this.scale) return false;
		if (y < this.yMin * this.scale || y > this.yMax * this.scale) return false;
		return this.array[Math.round(x / this.scale)][Math.round(y / this.scale) - this.yMin];
	}
	public accessRaw(x: number, y: number) {
		if (x < 0 || x > SIZE) return false;
		if (y < 0 || y > SIZE) return false;
		return this.array[Math.round(x)][Math.round(y) - this.yMin];
	}
}

export function createImageBitmap(g: CGlyph, strategy: HintingStrategy) {
	let scale = strategy.UPM / SIZE;
	let yMin = Math.floor((strategy.EmBox.Bottom * strategy.UPM) / scale);
	let yMax = Math.ceil((strategy.EmBox.Top * strategy.UPM) / scale);
	let bitmap = new Array(SIZE + 1);
	for (let x = 0; x <= SIZE; x++) {
		bitmap[x] = new Array(yMax - yMin + 1);
		for (let y = yMin; y <= yMax; y++) {
			bitmap[x][y - yMin] = g.containsPoint({ x: x * scale, y: y * scale });
		}
	}
	return new Bitmap(strategy, bitmap);
}

class FlipAnalyzer {
	constructor(private readonly vLimit: number) {}
	public lifetime: number[] = [];
	public enter<T>(clrBefore: T, a: readonly T[], clrAfter: T) {
		const turns = this.analyzeBands(clrBefore, a, clrAfter);
		for (let t = 0; t <= turns; t++) {
			this.lifetime[t] = (this.lifetime[t] || 0) + 1;
		}
	}
	private analyzeBands<T>(clrBefore: T, a: readonly T[], clrAfter: T) {
		if (!a || !a.length) return 0;

		let start = 0,
			end = a.length - 1;
		while (a[start] === clrBefore && start + 1 < a.length) start++;
		while (a[end] === clrAfter && end > 0) end--;

		let v0 = a[start],
			bandLength = 0,
			turns = 0;
		for (let j = start; j <= end; j++) {
			const v = a[j];
			if (v !== v0) {
				if (!v) {
					if (bandLength > this.vLimit) turns += 1;
					bandLength = 0;
				} else {
					bandLength = 1;
				}
				v0 = v;
			} else if (bandLength > 0) {
				bandLength += 1;
			}
		}
		return turns;
	}
	public computeFlips(hLimit: number) {
		let turns = 0;
		while (this.lifetime[turns] >= hLimit) turns++;
		return turns;
	}
}

export function analyzeTurns(g: CGlyph, strategy: HintingStrategy, stems: Stem[]) {
	const bitmap = createImageBitmap(g, strategy);
	const HLimit = bitmap.transform(strategy.UPM / 16, 0).x;
	const HLimitSig = bitmap.transform(strategy.UPM / 4, 0).x;
	const VLimit = 0;

	for (let s of stems) {
		let x1 = bitmap.transform(s.xMin, 0).x;
		let x2 = bitmap.transform(s.xMax, 0).x;
		let yBot = bitmap.transform(0, s.y - s.width).y - 1;
		let yTop = bitmap.transform(0, s.y).y + 1;
		if (!bitmap.array[x1] || !bitmap.array[x2]) continue;
		if (yBot > 0) {
			const fa = new FlipAnalyzer(VLimit);
			for (let x = x1; x <= x2; x++) {
				if (!bitmap.array[x]) continue;
				fa.enter(0, bitmap.array[x].slice(0, yBot), 1);
			}
			s.turnsBelow = fa.computeFlips(HLimitSig / 6);
		}
		if (yTop > 0) {
			const fa = new FlipAnalyzer(VLimit);
			for (let x = x1; x <= x2; x++) {
				if (!bitmap.array[x]) continue;
				fa.enter(1, bitmap.array[x].slice(yTop), 0);
			}
			s.turnsAbove = fa.computeFlips(HLimitSig / 6);
		}
	}

	let turnMatrix: number[][] = [];
	let turnMatrixSig: number[][] = [];
	for (let j = 0; j < stems.length; j++) {
		turnMatrix[j] = [];
		turnMatrixSig[j] = [];
		turnMatrix[j][j] = turnMatrixSig[j][j] = 0;
		const sj = stems[j];
		for (let k = 0; k < j; k++) {
			turnMatrix[j][k] = turnMatrix[k][j] = 0;
			turnMatrixSig[j][k] = turnMatrixSig[k][j] = 0;
			const fa = new FlipAnalyzer(VLimit);

			const sk = stems[k];
			const xj1 = bitmap.transform(sj.xMinEx, 0).x;
			const xj2 = bitmap.transform(sj.xMaxEx, 0).x;
			const xk1 = bitmap.transform(sk.xMinEx, 0).x;
			const xk2 = bitmap.transform(sk.xMaxEx, 0).x;
			const yBot = bitmap.transform(0, sj.y - sj.width).y - 2;
			const yTop = bitmap.transform(0, sk.y).y + 2;

			if (yBot <= yTop) continue;
			if (xk1 > xj2 || xj1 > xk2) continue;
			if (yBot < 0 || yTop < 0) continue;

			for (let x = Math.max(xj1, xk1); x <= Math.min(xj2, xk2); x++) {
				if (!bitmap.array[x]) continue;
				fa.enter(1, bitmap.array[x].slice(yTop, yBot), 1);
			}

			turnMatrix[j][k] = turnMatrix[k][j] = fa.computeFlips(HLimit);
			turnMatrixSig[j][k] = turnMatrixSig[k][j] = fa.computeFlips(HLimitSig);
		}
	}
	return [turnMatrix, turnMatrixSig] as [number[][], number[][]];
}

export function analyzeSquash(g: CGlyph, strategy: HintingStrategy, stems: Stem[]) {
	const bitmap = createImageBitmap(g, strategy);

	let squashMatrix: number[][] = [];
	for (let j = 0; j < stems.length; j++) {
		squashMatrix[j] = [];
		squashMatrix[j][j] = 0;
		const sj = stems[j];
		for (let k = 0; k < j; k++) {
			squashMatrix[j][k] = squashMatrix[k][j] = 0;
			const sk = stems[k];

			const xj1 = bitmap.transform(sj.xMinEx, 0).x;
			const xj2 = bitmap.transform(sj.xMaxEx, 0).x;
			const xk1 = bitmap.transform(sk.xMinEx, 0).x;
			const xk2 = bitmap.transform(sk.xMaxEx, 0).x;

			const yBot = bitmap.transform(0, sj.y - sj.width).y - 2;
			const yTop = bitmap.transform(0, sk.y).y + 2;

			if (yBot <= yTop) continue;
			if (yBot < 0 || yTop < 0) continue;

			const NU = Math.max(4, Math.ceil(Math.abs(xj2 - xj1)), Math.ceil(Math.abs(xk2 - xk1)));
			const NV = Math.max(4, Math.ceil(Math.abs(yTop - yBot)));
			let a = 0;
			for (let v = 0; v <= NV; v++) {
				let s = 0;
				const y = Support.mix(yBot, yTop, v / NV);
				const xLeft = Support.mix(xj1, xk1, v / NV);
				const xRight = Support.mix(xj2, xk2, v / NV);
				for (let u = 0; u <= NU; u++) {
					const x = Support.mix(xLeft, xRight, u / NU);
					if (bitmap.accessRaw(x, y)) s += 1;
				}
				a += (s / NV) * Math.abs(xRight - xLeft);
			}

			squashMatrix[j][k] = squashMatrix[k][j] =
				((a / NU) * Math.abs(yBot - yTop)) / (SIZE * SIZE);
		}
	}
	return squashMatrix;
}
