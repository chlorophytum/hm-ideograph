"use strict";

import { Contour } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { transitiveReduce } from "../../si-common/overlap";
import Radical from "../../types/radical";

function inclusionToRadicals(
	inclusions: boolean[][],
	contours: Contour[],
	j: number,
	orient: boolean
) {
	if (orient) {
		// contours[j] is an inner contour
		// find out radicals inside it
		let radicals: Radical[] = [];
		for (let k = 0; k < contours.length; k++) {
			if (inclusions[j][k]) {
				if (contours[k].ccw !== orient) {
					radicals = radicals.concat(
						inclusionToRadicals(inclusions, contours, k, !orient)
					);
				}
			}
		}
		return radicals;
	} else {
		// contours[j] is an outer contour
		// find out its inner contours and radicals inside it
		const radical = new Radical(contours[j]);
		let radicals: Radical[] = [radical];
		for (let k = 0; k < contours.length; k++) {
			if (inclusions[j][k]) {
				if (contours[k].ccw !== orient) {
					radical.holes.push(contours[k]);
					const inner = inclusionToRadicals(inclusions, contours, k, !orient);
					radical.subs = inner;
					radicals = radicals.concat(inner);
				}
			}
		}
		return radicals;
	}
}

export default function analyzeRadicals(contours: Contour[]) {
	const inclusions: boolean[][] = [];
	let radicals: Radical[] = [];
	for (let j = 0; j < contours.length; j++) {
		inclusions[j] = [];
		contours[j].outline = true;
	}
	// Find out all inclusion relationships
	for (let j = 0; j < contours.length; j++) {
		for (let k = 0; k < contours.length; k++) {
			if (j !== k && contours[j].includes(contours[k])) {
				inclusions[j][k] = true;
				contours[k].outline = false;
			}
		}
	}
	// Transitive reduction
	transitiveReduce(inclusions);
	// Figure out radicals
	for (let j = 0; j < contours.length; j++) {
		if (contours[j].outline) {
			radicals = radicals.concat(
				inclusionToRadicals(inclusions, contours, j, contours[j].ccw)
			);
		}
	}
	return radicals;
}
