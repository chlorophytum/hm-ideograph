/* eslint-disable complexity */
import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { findHighLowKeys } from "../../si-common/hlkey";
import { leftmostZ_SS_Ref, rightmostZ_SS_Ref } from "../../si-common/seg";
import { HintingStrategy } from "../../strategy";
import { PostHint } from "../../types/post-hint";
import { Seg } from "../../types/seg";
import Stem from "../../types/stem";

export function splitDiagonalStems(ss: Stem[], strategy: HintingStrategy) {
	const ans: Stem[] = [];
	let rid = 1;
	for (const s of ss) {
		splitDiagonalStem(s, strategy, rid, ans);
		rid += 1;
	}
	return ans;
}

function splitDiagonalStem(s: Stem, strategy: HintingStrategy, rid: number, results: Stem[]) {
	const hl = leftmostZ_SS_Ref(s.high);
	const ll = leftmostZ_SS_Ref(s.low);
	const hr = rightmostZ_SS_Ref(s.high);
	const lr = rightmostZ_SS_Ref(s.low);
	if (!hl || !hr || !ll || !lr) return;
	if (
		shouldSplit(hl, ll, hr, lr, strategy) &&
		contained(ll, lr, s.low, strategy.Y_FUZZ * strategy.UPM) &&
		contained(hl, hr, s.high, strategy.Y_FUZZ * strategy.UPM)
	) {
		const hmx = (hl.x + hr.x) / 2;
		const lmx = (ll.x + lr.x) / 2;
		const hmy = (hl.y + hr.y) / 2;
		const lmy = (ll.y + lr.y) / 2;
		const sLeft = new Stem(
			[[hl, new CPoint(hmx - 1, hmy)]],
			[[ll, new CPoint(lmx - 1, lmy)]],
			s.belongRadical
		);
		sLeft.atLeft = true;
		sLeft.rid = rid;
		const sRight = new Stem(
			[[new CPoint(hmx + 1, hmy), hr]],
			[[new CPoint(lmx + 1, lmy), lr]],
			s.belongRadical
		);
		sRight.atRight = true;
		sRight.rid = rid;
		if (hl.y > hr.y) {
			sLeft.diagHigh = true;
			sRight.diagLow = true;
		} else {
			sRight.diagHigh = true;
			sLeft.diagLow = true;
		}
		addIp(s, sLeft, sRight);
		sLeft.linkedWholeStem = sRight.linkedWholeStem = s;
		results.push(sLeft, sRight);
	} else {
		results.push(s);
	}
}

function shouldSplit(
	hl: AdjPoint,
	ll: AdjPoint,
	hr: AdjPoint,
	lr: AdjPoint,
	strategy: HintingStrategy
) {
	if (hl === hr || ll === lr) return false;
	if (hl.y === hr.y || ll.y === lr.y) return false;
	if (
		(hl.isCorner() && ll.isCorner() && !hr.isCorner() && !lr.isCorner()) ||
		(!hl.isCorner() && !ll.isCorner() && hr.isCorner() && lr.isCorner())
	) {
		if (CPoint.adjacentZ(hl, hr) && CPoint.adjacentZ(ll, lr)) return false;
	}

	return (
		Math.abs(hr.y - hl.y) >= Math.abs(hr.x - hl.x) * strategy.SLOPE_FUZZ_R &&
		Math.abs(lr.y - ll.y) >= Math.abs(lr.x - ll.x) * strategy.SLOPE_FUZZ_R &&
		Math.abs(Math.min(hl.x, ll.x) - Math.max(hr.x, lr.x)) >=
			2 * Math.max(Math.abs(hl.y - ll.y), Math.abs(hr.y - lr.y)) &&
		Math.abs(Math.max(hl.x, ll.x) - Math.min(hr.x, lr.x)) >=
			Math.max(Math.abs(hl.y - ll.y), Math.abs(hr.y - lr.y)) &&
		Math.abs(hl.x - ll.x) * 2.25 < Math.max(Math.abs(hl.x - hr.x), Math.abs(ll.x - lr.x)) &&
		Math.abs(hr.x - lr.x) * 2.25 < Math.max(Math.abs(hl.x - hr.x), Math.abs(ll.x - lr.x)) &&
		(Math.abs(hl.y - hr.y) >= strategy.Y_FUZZ_DIAG * strategy.UPM ||
			Math.abs(ll.y - lr.y) >= strategy.Y_FUZZ_DIAG * strategy.UPM)
	);
}

function contained(z1: Geometry.Point, z2: Geometry.Point, segments: Seg, fuzz: number) {
	for (const seg of segments) {
		for (const z of seg) {
			if (
				(z.y > z1.y + fuzz && z.y > z2.y + fuzz) ||
				(z.y < z1.y - fuzz && z.y < z2.y - fuzz)
			) {
				return false;
			}
		}
	}
	return true;
}

function addIp(s: Stem, sLeft: Stem, sRight: Stem) {
	const hlkLeft = findHighLowKeys(sLeft);
	const hlkRight = findHighLowKeys(sRight);
	// intermediate knots
	const ipHigh: PostHint[] = [];
	const ipLow: PostHint[] = [];
	for (const sg of s.high) {
		for (const z of [sg[0], sg[sg.length - 1]]) {
			if (!z.queryReference()) continue;
			if (z === hlkLeft.highKey || z === hlkRight.highKey) continue;
			ipHigh.push([hlkLeft.highKey, hlkRight.highKey, z]);
		}
	}
	for (const sg of s.low) {
		for (const z of [sg[0], sg[sg.length - 1]]) {
			if (!z.queryReference()) continue;
			if (z === hlkLeft.lowKey || z === hlkRight.lowKey) continue;
			ipLow.push([hlkLeft.lowKey, hlkRight.lowKey, z]);
		}
	}
	sLeft.ipHigh = ipHigh;
	sLeft.ipLow = ipLow;
}
