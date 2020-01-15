import { Geometry } from "@chlorophytum/arch";
import { AdjPoint, Contour, CPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import { SegSpan } from "../../types/seg";

type SlopeOperator = (
	z1: Geometry.GlyphPoint,
	z2: Geometry.GlyphPoint,
	strategy: HintingStrategy
) => boolean;

function approSlope(z1: Geometry.GlyphPoint, z2: Geometry.GlyphPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return slope >= 0 ? slope <= strategy.SLOPE_FUZZ_POS : slope >= -strategy.SLOPE_FUZZ_NEG;
}

function eqSlopeA(z1: Geometry.GlyphPoint, z2: Geometry.GlyphPoint, _strategy: HintingStrategy) {
	return z1.y === z2.y && ((z1.on && z2.on) || (!z1.on && !z2.on));
}

function approSlopeA(z1: Geometry.GlyphPoint, z2: Geometry.GlyphPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return (
		Math.abs(z2.x - z1.x) >= strategy.Y_FUZZ * strategy.UPM * 2 &&
		(slope >= 0 ? slope <= strategy.SLOPE_FUZZ : slope >= -strategy.SLOPE_FUZZ_NEG)
	);
}

function approSlopeT(z1: Geometry.GlyphPoint, z2: Geometry.GlyphPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return slope >= 0 ? slope <= strategy.SLOPE_FUZZ_POST : slope >= -strategy.SLOPE_FUZZ_NEG;
}

function tryPushSegment(
	s: SegSpan,
	ss: SegSpan[],
	approSlopeA: SlopeOperator,
	coupled: Set<AdjPoint>,
	strategy: HintingStrategy
) {
	while (s.length > 1) {
		if (approSlopeA(s[0], s[s.length - 1], strategy)) {
			for (let z of s) coupled.add(z);
			ss.push(s);
			return;
		} else {
			s.shift();
		}
	}
}

const SEGMENT_STRATEGIES: [SlopeOperator, SlopeOperator, SlopeOperator][] = [
	[eqSlopeA, eqSlopeA, eqSlopeA],
	[approSlope, approSlopeT, approSlopeA]
];

function findHSegInContour(segments: SegSpan[], contour: Contour, strategy: HintingStrategy) {
	function restart(z: CPoint) {
		lastPoint = z;
		segment = [lastPoint];
	}
	let coupled: Set<AdjPoint> = new Set();
	let z0 = contour.points[0];
	let lastPoint = z0;
	let segment = [lastPoint];
	for (let [as1, as1t, as2] of SEGMENT_STRATEGIES) {
		restart(z0);
		let tores = false;
		for (let k = 1; k < contour.points.length - 1; k++) {
			const z = contour.points[k];
			if (tores || !z.references || coupled.has(lastPoint)) {
				restart(z);
				tores = false;
			} else if (!coupled.has(z) && as1t(z, lastPoint, strategy)) {
				segment.push(z);
				if (segment.length > 2 && !as1(z, lastPoint, strategy)) {
					tryPushSegment(segment, segments, as2, coupled, strategy);
					tores = true;
				} else {
					lastPoint = z;
					tores = false;
				}
			} else {
				tryPushSegment(segment, segments, as2, coupled, strategy);
				restart(z);
				tores = false;
			}
		}
		if (!coupled.has(z0) && as1(z0, lastPoint, strategy)) {
			if (segments[0] && segments[0][0] === z0) {
				const firstSeg = [...segment, ...segments[0]];
				segment.shift();
				tryPushSegment(firstSeg, segments, as2, coupled, strategy);
				segment = [z0];
			} else {
				segment.push(z0);
			}
		}
		tryPushSegment(segment, segments, as2, coupled, strategy);
	}
}

// Stem finding
export default function findHorizontalSegments(radicals: Radical[], strategy: HintingStrategy) {
	for (const radical of radicals) {
		let segments: SegSpan[] = [];
		let radicalParts = [radical.outline].concat(radical.holes);
		for (let j = 0; j < radicalParts.length; j++) {
			findHSegInContour(segments, radicalParts[j], strategy);
		}
		radical.segments = segments.sort(function(p, q) {
			return p[0].x - q[0].x;
		});
	}
}
