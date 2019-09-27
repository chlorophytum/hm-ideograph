import {
	IArbitratorProxy,
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
	private readonly params: HintingStrategy;
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
		const ga = new EffectiveGlyphAnalysisTask(this.font, this.params);
		const glyphs = await arb.demand(ga);
		const perGlyphHinting = Array.from(glyphs).map(gid =>
			arb.demand(new GlyphHintTask(this.font, this.params, this.ee, gid))
		);
		await Promise.all(perGlyphHinting);
		await arb.demand(new SharedHintTask(this.params, this.ee));
	}
}
