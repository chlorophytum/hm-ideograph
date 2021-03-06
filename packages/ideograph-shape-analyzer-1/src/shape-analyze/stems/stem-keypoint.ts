import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { correctYWForStem } from "../../si-common/hlkey";
import Stem from "../../types/stem";

export function analyzeStemKeyPoints(stems: Stem[]) {
	for (const stem of stems) {
		// posKeyShouldAtBottom : a bottom stem?
		const { highKey, lowKey } = correctYWForStem(stem);
		highKey.touched = lowKey.touched = true;

		// get non-key points
		const highNonKey: AdjPoint[] = [],
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
				if (!stem.high[j][k].queryReference()) {
					continue;
				}
				if (k === 0 || k === stem.high[j].length - 1) {
					highNonKey.push(stem.high[j][k]);
					stem.high[j][k].touched = true;
				} else {
					stem.high[j][k].dontTouch = true;
				}
			}
		}

		for (let j = 0; j < stem.low.length; j++) {
			for (let k = 0; k < stem.low[j].length; k++) {
				if (stem.low[j][k] === lowKey) {
					jl = j;
					continue;
				}
				stem.low[j][k].linkedKey = lowKey;
				if (!stem.low[j][k].queryReference()) {
					continue;
				}
				if (k === 0 || k === stem.low[j].length - 1) {
					lowNonKey.push(stem.low[j][k]);
					stem.low[j][k].touched = true;
				} else {
					stem.low[j][k].dontTouch = true;
				}
			}
		}

		stem.highKey = highKey;
		stem.lowKey = lowKey;
		stem.highAlign = highNonKey;
		stem.lowAlign = lowNonKey;
		stem.highKey.isKeyPoint = true;
		stem.lowKey.isKeyPoint = true;
		stem.highKey.associatedStemSlope = stem.lowKey.associatedStemSlope = stem.slope;
	}
}
