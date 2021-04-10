import { Glyph, IFontSource, IHint, IHintFactory } from "@chlorophytum/arch";

export interface IShapeAnalyzer<S, G, A> {
	createHintingStrategy<GID>(font: IFontSource<GID>, ptParams: Partial<S>): Promise<S>;
	fetchGeometry<GID>(font: IFontSource<GID>, params: S, gid: GID): Promise<Glyph.Shape>;
	analyzeGlyph(strategy: S, glyph: G): A;
	getGlyphHash(glyph: G, strategy: S): string;
	createGlyph(input: Glyph.Geom, params: S): G;
}

export interface IHintGen<S, G, A> {
	generateSharedHints(strategy: S): IHint;
	generateGlyphHints(strategy: S, glyph: G, analysis: A): IHint;
	readonly factoriesOfUsedHints: ReadonlyArray<IHintFactory>;
}
