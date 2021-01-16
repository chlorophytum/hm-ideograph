import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxShared, EmBoxStroke, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";
import { HintAnalysis, HintingStrategy } from "@chlorophytum/ideograph-shape-analyzer-1";
import { CGlyph, IHintGen } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { GlyphHintGenBackEnd } from "./glyph-back-end";
import { generateSharedHints } from "./shared-hints";

export const IdeographHintGenerator1: IHintGen<HintingStrategy, CGlyph, HintAnalysis.Result> = {
	generateGlyphHints(params, glyph, analysis) {
		const sink = new GlyphHintGenBackEnd(params);
		return sink.process(analysis);
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
