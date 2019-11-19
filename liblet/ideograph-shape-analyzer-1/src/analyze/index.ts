import { CGlyph } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintingStrategy } from "../strategy";

import { GlyphAnalysis } from "./analysis";
import analyzePostStemHints from "./post-stem";
import analyzeRadicals from "./radicals";
import analyzeStems from "./stems";

export default function analyzeGlyph(strategy: HintingStrategy, glyph: CGlyph) {
	const analysis = new GlyphAnalysis();
	analysis.radicals = analyzeRadicals(glyph.contours);
	analyzeStems(glyph, strategy, analysis);
	analyzePostStemHints(glyph, strategy, analysis);
	return analysis;
}
