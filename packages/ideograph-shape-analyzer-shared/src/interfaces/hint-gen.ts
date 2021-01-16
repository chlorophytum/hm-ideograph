import { Glyph, IHint, IHintFactory } from "@chlorophytum/arch";

export interface IShapeAnalyzer<S, G, A> {
	createHintingStrategy(upm: number, ptParams: Partial<S>): S;
	analyzeGlyph(strategy: S, glyph: G): A;
	getGlyphHash(glyph: G, strategy: S): string;
	createGlyph(input: Glyph.Geom): G;
}

export interface IHintGen<S, G, A> {
	generateSharedHints(strategy: S): IHint;
	generateGlyphHints(strategy: S, glyph: G, analysis: A): IHint;
	readonly factoriesOfUsedHints: ReadonlyArray<IHintFactory>;
}
