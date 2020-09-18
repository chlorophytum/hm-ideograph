import { Support } from "@chlorophytum/arch";
import { ShapeAnalysisResult } from "../shape-analyze/analysis";
import { HintingStrategy } from "../strategy";

interface MergeDecideGap {
	index: number;
	sidAbove: number;
	sidBelow: number;
	multiplier: number;
	repeatGapMultiplier: number;
	order: number;
	merged: boolean;
}

export class MergeCalculator {
	constructor(
		private m: number[][],
		private f: number[][],
		private sa: ShapeAnalysisResult,
		private readonly strategy: HintingStrategy
	) {}

	private adjustedMValue(j: number, k: number, rpm: boolean[]) {
		if (rpm[j] || rpm[k]) {
			return Math.min(this.m[j][k], this.strategy.COEFF_A_SAME_RADICAL);
		} else {
			return this.m[j][k];
		}
	}

	private getMergePairData(
		j: number,
		k: number,
		index: number,
		isRepeat: boolean[],
		gaps: MergeDecideGap[]
	) {
		const fRepeatGapCenter = isRepeat[j] && isRepeat[k];
		const fRepeatGapSide = isRepeat[j] || isRepeat[k];
		const sj = this.sa.stems[j];
		const sk = this.sa.stems[k];

		const fTooFar =
			4 * (sj.lowKey.y - sk.highKey.y) >=
			this.strategy.UPM * (this.strategy.EmBox.SpurTop - this.strategy.EmBox.SpurBottom);

		const sjXMiddle = Support.mix(sj.xMin, sj.xMax, 0.5);
		const skXMiddle = Support.mix(sk.xMin, sk.xMax, 0.5);
		const fLowerRepeating = isRepeat[j] && !isRepeat[k];
		const fUpperRepeating = isRepeat[k] && !isRepeat[j];
		const fLowerAtSide = sk.xMax < sjXMiddle || sk.xMin > sjXMiddle;
		const fUpperAtSide = sj.xMax < skXMiddle || sj.xMin > skXMiddle;
		const fUpperShorter = sj.xMax - sj.xMin < sk.xMax - sk.xMin;
		const fMergeDown = fLowerRepeating
			? true
			: fUpperRepeating
			? false
			: fUpperAtSide === fLowerAtSide
			? fUpperShorter
			: fUpperAtSide;
		const fDontMerge =
			j === k || fTooFar || this.adjustedMValue(j, k, isRepeat) >= this.strategy.DEADLY_MERGE;
		const multiplier = fDontMerge ? 0 : fMergeDown ? -1 : 1;
		gaps.push({
			index,
			sidAbove: j,
			sidBelow: k,
			multiplier,
			order: 0,
			merged: false,
			repeatGapMultiplier: fRepeatGapCenter ? 1 / 256 : fRepeatGapSide ? 1 / 16 : 1
		});
	}

	private optimizeMergeGaps(isRepeat: boolean[], gaps: MergeDecideGap[]) {
		let n = 1 + gaps.length;
		for (;;) {
			let mergeGapId = -1;
			let minCost = this.strategy.DEADLY_MERGE;
			for (let j = 0; j < gaps.length; j++) {
				const gap = gaps[j];
				if (!gap.multiplier || gap.merged) continue;
				gap.merged = true; // pretend we are merged
				let jMin = j,
					jMax = j;
				while (jMin >= 0 && gaps[jMin].merged) jMin--;
				while (jMax < gaps.length && gaps[jMax].merged) jMax++;

				let cost = 0;
				for (let p = jMin + 1; p < jMax; p++) {
					for (let q = jMin + 1; q <= p; q++) {
						cost +=
							this.adjustedMValue(gaps[p].sidAbove, gaps[q].sidBelow, isRepeat) *
							Math.min(gaps[p].repeatGapMultiplier, gaps[q].repeatGapMultiplier);
					}
				}

				if (cost < minCost) {
					minCost = cost;
					mergeGapId = j;
				}

				gap.merged = false;
			}
			if (mergeGapId >= 0) {
				gaps[mergeGapId].order = n;
				gaps[mergeGapId].merged = true;
				n--;
			} else {
				return;
			}
		}
	}

	public getMergePriority(
		top: number,
		bot: number,
		middle: number[],
		md: number[],
		repeatPatternMask: boolean[]
	) {
		let sidIsRepeat: boolean[] = [];
		for (let j = 0; j < middle.length; j++) {
			sidIsRepeat[middle[j]] = !!repeatPatternMask[j];
		}
		let gaps: MergeDecideGap[] = [];
		this.getMergePairData(middle[0], bot, 0, sidIsRepeat, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMergePairData(middle[j], middle[j - 1], j, sidIsRepeat, gaps);
		}
		this.getMergePairData(top, middle[middle.length - 1], middle.length, sidIsRepeat, gaps);
		this.optimizeMergeGaps(sidIsRepeat, gaps);

		return gaps.map((x, j) => x.order * x.multiplier * (md[j] ? 0 : 1));
	}

	private getMinGapData(j: number, k: number, gaps: number[]) {
		gaps.push(this.f[j][k] > 2 || this.f[k][j] > 2 ? 1 : 0);
	}
	public getMinGap(top: number, bot: number, middle: number[]) {
		let gaps: number[] = [];
		this.getMinGapData(middle[0], bot, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMinGapData(middle[j], middle[j - 1], gaps);
		}
		this.getMinGapData(top, middle[middle.length - 1], gaps);
		return gaps;
	}
}
