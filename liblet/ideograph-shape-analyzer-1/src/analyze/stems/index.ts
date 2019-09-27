import { stemOverlapLength, stemOverlapRatio } from "../../si-common/overlap";
import { HintingStrategy } from "../../strategy";
import CGlyph from "../../types/glyph";
import Stem from "../../types/stem";
import { GlyphAnalysis } from "../analysis";

import { computeACSMatrices, computePQMatrices } from "./annex-matrix";
import { analyzeDirectOverlaps } from "./direct-overlap";
import { analyzeEntireContourAboveBelow, analyzeStemSpatialRelationships } from "./rel";
import { analyzeStemKeyPoints } from "./stem-keypoint";
import findStems from "./stems";
import { analyzeSquash, analyzeTurns } from "./turn";

function OverlapMatrix(stems: Stem[], fn: (a: Stem, b: Stem) => number) {
	let transitions: number[][] = [];
	for (let j = 0; j < stems.length; j++) {
		transitions[j] = [];
		for (let k = 0; k < stems.length; k++) {
			transitions[j][k] = fn(stems[j], stems[k]);
		}
	}
	return transitions;
}

function updateProximity(stems: Stem[], dov: boolean[][], P: number[][], F: number[][]) {
	for (let js = 0; js < stems.length; js++) {
		let promUp = 0;
		let promDown = 0;
		for (let j = 0; j < stems.length; j++) {
			if (dov[j][js]) promUp += P[j][js] + F[j][js];
			if (dov[js][j]) promDown += P[js][j] + F[js][j];
		}
		stems[js].proximityUp = promUp;
		stems[js].proximityDown = promDown;
	}
}

export default function analyzeStems(
	glyph: CGlyph,
	strategy: HintingStrategy,
	analysis: GlyphAnalysis
) {
	const radicals = analysis.radicals;
	const stems = findStems(radicals, strategy);

	// There are two overlapping matrices are being used: one "minimal" and one "canonical".
	// The minimal one is ued for collision matrices calculation, and the canonical one is
	// used for spatial relationship detection
	const stemOverlaps = OverlapMatrix(stems, (p, q) => stemOverlapRatio(p, q, Math.min));
	const stemOverlapLengths = OverlapMatrix(
		stems,
		(p, q) => stemOverlapLength(p, q) / strategy.UPM
	);
	analyzeStemSpatialRelationships(stems, radicals, stemOverlaps, strategy);
	analyzeEntireContourAboveBelow(glyph, stems);
	const F = analyzeTurns(glyph, strategy, stems);
	const S = analyzeSquash(glyph, strategy, stems);
	const { P, Q } = computePQMatrices(strategy, stems, F);
	// We need to calculate ProximityUp and ProximityDown
	// so computeACS would be ran TWICE
	const collisionMatrices = computeACSMatrices(
		strategy,
		stems,
		stemOverlaps,
		stemOverlapLengths,
		Q,
		F,
		S
	);
	const directOverlaps = analyzeDirectOverlaps(
		stems,
		stemOverlaps,
		collisionMatrices.darkness,
		strategy,
		true
	);
	updateProximity(stems, directOverlaps, P, F);
	const collisionMatrices1 = computeACSMatrices(
		strategy,
		stems,
		stemOverlaps,
		stemOverlapLengths,
		Q,
		F,
		S,
		directOverlaps
	);

	analyzeStemKeyPoints(stems);

	analysis.radicals = radicals;
	analysis.stems = stems;
	analysis.stemOverlaps = stemOverlaps;
	analysis.stemOverlapLengths = stemOverlapLengths;
	analysis.directOverlaps = directOverlaps;
	analysis.collisionMatrices.annexation = collisionMatrices1.annexation;
	analysis.collisionMatrices.darkness = collisionMatrices1.darkness;
	analysis.collisionMatrices.flips = collisionMatrices1.flips;
	analysis.collisionMatrices.proximity = P;
	analysis.collisionMatrices.spatialProximity = Q;
}
