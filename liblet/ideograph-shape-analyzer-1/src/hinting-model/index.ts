import {
	IArbitratorProxy,
	IFontEntry,
	IFontSource,
	IHintingModel,
	IHintingModelExecEnv,
	ITask
} from "@chlorophytum/arch";

import { createHintingStrategy, HintingStrategy } from "../strategy";

import { EffectiveGlyphAnalysisTask } from "./effective-glyph-analysis";
import { GlyphHintTask } from "./glyph-hint";
import { SharedHintTask } from "./shared-hint";

export class IdeographHintingModel1<GID> implements IHintingModel {
	protected params: HintingStrategy;
	constructor(private readonly font: IFontSource<GID>, ptParams: Partial<HintingStrategy>) {
		this.params = createHintingStrategy(font.metadata.upm, ptParams);
	}
	public readonly type = "Chlorophytum::IdeographHintingModel1";
	public readonly allowParallel = false;

	public getHintingTask(ee: IHintingModelExecEnv) {
		return new IdeographHintingTask(this.font, this.params, ee);
	}
}

export class IdeographHintingTask<GID> implements ITask<void> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly params: HintingStrategy,
		private readonly ee: IHintingModelExecEnv
	) {}

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
			arb.demand(new GlyphHintTask(this.font, this.params, this.ee, gid))
		);
		await Promise.all(perGlyphHinting);

		// Do shared hinting
		await arb.demand(new SharedHintTask(this.params, this.ee));
	}
}
