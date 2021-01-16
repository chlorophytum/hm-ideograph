import * as fs from "fs";
import * as path from "path";

import {
	CGlyph,
	combineHash,
	createGlyph,
	hashGlyphContours,
	IShapeAnalyzer
} from "@chlorophytum/ideograph-shape-analyzer-shared";

import analyzeGlyph from "./hint-analyze";
import { HintAnalysis } from "./hint-analyze/type";
import { createHintingStrategy, HintingStrategy } from "./strategy";

export { HintAnalysis } from "./hint-analyze/type";
export { createHintingStrategy, HintingStrategy } from "./strategy";
export { default as Stem } from "./types/stem";

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
export const ModelVersionPrefix = packageJson.name + "@" + packageJson.version;
export const IdeographShapeAnalyzer1: IShapeAnalyzer<
	HintingStrategy,
	CGlyph,
	HintAnalysis.Result
> = {
	getGlyphHash(glyph, params) {
		return combineHash(ModelVersionPrefix, JSON.stringify(params), hashGlyphContours(glyph));
	},
	analyzeGlyph,
	createGlyph,
	createHintingStrategy
};
