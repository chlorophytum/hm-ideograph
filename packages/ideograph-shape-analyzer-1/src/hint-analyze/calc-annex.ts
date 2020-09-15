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
	constructor(private sa: ShapeAnalysisResult, private readonly strategy: HintingStrategy) {}

	private getMergePairData(
		m: number[][],
		j: number,
		k: number,
		index: number,
		repeatGapSide: boolean,
		repeatGapCenter: boolean,
		gaps: MergeDecideGap[]
	) {
		const sj = this.sa.stems[j];
		const sk = this.sa.stems[k];

		const fTooFar =
			4 * (sj.lowKey.y - sk.highKey.y) >=
			this.strategy.UPM * (this.strategy.EmBox.SpurTop - this.strategy.EmBox.SpurBottom);

		const sjXMiddle = Support.mix(sj.xMin, sj.xMax, 0.5);
		const skXMiddle = Support.mix(sk.xMin, sk.xMax, 0.5);
		const fLowerAtSide = sk.xMax < sjXMiddle || sk.xMin > sjXMiddle;
		const fUpperAtSide = sj.xMax < skXMiddle || sj.xMin > skXMiddle;
		const fUpperShorter = sj.xMax - sj.xMin < sk.xMax - sk.xMin;
		const fMergeDown = fUpperAtSide === fLowerAtSide ? fUpperShorter : fUpperAtSide;
		const multiplier =
			j === k || fTooFar || m[j][k] >= this.strategy.DEADLY_MERGE ? 0 : fMergeDown ? -1 : 1;

		gaps.push({
			index,
			sidAbove: j,
			sidBelow: k,
			multiplier,
			order: 0,
			merged: false,
			repeatGapMultiplier: repeatGapCenter ? 1 / 256 : repeatGapSide ? 1 / 16 : 1
		});
	}

	private optimizeMergeGaps(m: number[][], gaps: MergeDecideGap[]) {
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
							m[gaps[p].sidAbove][gaps[q].sidBelow] *
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
		m: number[][],
		top: number,
		bot: number,
		middle: number[],
		md: number[],
		rpm: boolean[]
	) {
		let gaps: MergeDecideGap[] = [];
		this.getMergePairData(m, middle[0], bot, 0, rpm[0], false, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMergePairData(
				m,
				middle[j],
				middle[j - 1],
				j,
				rpm[j] || rpm[j - 1],
				rpm[j] && rpm[j - 1],
				gaps
			);
		}
		this.getMergePairData(
			m,
			top,
			middle[middle.length - 1],
			middle.length,
			rpm[middle.length - 1],
			false,
			gaps
		);
		this.optimizeMergeGaps(m, gaps);

		return gaps.map((x, j) => x.order * x.multiplier * (md[j] ? 0 : 1));
	}

	private getMinGapData(f: number[][], j: number, k: number, gaps: number[]) {
		gaps.push(f[j][k] > 2 || f[k][j] > 2 ? 1 : 0);
	}
	public getMinGap(f: number[][], top: number, bot: number, middle: number[]) {
		let gaps: number[] = [];
		this.getMinGapData(f, middle[0], bot, gaps);
		for (let j = 1; j < middle.length; j++) {
			this.getMinGapData(f, middle[j], middle[j - 1], gaps);
		}
		this.getMinGapData(f, top, middle[middle.length - 1], gaps);
		return gaps;
	}
}
