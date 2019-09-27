import {
	EmptyImpl,
	Glyph,
	IArbitratorProxy,
	IFontSource,
	IFontSourceMetadata,
	IHint,
	IHintingModelExecEnv,
	IParallelCoTask,
	IParallelTask,
	ITask,
	Variation
} from "@chlorophytum/arch";

import analyzeGlyph from "../analyze";
import HierarchyAnalyzer from "../hierarchy";
import HintGenSink from "../hint-gen/glyph-hints";
import { createHintingStrategy, HintingStrategy } from "../strategy";
import { combineHash, hashGlyphContours } from "../types/hash";

import { createGlyph } from "./create-glyph";
import { ModelVersionPrefix } from "./version-prefix";

export class GlyphHintTask<GID> implements ITask<void> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly params: HintingStrategy,
		private readonly ee: IHintingModelExecEnv,
		private readonly gid: GID
	) {}

	private async getGlyphCacheKey(gid: GID) {
		const geometry = await this.font.getGeometry(gid, null);
		if (!geometry) return null;
		const glyph = createGlyph(geometry.eigen); // Care about outline glyphs only
		return combineHash(
			ModelVersionPrefix,
			JSON.stringify(this.params),
			hashGlyphContours(glyph)
		);
	}

	public async execute(arb: IArbitratorProxy) {
		const gn = await this.font.getUniqueGlyphName(this.gid);
		if (!gn) return;
		const ck = await this.getGlyphCacheKey(this.gid);
		const cached = !ck ? null : this.ee.cacheManager.getCache(ck);
		if (cached) {
			await this.ee.modelLocalHintStore.setGlyphHints(gn, cached);
		} else {
			const glyphRep = await getGlyphRep(this.font, this.gid);
			if (!glyphRep) return;
			let hints: null | undefined | IHint = null;

			const pct = new ParallelGlyphHintCoTask(this.font, this.ee, this.params, glyphRep);
			const runPct = arb.runParallelCoTask(pct);
			if (runPct) {
				hints = await runPct;
			} else {
				const pt = new ParallelGlyphHintTask(this.font.metadata, this.params, glyphRep);
				hints = await pt.executeImpl();
			}
			if (!hints) return;
			if (ck) this.ee.cacheManager.setCache(ck, hints);
			await this.ee.modelLocalHintStore.setGlyphHints(gn, hints);
		}
	}

	public async tryGetDifficulty() {
		const geometry = await this.font.getGeometry(this.gid, null);
		if (!geometry) return 0;
		let d = 0;
		for (const c of geometry.eigen) d += c.length;
		return d;
	}
}

export const ParallelTaskType = "Chlorophytum::IdeographHintingModel1::ParallelTask";
export type GlyphHintParallelArgRep = {
	readonly fmd: IFontSourceMetadata;
	readonly params: HintingStrategy;
	readonly glyphRep: Glyph.Rep;
};
export type GlyphHintParallelResultRep = {
	readonly hints: any;
};

export class ParallelGlyphHintCoTask<GID>
	implements
		IParallelCoTask<
			null | undefined | IHint,
			GlyphHintParallelArgRep,
			GlyphHintParallelResultRep
		> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ee: IHintingModelExecEnv,
		private readonly params: HintingStrategy,

		private readonly glyphRep: Glyph.Rep
	) {}
	public readonly taskType = ParallelTaskType;

	public async getArgRep() {
		return { fmd: this.font.metadata, params: this.params, glyphRep: this.glyphRep };
	}
	public async getResult(rep: GlyphHintParallelResultRep) {
		return this.ee.hintFactory.readJson(rep.hints, this.ee.hintFactory);
	}
}

export class ParallelGlyphHintTask implements IParallelTask<GlyphHintParallelResultRep> {
	public readonly type = ParallelTaskType;
	constructor(
		fmd: IFontSourceMetadata,
		ptParams: Partial<HintingStrategy>,
		private readonly glyphRep: Glyph.Rep
	) {
		this.params = createHintingStrategy(fmd.upm, ptParams);
	}
	private readonly params: HintingStrategy;

	public async execute() {
		const hints = await this.executeImpl();
		return { hints: hints.toJSON() };
	}

	public async executeImpl() {
		const shapeMap = new Map(this.glyphRep.shapes);
		const geometry = shapeMap.get(null);
		if (!geometry) return new EmptyImpl.Empty.Hint();
		return this.hintGlyphGeometry(geometry, this.params);
	}

	public hintGlyphGeometry(geometry: Glyph.Shape, params: HintingStrategy) {
		const glyph = createGlyph(geometry.eigen); // Care about outline glyphs only
		const analysis = analyzeGlyph(glyph, params);
		const sink = new HintGenSink(params.groupName);
		const ha = new HierarchyAnalyzer(analysis, params);
		ha.pre(sink);
		do {
			ha.fetch(sink);
		} while (ha.lastPathWeight && ha.loops < 256);
		ha.post(sink);
		return sink.getHint();
	}
}

export async function getGlyphRep<GID>(
	font: IFontSource<GID>,
	gid: GID
): Promise<null | Glyph.Rep> {
	const shapes: [(null | Variation.Master), Glyph.Shape][] = [];
	const masters: (null | Variation.MasterRep)[] = [null, ...(await font.getGlyphMasters(gid))];
	for (const m of masters) {
		const shape = await font.getGeometry(gid, m ? m.peak : null);
		shapes.push([m ? m.master : null, shape]);
	}
	return { shapes };
}
