import { CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../../strategy";
import { ShapeAnalysisResult } from "../analysis";

import analyzeBlueZonePoints from "./blue-zone-points";
import AnalyzeIpSa from "./ipsa";
import analyzeSymmetry from "./symmetry";

export default function analyzePostStemHints(
	glyph: CGlyph,
	strategy: HintingStrategy,
	analysis: ShapeAnalysisResult
) {
	const bz = analyzeBlueZonePoints(glyph, analysis.stems, strategy);
	analysis.blueZone.bottomZs = bz.bottomBluePoints;
	analysis.blueZone.topZs = bz.topBluePoints;
	analysis.nonBlueTopBottom.bottomZs = bz.glyphBottomMostPoint;
	analysis.nonBlueTopBottom.topZs = bz.glyphTopMostPoint;
	const iss = AnalyzeIpSa(glyph, analysis, strategy);
	analysis.interpolations = iss.interpolations;
	analysis.shortAbsorptions = iss.shortAbsorptions;
	analysis.symmetry = analyzeSymmetry(analysis.stems, analysis.directOverlaps, strategy);
}
