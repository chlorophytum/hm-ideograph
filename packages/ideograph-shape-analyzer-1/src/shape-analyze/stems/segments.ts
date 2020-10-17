import { AdjPoint, Contour } from "@chlorophytum/ideograph-shape-analyzer-shared";
import { HintingStrategy } from "../../strategy";
import Radical from "../../types/radical";
import { SegSpan } from "../../types/seg";

export default function findHorizontalSegments(radicals: Radical[], strategy: HintingStrategy) {
	for (const radical of radicals) {
		const radicalParts = [radical.outline].concat(radical.holes);
		let segments: SegSpan[] = [];
		for (let j = 0; j < radicalParts.length; j++) {
			const coupled = new Set<AdjPoint>();
			findHSegInContour2(segments, radicalParts[j], strategy, coupled);
			findHTangents(segments, radicalParts[j], strategy, coupled);
		}
		radical.segments = segments.sort((p, q) => p[0].x - q[0].x);
	}
}

type SlopeOperator = (z1: AdjPoint, z2: AdjPoint, strategy: HintingStrategy) => boolean;

function approSlope(z2: AdjPoint, z1: AdjPoint, strategy: HintingStrategy) {
	if (z1.nextZ && z2.prevZ && z1.nextZ !== z2) {
		return approSlopeImpl(z1, z1.nextZ, strategy) && approSlopeImpl(z2.prevZ, z2, strategy);
	} else {
		return approSlopeImpl(z1, z2, strategy);
	}
}

function eqSlopeA(z2: AdjPoint, z1: AdjPoint, _strategy: HintingStrategy) {
	return z1.y === z2.y && z1.isCorner() === z2.isCorner();
}

function approSlopeA(z1: AdjPoint, z2: AdjPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return (
		Math.abs(z2.x - z1.x) >= strategy.Y_FUZZ * strategy.UPM * 2 &&
		(slope >= 0 ? slope <= strategy.SLOPE_FUZZ : slope >= -strategy.SLOPE_FUZZ_NEG)
	);
}

function approSlopeT(z2: AdjPoint, z1: AdjPoint, strategy: HintingStrategy) {
	if (z1.nextZ && z2.prevZ && z1.nextZ !== z2) {
		return (
			(approSlopeImpl(z1, z1.nextZ, strategy) && approSlopeTImpl(z2.prevZ, z2, strategy)) ||
			(approSlopeTImpl(z1, z1.nextZ, strategy) && approSlopeImpl(z2.prevZ, z2, strategy))
		);
	} else {
		return approSlopeTImpl(z1, z2, strategy);
	}
}
function approSlopeTImpl(z2: AdjPoint, z1: AdjPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return slope >= 0 ? slope <= strategy.SLOPE_FUZZ_POST : slope >= -strategy.SLOPE_FUZZ_NEG;
}
function approSlopeImpl(z2: AdjPoint, z1: AdjPoint, strategy: HintingStrategy) {
	const slope = (z1.y - z2.y) / (z1.x - z2.x);
	return slope >= 0 ? slope <= strategy.SLOPE_FUZZ_POS : slope >= -strategy.SLOPE_FUZZ_NEG;
}

function tryPushSegment(
	s: SegSpan,
	ss: SegSpan[],
	approSlopeA: SlopeOperator,
	coupled: Set<AdjPoint>,
	strategy: HintingStrategy
) {
	while (s.length > 1) {
		if (approSlopeSegmentT(s, approSlopeA, strategy)) {
			let s1 = [s[0]];
			for (let k = 1; k < s.length; k++) linkSegment(s1, s[k]);
			for (let z of s1) coupled.add(z);
			ss.push(s1);
			return;
		} else {
			s.shift();
		}
	}
}
function approSlopeSegmentT(s: SegSpan, approSlopeA: SlopeOperator, strategy: HintingStrategy) {
	return s.length > 2
		? approSlopeA(s[0], s[s.length - 2], strategy) ||
				approSlopeA(s[1], s[s.length - 1], strategy)
		: approSlopeA(s[0], s[s.length - 1], strategy);
}

