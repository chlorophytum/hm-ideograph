import { Support } from "@chlorophytum/arch";

import { isSideTouch } from "../../si-common/overlap";
import { segmentsProximity, slopeOf } from "../../si-common/seg";
import {
	atGlyphBottom,
	atGlyphTop,
	atRadicalBottom,
	atRadicalTop,
	isCapShape
} from "../../si-common/stem-spatial";
import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

export function computePQMatrices(
	strategy: HintingStrategy,
	stems: Stem[],
	flipMatrix: number[][]
) {
	let P: number[][] = [],
		Q: number[][] = [],
		n = stems.length;
	for (let j = 0; j < n; j++) {
		P[j] = [];
		Q[j] = [];
		for (let k = 0; k < n; k++) {
			P[j][k] = Q[j][k] = 0;
		}
	}
	for (let j = 0; j < n; j++) {
		for (let k = 0; k < j; k++) {
			const nothingInBetween = flipMatrix[j][k] <= 3;
			// Overlap weight
			const tb =
				(atGlyphTop(stems[j], strategy) && !stems[j].diagLow) ||
				(atGlyphBottom(stems[k], strategy) && !stems[j].diagHigh);

			let structuralProximity =
				segmentsProximity(stems[j].low, stems[k].high) +
				segmentsProximity(stems[j].high, stems[k].low) +
				segmentsProximity(stems[j].low, stems[k].low) +
				segmentsProximity(stems[j].high, stems[k].high);
			let spatialProximity = structuralProximity;

			// PBS
			if (
				(!nothingInBetween || !stems[j].hasGlyphStemAbove || !stems[k].hasGlyphStemBelow) &&
				spatialProximity < strategy.COEFF_PBS_MIN_PROMIX
			) {
				spatialProximity = strategy.COEFF_PBS_MIN_PROMIX;
			}
			if (!nothingInBetween && spatialProximity < strategy.COEFF_PBS_MIN_PROMIX) {
				structuralProximity = strategy.COEFF_PBS_MIN_PROMIX;
			}
			// Top/bottom
			if (tb) {
				spatialProximity *= strategy.COEFF_STRICT_TOP_BOT_PROMIX;
			} else if (!stems[j].hasGlyphStemAbove || !stems[k].hasGlyphStemBelow) {
				spatialProximity *= strategy.COEFF_TOP_BOT_PROMIX;
			}
			P[j][k] = Math.round(structuralProximity + (!nothingInBetween ? 1 : 0));
			Q[j][k] = spatialProximity;
		}
	}
	return { P, Q };
}

class ACSComputer {
	private slopes: number[];
	constructor(
		private readonly strategy: HintingStrategy,
		private readonly stems: Stem[],
		private readonly overlapRatios: number[][],
		private readonly overlapLengths: number[][],
		private readonly Q: number[][],
		private readonly F: number[][],
		private readonly S: number[][],
		private readonly dov?: boolean[][]
	) {
		this.slopes = stems.map(s => (slopeOf(s.high) + slopeOf(s.low)) / 2);
	}

	private computeTB(j: number, k: number) {
		const sj = this.stems[j];
		const sk = this.stems[k];

		return (
			(atGlyphTop(sj, this.strategy) && !sj.diagLow) ||
			(atGlyphBottom(sk, this.strategy) && !sj.diagHigh)
		);
	}
	private computeStrong(j: number, k: number, tb: boolean, ovr: number) {
		return (
			this.overlapRatios[j][k] > 0.85 ||
			this.overlapRatios[k][j] > 0.85 ||
			ovr > 1 / 3 ||
			(tb && (this.overlapRatios[j][k] > 0.4 || this.overlapRatios[k][j] > 0.4))
		);
	}
	private isSideTouch(sj: Stem, sk: Stem) {
		return (sj.xMin < sk.xMin && sj.xMax < sk.xMax) || (sj.xMin > sk.xMin && sj.xMax > sk.xMax);
	}

