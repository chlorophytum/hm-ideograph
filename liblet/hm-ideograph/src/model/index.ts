import { IArbitratorProxy, IFontSource, IHintingModelExecEnv, ITask } from "@chlorophytum/arch";
import {
	IdeographHintingParams,
	IHintGen,
	IShapeAnalyzer
} from "@chlorophytum/ideograph-shape-analyzer-shared";

import { EffectiveGlyphAnalysisTask } from "./effective-glyph-analysis";
import { GlyphHintTask } from "./glyph-hint";
import { SharedHintTask } from "./shared-hint";

export class IdeographHintingTask<GID, G, S extends IdeographHintingParams, A>
	implements ITask<void> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly analyzer: IShapeAnalyzer<S, G, A>,
		private readonly codeGen: IHintGen<S, G, A>,
		ptParams: Partial<S>,
		private readonly ee: IHintingModelExecEnv
	) {
		this.params = this.analyzer.createHintingStrategy(font.metadata.upm, ptParams);
	}

	public readonly params: S;

	public async execute(arb: IArbitratorProxy) {
		// Collect entries from the font source
		const entries = await this.font.getEntries();

		// Collect effective glyphs and the first EHR associated to it
		let glyphs: Set<GID> = new Set();
		for (const entry of entries) {
			const ga = new EffectiveGlyphAnalysisTask(entry, this.params);
			const gs = await arb.demand(ga);
			for (const g of gs) glyphs.add(g);
		}

		// Do per-glyph hinting
		const perGlyphHinting = Array.from(glyphs).map(gid =>
			arb.demand(
				new GlyphHintTask(this.font, this.analyzer, this.codeGen, this.params, this.ee, gid)
			)
		);
		await Promise.all(perGlyphHinting);

		// Do shared hinting
		await arb.demand(new SharedHintTask(this.codeGen, this.params, this.ee));
	}
}
