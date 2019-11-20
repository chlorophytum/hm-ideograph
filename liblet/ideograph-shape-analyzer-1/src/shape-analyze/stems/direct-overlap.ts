import { transitiveReduce } from "../../si-common/overlap";
import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

function edgeTouch(s: Stem, t: Stem): boolean {
	if (s.xMax - s.xMin < t.xMax - t.xMin) return edgeTouch(t, s);
	return (
		(s.xMin < t.xMin &&
			t.xMin < s.xMax &&
			s.xMax < t.xMax &&
			(s.xMax - t.xMin) / (s.xMax - s.xMin) <= 0.2) ||
		(t.xMin < s.xMin &&
			s.xMin < t.xMax &&
			t.xMax < s.xMax &&
			(t.xMax - s.xMin) / (s.xMax - s.xMin) <= 0.2)
	);
}

function stemYOverlapRatio(sj: Stem, sk: Stem) {
	const overlapLength = Math.max(
		0,
		Math.min(sj.highKey.y, sk.highKey.y) - Math.max(sj.lowKey.y, sk.lowKey.y)
	);
	const unionLength = Math.max(
		0,
		Math.max(sj.highKey.y, sk.highKey.y) - Math.min(sj.lowKey.y, sk.lowKey.y)
	);
	return overlapLength / unionLength || 0;
}

export function analyzeDirectOverlaps(
	stems: Stem[],
	stemOverlaps: number[][],
	C: number[][],
	strategy: HintingStrategy,
	loose: boolean
) {
	let d: boolean[][] = [];
	for (let j = 0; j < stemOverlaps.length; j++) {
		d[j] = [];
		for (let k = 0; k < j; k++) {
			d[j][k] =
				stemOverlaps[j][k] > strategy.COLLISION_MIN_OVERLAP_RATIO &&
				!edgeTouch(stems[j], stems[k]);
			if (loose && C[j][k] <= 0) d[j][k] = false;
			if (stems[j].rid && stems[j].rid === stems[k].rid) d[j][k] = false;
			else if (
				stemOverlaps[j][k] > strategy.BOTH_OVERLAP_H &&
				stemYOverlapRatio(stems[j], stems[k]) > strategy.BOTH_OVERLAP_V
			) {
				d[j][k] = false;
			}
		}
	}
	transitiveReduce(d);
	return d;
}