	private offCenterTouchType(j: number, k: number) {
		const sj = this.stems[j];
		const sk = this.stems[k];
		if (sk.xMaxP <= Support.mix(sj.xMinP, sj.xMaxP, 1 / 2)) return 1;
		if (sk.xMinP >= Support.mix(sj.xMinP, sj.xMaxP, 1 / 2)) return 2;
		if (sj.xMaxP <= Support.mix(sk.xMinP, sk.xMaxP, 1 / 2)) return 3;
		if (sj.xMinP >= Support.mix(sk.xMinP, sk.xMaxP, 1 / 2)) return 4;
		return 0;
	}
	private isOffCenterTouch(j: number, k: number) {
		const tt = this.offCenterTouchType(j, k);
		if (!tt) return false;
		if (!this.dov || !this.dov[j][k]) return true;
		if (tt === 1 || tt === 2) {
			for (let m = 0; m < j; m++) {
				if (this.dov[j][m]) {
					const ttm = this.offCenterTouchType(j, m);
					if ((tt === 1 && ttm === 2) || (tt === 2 && ttm === 1)) return false;
				}
			}
			return true;
		} else {
			for (let m = k + 1; m < this.stems.length; m++) {
				if (this.dov[m][k]) {
					const ttm = this.offCenterTouchType(m, k);
					if ((tt === 3 && ttm === 4) || (tt === 4 && ttm === 3)) return false;
				}
			}
			return true;
		}
		return true;
	}

	public compute(j: number, k: number) {
		const sj = this.stems[j];
		const sjRadBot = atRadicalBottom(sj, this.strategy) && !isCapShape(sj, this.strategy);

		const sk = this.stems[k];
		const skRadTop = atRadicalTop(sk, this.strategy);
		const nothingInBetween = this.F[j][k] <= 1 || (this.dov && !this.dov[j][k]);
		// Overlap weight
		let ovr = this.overlapLengths[j][k];
		const tb = this.computeTB(j, k);
		let isSideTouch = this.isSideTouch(sj, sk);

		// For side touches with low overlap, drop it.
		if (ovr < this.strategy.SIDETOUCH_LIMIT && isSideTouch) {
			ovr = 0;
		}

		let slopesCoefficient =
			nothingInBetween && sj.belongRadical !== sk.belongRadical
				? Math.max(0.25, 1 - Math.abs(this.slopes[j] - this.slopes[k]) * 10)
				: 1;

		let proximityCoefficient = 1 + (this.Q[j][k] > 2 ? 5 : 1) * this.Q[j][k];

		// Annexation coefficients
		const coefficientA = this.computeCoefficientA(
			j,
			k,
			nothingInBetween,
			tb,
			sj,
			sk,
			sjRadBot,
			skRadTop,
			this.isOffCenterTouch(j, k)
		);

		let a =
			this.strategy.COEFF_A_MULTIPLIER *
			ovr *
			coefficientA *
			proximityCoefficient *
			slopesCoefficient;
		if (!isFinite(a)) a = 0;

		return { a, d: ovr };
	}

	private computeCoefficientA(
		j: number,
		k: number,
		nothingInBetween: boolean | undefined,
		tb: boolean,
		sj: Stem,
		sk: Stem,
		sjRadBot: boolean,
		skRadTop: boolean,
		offCenter: boolean
	) {
		let coefficientA = 1 + this.strategy.COEFF_S * this.S[j][k];
		if (!nothingInBetween || tb) {
			coefficientA *= this.strategy.COEFF_A_SHAPE_LOST_XX;
		}
		if (!sj.hasGlyphStemAbove || !sk.hasGlyphStemBelow) {
			if (sj.belongRadical === sk.belongRadical) {
				coefficientA *= this.strategy.COEFF_A_TOPBOT_MERGED_SR;
			} else {
				coefficientA *= this.strategy.COEFF_A_TOPBOT_MERGED;
			}
			if (this.isGlyphSevereShapeLoss(sj, sk)) {
				coefficientA *= this.strategy.COEFF_A_SHAPE_LOST_XX;
			}
		}
		if (sj.belongRadical === sk.belongRadical) {
			coefficientA *= this.strategy.COEFF_A_SAME_RADICAL;
			if (!sj.hasSameRadicalStemAbove && !sk.hasSameRadicalStemBelow) {
				coefficientA *= this.strategy.COEFF_A_SHAPE_LOST_XX;
			} else if (!sj.hasSameRadicalStemAbove || !sk.hasSameRadicalStemBelow) {
				coefficientA *= this.strategy.COEFF_A_SHAPE_LOST;
			} else if (this.isInRadicalTolerableShapeLoss(sj, sk)) {
				coefficientA /=
					this.strategy.COEFF_A_SAME_RADICAL * this.strategy.COEFF_A_SHAPE_LOST;
			}
		} else {
			coefficientA *= this.strategy.COEFF_A_RADICAL_MERGE;
			if (sjRadBot && skRadTop) {
			} else if (skRadTop) {
				if (offCenter) coefficientA *= this.strategy.COEFF_A_SHAPE_LOST_XR;
			} else if (sjRadBot) {
				if (offCenter) coefficientA *= this.strategy.COEFF_A_SHAPE_LOST_XR;
			}
		}
		return coefficientA;
	}

