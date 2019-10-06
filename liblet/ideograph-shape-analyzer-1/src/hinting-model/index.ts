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
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ptParams: Partial<HintingStrategy>
	) {}
	public readonly type = "Chlorophytum::IdeographHintingModel1";
	public readonly allowParallel = false;

	public getHintingTask(ee: IHintingModelExecEnv) {
		return new IdeographHintingTask(this.font, this.ptParams, ee);
	}
}

interface EntryHintRecord<GID> {
	entry: IFontEntry<GID>;
	parameter: HintingStrategy;
}

export class IdeographHintingTask<GID> implements ITask<void> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ptParams: Partial<HintingStrategy>,
		private readonly ee: IHintingModelExecEnv
	) {}

	public async execute(arb: IArbitratorProxy) {
		// Collect entries from the font source
		const entries = await this.font.getEntries();
		const ehRecords: EntryHintRecord<GID>[] = [];
		for (const entry of entries) {
			const param = createHintingStrategy(entry.metadata.upm, this.ptParams);
			ehRecords.push({ entry, parameter: param });
		}

		// Collect effective glyphs and the first EHR associated to it
		let glyphs: Map<GID, EntryHintRecord<GID>> = new Map();
		for (const er of ehRecords) {
			const ga = new EffectiveGlyphAnalysisTask(er.entry, er.parameter);
			const gs = await arb.demand(ga);
			for (const g of gs) if (!glyphs.has(g)) glyphs.set(g, er);
		}

		// Do per-glyph hinting
		const perGlyphHinting = Array.from(glyphs).map(([gid, er]) =>
			arb.demand(new GlyphHintTask(er.entry, er.parameter, this.ee, gid))
		);
		await Promise.all(perGlyphHinting);

		// Do shared hinting
		for (const er of ehRecords) {
			await arb.demand(new SharedHintTask(er.parameter, this.ee));
		}
	}
}
