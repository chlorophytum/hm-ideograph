import { HintingStrategy } from "../strategy";
import CGlyph from "../types/glyph";

import { GlyphAnalysis } from "./analysis";
import analyzePostStemHints from "./post-stem";
import analyzeRadicals from "./radicals";
import analyzeStems from "./stems";

export default function analyzeGlyph(glyph: CGlyph, strategy: HintingStrategy) {
	const analysis = new GlyphAnalysis();
	analysis.radicals = analyzeRadicals(glyph.contours);
	analyzeStems(glyph, strategy, analysis);
	analyzePostStemHints(glyph, strategy, analysis);
	return analysis;
}