	private isGlyphSevereShapeLoss(sj: Stem, sk: Stem) {
		return (
			(!sj.hasGlyphStemAbove && !atRadicalBottom(sj, this.strategy)) ||
			(!sk.hasGlyphStemBelow && !atRadicalTop(sk, this.strategy))
		);
	}

	private isInRadicalTolerableShapeLoss(sj: Stem, sk: Stem) {
		return (
			Math.abs(sj.xMin - sk.xMin) < this.strategy.Y_FUZZ * this.strategy.UPM &&
			Math.abs(sj.xMax - sk.xMax) < this.strategy.Y_FUZZ * this.strategy.UPM &&
			!(
				(sj.proximityDown > sj.proximityUp && sk.proximityUp >= sk.proximityDown) ||
				(sj.proximityDown >= sj.proximityUp && sk.proximityUp > sk.proximityDown)
			)
		);
	}
}

export function computeACSMatrices(
	strategy: HintingStrategy,
	stems: Stem[],
	overlapRatios: number[][],
	overlapLengths: number[][],
	Q: number[][],
	F: number[][],
	S: number[][],
	dov?: boolean[][]
) {
	// A : Annexation operator
	// D : Darkness operator
	const A: number[][] = [],
		D: number[][] = [],
		n = stems.length;
	for (let j = 0; j < n; j++) {
		A[j] = [];
		D[j] = [];
		for (let k = 0; k < n; k++) {
			A[j][k] = D[j][k] = 0;
		}
	}

	const comp = new ACSComputer(strategy, stems, overlapRatios, overlapLengths, Q, F, S, dov);

	for (let j = 0; j < n; j++) {
		for (let k = 0; k < j; k++) {
			const { a, d } = comp.compute(j, k);
			A[j][k] = a;
			D[j][k] = D[k][j] = d;
		}
	}
	cleanupTB(D, A, stems, strategy);
	closure(n, A);
	return {
		annexation: A,
		darkness: D,
		flips: F
	};
}

function cleanupTB(D: number[][], A: number[][], stems: Stem[], strategy: HintingStrategy) {
	const n = stems.length;
	for (let j = 0; j < n; j++) {
		let isBottomMost = true;
		for (let k = 0; k < j; k++) {
			if (D[j][k] > 0) isBottomMost = false;
		}
		if (!isBottomMost) continue;
		for (let k = j + 1; k < n; k++) {
			const minDiff = Math.abs(stems[j].xMax - stems[k].xMin);
			const maxDiff = Math.abs(stems[j].xMin - stems[k].xMax);
			const unbalance =
				minDiff + maxDiff <= 0 ? 0 : Math.abs(minDiff - maxDiff) / (minDiff + maxDiff);
			if (!isSideTouch(stems[j], stems[k]) && unbalance >= strategy.TBST_LIMIT) {
				A[k][j] *= strategy.COEFF_A_FEATURE_LOSS;
			}
		}
	}
	for (let j = 0; j < n; j++) {
		let isTopMost = true;
		for (let k = j + 1; k < n; k++) {
			if (D[k][j] > 0) isTopMost = false;
		}
		if (!isTopMost) continue;
		for (let k = 0; k < j; k++) {
			const minDiff = Math.abs(stems[j].xMax - stems[k].xMin);
			const maxDiff = Math.abs(stems[j].xMin - stems[k].xMax);
			const unbalance =
				minDiff + maxDiff <= 0 ? 0 : Math.abs(minDiff - maxDiff) / (minDiff + maxDiff);
			if (!isSideTouch(stems[j], stems[k]) && unbalance >= strategy.TBST_LIMIT) {
				A[j][k] *= strategy.COEFF_A_FEATURE_LOSS;
			}
		}
	}
}

function closure(n: number, A: number[][]) {
	for (let j = 0; j < n; j++) {
		for (let k = j + 1; k < n; k++) {
			A[j][k] = A[k][j] = Math.max(A[j][k], A[k][j]);
		}
	}
}
