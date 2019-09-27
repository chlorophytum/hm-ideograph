import { Geometry, Support } from "@chlorophytum/arch";
import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import Stem from "../types/stem";

import { minMaxOfSeg, slopeOf } from "./seg";

function keyPointPriority(
	incoming: Geometry.Point,
	current: Geometry.Point,
	atl?: boolean,
	atr?: boolean
) {
	if (atl) {
		return incoming.x < current.x;
	} else if (atr) {
		return incoming.x > current.x;
	} else {
		if (current.y === incoming.y) {
			return incoming.x < current.x;
		} else {
			return incoming.y < current.y;
		}
	}
}

// eslint-disable-next-line complexity
export function findHighLowKeys(s: Stem) {
	let highKey: AdjPoint | null = null,
		lowKey: AdjPoint | null = null;

	const mmHigh = minMaxOfSeg(s.high);
	const mmLow = minMaxOfSeg(s.low);

	const atLeft =
		s.atLeft ||
		mmHigh.max < Support.mix(mmLow.min, mmLow.max, 2 / 3) ||
		mmLow.max < Support.mix(mmHigh.min, mmHigh.max, 2 / 3);
	const atRight =
		s.atRight ||
		mmHigh.min > Support.mix(mmLow.min, mmLow.max, 1 / 3) ||
		mmLow.min > Support.mix(mmHigh.min, mmHigh.max, 1 / 3);

	for (let j = 0; j < s.high.length; j++) {
		for (let k = 0; k < s.high[j].length; k++) {
			if (!s.high[j][k].queryReference()) continue;
			if (!highKey || keyPointPriority(s.high[j][k], highKey, atLeft, atRight)) {
				highKey = s.high[j][k];
			}
		}
	}
	for (let j = 0; j < s.low.length; j++) {
		for (let k = 0; k < s.low[j].length; k++) {
			if (!s.low[j][k].queryReference()) continue;
			if (!lowKey || keyPointPriority(s.low[j][k], lowKey, atLeft, atRight)) {
				lowKey = s.low[j][k];
			}
		}
	}
	if (!highKey || !lowKey) {
		console.error(s);
		throw new Error("Stem built with irregular geometry.");
	}
	return { highKey: highKey!, lowKey: lowKey! };
}

export function correctYWForStem(s: Stem) {
	const slope = (slopeOf(s.high) + slopeOf(s.low)) / 2;
	const { highKey, lowKey } = findHighLowKeys(s);
	s.highKey = highKey;
	s.lowKey = lowKey;
	s.slope = slope;
	s.y = highKey.y;
	s.width = highKey.y - lowKey.y + (lowKey.x - highKey.x) * slope;
	return { highKey, lowKey, slope };
}
