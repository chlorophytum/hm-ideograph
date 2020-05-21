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
import {
	IdeographHintingParams,
	IHintGen,
	IShapeAnalyzer
} from "@chlorophytum/ideograph-shape-analyzer-shared";

import { ParallelTaskType } from "./constants";

export class GlyphHintTask<GID, S extends IdeographHintingParams, G, A> implements ITask<void> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly analyzer: IShapeAnalyzer<S, G, A>,
		private readonly codeGen: IHintGen<S, G, A>,
		private readonly params: S,
		private readonly ee: IHintingModelExecEnv,
		private readonly gid: GID
	) {}

	private async getGlyphCacheKey(gid: GID) {
		const geometry = await this.font.getGeometry(gid, null);
		if (!geometry) return null;
		const glyph = this.analyzer.createGlyph(geometry.eigen); // Care about outline glyphs only
		return this.analyzer.getGlyphHash(glyph, this.params);
	}

	public async execute(arb: IArbitratorProxy) {
		const gn = await this.font.getUniqueGlyphName(this.gid);
		if (!gn) return;
		const ck = await this.getGlyphCacheKey(this.gid);
		const cached = !ck ? null : this.ee.cacheManager.getCache(ck);
		if (cached) {
			await this.ee.hintStore.setGlyphHints(gn, cached);
		} else {
			const glyphRep = await getGlyphRep(this.font, this.gid);
			if (!glyphRep) return;
			let hints: null | undefined | IHint = null;

			const pct = new ParallelGlyphHintCoTask(this.font, this.ee, this.params, glyphRep);
			const runPct = arb.runParallelCoTask(pct);
			if (runPct) {
				hints = await runPct;
			} else {
				const pt = new ParallelGlyphHintTask(
					this.font.metadata,
					this.analyzer,
					this.codeGen,
					this.params,
					glyphRep
				);
				hints = await pt.executeImpl();
			}
			if (!hints) return;
			if (ck) this.ee.cacheManager.setCache(ck, hints);
			await this.ee.hintStore.setGlyphHints(gn, hints);
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

export type GlyphHintParallelArgRep<S> = {
	readonly fmd: IFontSourceMetadata;
	readonly params: S;
	readonly glyphRep: Glyph.Rep;
};
export type GlyphHintParallelResultRep = {
	readonly hints: any;
};

export class ParallelGlyphHintCoTask<GID, S>
	implements
		IParallelCoTask<
			null | undefined | IHint,
			GlyphHintParallelArgRep<S>,
			GlyphHintParallelResultRep
		> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ee: IHintingModelExecEnv,
		private readonly params: S,

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

export class ParallelGlyphHintTask<S extends IdeographHintingParams, G, A>
	implements IParallelTask<GlyphHintParallelResultRep> {
	public readonly type = ParallelTaskType;
	constructor(
		fmd: IFontSourceMetadata,
		private readonly analyzer: IShapeAnalyzer<S, G, A>,
		private readonly codeGen: IHintGen<S, G, A>,
		ptParams: Partial<S>,
		private readonly glyphRep: Glyph.Rep
	) {
		this.params = this.analyzer.createHintingStrategy(fmd.upm, ptParams);
	}
	private readonly params: S;

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

	public hintGlyphGeometry(geometry: Glyph.Shape, params: S) {
		const glyph = this.analyzer.createGlyph(geometry.eigen); // Care about outline glyphs only
		const analysis = this.analyzer.analyzeGlyph(params, glyph);
		return this.codeGen.generateGlyphHints(params, glyph, analysis);
	}
}

export async function getGlyphRep<GID>(
	font: IFontSource<GID>,
	gid: GID
): Promise<null | Glyph.Rep> {
	const shapes: [null | Variation.Master, Glyph.Shape][] = [];
	const masters: (null | Variation.MasterRep)[] = [null, ...(await font.getGlyphMasters(gid))];
	for (const m of masters) {
		const shape = await font.getGeometry(gid, m ? m.peak : null);
		shapes.push([m ? m.master : null, shape]);
	}
	return { shapes };
}