const SEGMENT_STRATEGIES: [SlopeOperator, SlopeOperator, SlopeOperator][] = [
	[eqSlopeA, eqSlopeA, eqSlopeA],
	[approSlope, approSlopeT, approSlopeA]
];

function findStart(contour: Contour) {
	let m: null | AdjPoint = null;
	for (const z of contour.points) if (z.queryReference()) if (!m || z.x < m.x) m = z;
	return m;
}
function linkSegment(segment: AdjPoint[], z: AdjPoint) {
	const last = segment[segment.length - 1];
	let subject = last.nextZ;
	while (subject && subject !== z && subject !== last) {
		segment.push(subject);
		subject = subject.nextZ;
	}
	segment.push(z);
}
function findHSegInContour2(
	segments: SegSpan[],
	contour: Contour,
	strategy: HintingStrategy,
	coupled: Set<AdjPoint>
) {
	let zStart = findStart(contour);
	if (!zStart) return;

	let zLast: AdjPoint = zStart;
	let segment: AdjPoint[] = [zLast];

	function restart(z: AdjPoint) {
		zLast = z;
		segment = [zLast];
	}

	for (let [as1, as1t, as2] of SEGMENT_STRATEGIES) {
		let tores = false;
		restart(zStart);
		let z = zLast.next;
		while (z && z !== zStart) {
			if (tores || !z.queryReference() || coupled.has(zLast)) {
				restart(z);
				tores = false;
			} else if (!coupled.has(z) && as1t(z, zLast, strategy)) {
				segment.push(z);
				if (segment.length > 2 && !as1(z, zLast, strategy)) {
					tryPushSegment(segment, segments, as2, coupled, strategy);
					tores = true;
				} else {
					zLast = z;
					tores = false;
				}
			} else {
				tryPushSegment(segment, segments, as2, coupled, strategy);
				restart(z);
				tores = false;
			}
			z = z.next;
		}

		if (z && !coupled.has(z) && as1t(z, zLast, strategy)) {
			if (segments[0] && segments[0][0] === z) {
				const firstSeg = [...segment, ...segments[0]];
				segment.shift();
				tryPushSegment(firstSeg, segments, as2, coupled, strategy);
				segment = [z];
			} else {
				segment.push(z);
			}
		}
		tryPushSegment(segment, segments, as2, coupled, strategy);
	}
}

function findHTangents(
	segments: SegSpan[],
	contour: Contour,
	strategy: HintingStrategy,
	coupled: Set<AdjPoint>
) {
	for (const z of contour.points) {
		if (
			z.queryReference() &&
			z.prevZ &&
			z.nextZ &&
			!coupled.has(z) &&
			!coupled.has(z.prevZ) &&
			!coupled.has(z.nextZ) &&
			!z.prevZ.queryReference() &&
			!z.nextZ.queryReference()
		) {
			if (approSlopeImpl(z.prevZ, z, strategy) && approSlopeImpl(z.nextZ, z, strategy)) {
				segments.push([z.prevZ, z, z.nextZ]);
				coupled.add(z);
			}
		}
		if (
			z.queryReference() &&
			z.prevZ &&
			!coupled.has(z) &&
			!coupled.has(z.prevZ) &&
			!z.prevZ.queryReference()
		) {
			if (approSlopeImpl(z.prevZ, z, strategy)) {
				segments.push([z.prevZ, z]);
				coupled.add(z);
			}
		}
		if (
			z.queryReference() &&
			z.nextZ &&
			!coupled.has(z) &&
			!coupled.has(z.nextZ) &&
			!z.nextZ.queryReference()
		) {
			if (approSlopeImpl(z.nextZ, z, strategy)) {
				segments.push([z, z.nextZ]);
				coupled.add(z);
			}
		}
	}
}
