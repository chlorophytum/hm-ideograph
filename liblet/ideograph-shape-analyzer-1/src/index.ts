import {
	CGlyph,
	combineHash,
	createGlyph,
	hashGlyphContours,
	IShapeAnalyzer
} from "@chlorophytum/ideograph-shape-analyzer-shared";
import * as fs from "fs";
import * as path from "path";

import analyzeGlyph from "./analyze";
import { GlyphAnalysis } from "./analyze/analysis";
import { createHintingStrategy, HintingStrategy } from "./strategy";

export { GlyphAnalysis } from "./analyze/analysis";
export * from "./analyze/stems/rel";
export * from "./si-common/stem-spatial";
export { createHintingStrategy, HintingStrategy } from "./strategy";
export { default as Stem } from "./types/stem";

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
export const ModelVersionPrefix = packageJson.name + "@" + packageJson.version;
export const IdeographShapeAnalyzer1: IShapeAnalyzer<HintingStrategy, CGlyph, GlyphAnalysis> = {
	getGlyphHash(glyph, params) {
		return combineHash(ModelVersionPrefix, JSON.stringify(params), hashGlyphContours(glyph));
	},
	analyzeGlyph,
	createGlyph,
	createHintingStrategy
};
