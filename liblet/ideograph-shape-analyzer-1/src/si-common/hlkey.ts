import { Geometry } from "@chlorophytum/arch";
import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import Stem from "../types/stem";

import { slopeOf } from "./seg";

function keyPointPriority(
	incoming: Geometry.Point,
	current: Geometry.Point,
	atl?: boolean,
	atr?: boolean
) {
	if (atr) {
		return current.x < incoming.x;
	} else if (atl) {
		return current.x > incoming.x;
	} else {
		if (current.y === incoming.y) {
			return current.x > incoming.x;
		} else {
			return current.y > incoming.y;
		}
	}
}

export function findHighLowKeys(s: Stem) {
	let highKey: AdjPoint | null = null,
		lowKey: AdjPoint | null = null;

	for (let j = 0; j < s.high.length; j++) {
		for (let k = 0; k < s.high[j].length; k++) {
			if (
				!highKey ||
				(s.high[j][k].id >= 0 &&
					keyPointPriority(s.high[j][k], highKey, s.atLeft, s.atRight))
			) {
				highKey = s.high[j][k];
			}
		}
	}
	for (let j = 0; j < s.low.length; j++) {
		for (let k = 0; k < s.low[j].length; k++) {
			if (
				!lowKey ||
				(s.low[j][k].id >= 0 && keyPointPriority(s.low[j][k], lowKey, s.atLeft, s.atRight))
			) {
				lowKey = s.low[j][k];
			}
		}
	}
	return { highKey: highKey!, lowKey: lowKey! };
}

export function correctYWForStem(s: Stem) {
	const slope = (slopeOf(s.high) + slopeOf(s.low)) / 2;
	let { highKey, lowKey } = findHighLowKeys(s);
	s.highKey = highKey;
	s.lowKey = lowKey;
	s.slope = slope;
	s.y = highKey.y;
	s.width = highKey.y - lowKey.y + (lowKey.x - highKey.x) * slope;
	return { highKey, lowKey, slope };
}
