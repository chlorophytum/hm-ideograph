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
		}
	}
	transitiveReduce(d);
	return d;
}
