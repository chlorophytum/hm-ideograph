import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxShared, EmBoxStroke, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";
import { GlyphAnalysis, HintingStrategy } from "@chlorophytum/ideograph-shape-analyzer-1";
import { CGlyph, IHintGen } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { GlyphHintGenBackEnd } from "./glyph-back-end";
import GlyphHintGenFrontEnd from "./glyph-front-end";
import { generateSharedHints } from "./shared-hints";

export const IdeographHintGenerator1: IHintGen<HintingStrategy, CGlyph, GlyphAnalysis> = {
	generateGlyphHints(params, glyph, analysis) {
		const sink = new GlyphHintGenBackEnd(params);
		const ha = new GlyphHintGenFrontEnd(analysis, params);
		ha.pre(sink);
		do {
			ha.fetch(sink);
		} while (ha.lastPathWeight && ha.loops < 256);
		ha.post(sink);
		return sink.getHint();
	},
	generateSharedHints,
	factoriesOfUsedHints: [
		new Sequence.Factory(),
		new WithDirection.HintFactory(),
		new MultipleAlignZone.HintFactory(),
		new LinkChain.HintFactory(),
		new Interpolate.HintFactory(),
		new EmBoxStroke.HintFactory(),
		new EmBoxEdge.HintFactory(),
		new UseEmBox.HintFactory(),
		new EmBoxShared.HintFactory(),
		new Smooth.HintFactory()
	]
};
