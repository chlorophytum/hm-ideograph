import { correctYWForStem } from "../../si-common/hlkey";
import { AdjPoint } from "../../types/point";
import Stem from "../../types/stem";

export function analyzeStemKeyPoints(stems: Stem[]) {
	for (const stem of stems) {
		// posKeyShouldAtBottom : a bottom stem?
		const { highKey, lowKey } = correctYWForStem(stem);
		highKey.touched = lowKey.touched = true;

		// get non-key points
		let highNonKey: AdjPoint[] = [],
			lowNonKey: AdjPoint[] = [];
		let jh = -1,
			jl = -1;
		for (let j = 0; j < stem.high.length; j++) {
			for (let k = 0; k < stem.high[j].length; k++) {
				if (stem.high[j][k] === highKey) {
					jh = j;
					continue;
				}
				stem.high[j][k].linkedKey = highKey;
				if (!(stem.high[j][k].id >= 0)) {
					continue;
				}
				if (k === 0) {
					highNonKey[j] = stem.high[j][k];
					stem.high[j][k].touched = true;
				} else {
					stem.high[j][k].dontTouch = true;
				}
			}
		}
		highNonKey = highNonKey.filter((v, j) => j !== jh);
		for (let j = 0; j < stem.low.length; j++) {
			for (let k = 0; k < stem.low[j].length; k++) {
				if (stem.low[j][k] === lowKey) {
					jl = j;
					continue;
				}
				stem.low[j][k].linkedKey = lowKey;
				if (!(stem.low[j][k].id >= 0)) {
					continue;
				}
				if (k === stem.low[j].length - 1) {
					lowNonKey[j] = stem.low[j][k];
					stem.low[j][k].touched = true;
				} else {
					stem.low[j][k].dontTouch = true;
				}
			}
		}
		lowNonKey = lowNonKey.filter((v, j) => j !== jl);

		stem.highKey = highKey;
		stem.lowKey = lowKey;
		stem.highAlign = highNonKey;
		stem.lowAlign = lowNonKey;
		stem.highKey.keyPoint = true;
		stem.lowKey.keyPoint = true;
		stem.highKey.slope = stem.lowKey.slope = stem.slope;
	}
}
