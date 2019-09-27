"use strict";

import { Contour } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { transitiveReduce } from "../../si-common/overlap";
import Radical, { ContourIsland } from "../../types/radical";

export default function analyzeRadicals(contours: Contour[]) {
	const inclusions: boolean[][] = [];
	const radicals: Radical[] = [];
	for (let j = 0; j < contours.length; j++) {
		inclusions[j] = [];
		contours[j].outline = true;
	}
	// Find out all inclusion relationships
	for (let j = 0; j < contours.length; j++) {
		for (let k = 0; k < contours.length; k++) {
			if (
				j !== k &&
				contours[j].ccw !== contours[k].ccw &&
				contours[j].includes(contours[k])
			) {
				inclusions[j][k] = true;
				contours[k].outline = false;
			}
		}
	}
	// Transitive reduction
	transitiveReduce(inclusions);
	// Figure out radicals
	for (let j = 0; j < contours.length; j++) {
		if (contours[j].outline)
			analyzeIsland(inclusions, contours, j, contours[j].ccw, null, radicals);
	}
	return glueRadicals(radicals);
}

function analyzeHole(
	inclusions: boolean[][],
	contours: Contour[],
	j: number,
	orient: boolean,
	parent: null | Radical,
	sink: Radical[]
) {
	for (let k = 0; k < contours.length; k++) {
		if (inclusions[j][k] && contours[k].ccw !== orient) {
			analyzeIsland(inclusions, contours, k, !orient, parent, sink);
		}
	}
}

function analyzeIsland(
	inclusions: boolean[][],
	contours: Contour[],
	j: number,
	orient: boolean,
	parent: null | Radical,
	sink: Radical[]
) {
	const island = new ContourIsland(contours[j]);
	const radical = new Radical(!parent, [island]);

	if (parent) parent.subs.push(radical);
	sink.push(radical);

	for (let k = 0; k < contours.length; k++) {
		if (inclusions[j][k] && contours[k].ccw !== orient) {
			island.holes.push(contours[k]);
			analyzeHole(inclusions, contours, k, !orient, radical, sink);
		}
	}
}

function glueRadicals(src: Radical[]) {
	const dt = new DisjointSet(src.length);
	for (let j = 0; j < src.length; j++) {
		if (!src[j].isTopLevel) continue;
		inner: for (let k = 0; k < src.length; k++) {
			if (j === k || !src[k].isTopLevel || src[j].outlineCcw !== src[k].outlineCcw) continue;
			for (const z of src[k].points()) {
				if (src[j].includes(z)) {
					dt.union(j, k);
					continue inner;
				}
			}
		}
	}

	const dst: Radical[] = [];
	for (let i = 0; i < src.length; i++) {
		const top = dt.query(i);
		if (top !== i) {
			for (const island of src[i].islands) src[top].islands.push(island);
			for (const sub of src[i].subs) src[top].subs.push(sub);
		} else {
			dst.push(src[i]);
		}
	}
	return dst;
}

class DisjointSet {
	private up: number[];
	constructor(size: number) {
		this.up = Array(size);
		for (let j = 0; j < size; j++) {
			this.up[j] = j;
		}
	}
	query(x: number): number {
		if (this.up[x] === x) return x;
		const u = this.query(this.up[x]);
		this.up[x] = u;
		return u;
	}
	union(x: number, y: number) {
		x = this.query(x);
		y = this.query(y);
		if (x === y) return;
		this.up[y] = x;
	}
}
