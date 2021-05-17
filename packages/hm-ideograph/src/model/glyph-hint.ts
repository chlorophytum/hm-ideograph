import {
	Geometry,
	Glyph,
	IArbitratorProxy,
	IFontSource,
	IFontSourceMetadata,
	IHint,
	IHintingModelExecEnv,
	IParallelCoTask,
	IParallelTask,
	ITask
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

	private async getGlyphCacheKey(shape: Glyph.Shape) {
		const cGlyph = this.analyzer.createGlyph(shape.eigen, this.params);
		return this.analyzer.getGlyphHash(cGlyph, this.params);
	}

	public async execute(arb: IArbitratorProxy) {
		const gn = await this.font.getUniqueGlyphName(this.gid);
		if (!gn) return;
		const shape = await this.analyzer.fetchGeometry(this.font, this.params, this.gid);

		// Check whether we have cache the glyph
		const ck = await this.getGlyphCacheKey(shape);
		const cached = !ck ? null : this.ee.cacheManager.getCache(ck);
		if (cached) {
			await this.ee.hintStore.setGlyphHints(gn, cached);
		} else {
			await this.executeImpl(arb, gn, ck, shape);
		}
	}

	private async executeImpl(arb: IArbitratorProxy, gn: string, ck: string, shape: Glyph.Shape) {
		let hints: null | undefined | IHint = null;
		const pct = new ParallelGlyphHintCoTask(this.font, this.ee, this.params, gn, shape);
		const runPct = arb.runParallelCoTask(pct);
		if (runPct) {
			hints = await runPct;
		} else {
			const pt = new ParallelGlyphHintTask(this.analyzer, this.codeGen, this.params, shape);
			hints = await pt.executeImpl();
		}
		if (!hints) return;
		if (ck) this.ee.cacheManager.setCache(ck, hints);
		await this.ee.hintStore.setGlyphHints(gn, hints);
	}

	public async tryGetDifficulty() {
		const geometry = await this.analyzer.fetchGeometry(this.font, this.params, this.gid);
		let d = 0;
		for (const c of geometry.eigen) d += c.length;
		return d;
	}
}

export type GlyphHintParallelArgRep<S> = {
	readonly gn: string;
	readonly fmd: IFontSourceMetadata;
	readonly params: S;
	readonly shape: Glyph.Shape;
};
export type GlyphHintParallelResultRep = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly hints: any;
};

export class ParallelGlyphHintCoTask<GID, S>
	implements
		IParallelCoTask<
			null | undefined | IHint,
			GlyphHintParallelArgRep<S>,
			GlyphHintParallelResultRep
		>
{
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ee: IHintingModelExecEnv,
		private readonly params: S,
		private readonly gn: string,
		private readonly shape: Glyph.Shape
	) {}
	public readonly taskType = ParallelTaskType;

	public async getArgRep() {
		return {
			gn: this.gn,
			fmd: this.font.metadata,
			params: this.params,
			shape: this.shape
		};
	}
	public async getResult(rep: GlyphHintParallelResultRep) {
		return this.ee.hintFactory.readJson(rep.hints, this.ee.hintFactory);
	}
}

export class ParallelGlyphHintTask<S extends IdeographHintingParams, G, A>
	implements IParallelTask<GlyphHintParallelResultRep>
{
	public readonly type = ParallelTaskType;
	constructor(
		private readonly analyzer: IShapeAnalyzer<S, G, A>,
		private readonly codeGen: IHintGen<S, G, A>,
		private readonly params: S,
		private readonly shape: Glyph.Shape
	) {}

	public async execute() {
		const hints = await this.executeImpl();
		return { hints: hints.toJSON() };
	}

	public async executeImpl() {
		return this.hintGlyphGeometry(this.shape, this.params);
	}

	public async hintGlyphGeometry(geometry: Glyph.Shape, params: S) {
		// Care about outline glyphs only
		const glyph = this.analyzer.createGlyph(geometry.eigen, params);
		const analysis = this.analyzer.analyzeGlyph(params, glyph);
		return this.codeGen.generateGlyphHints(params, glyph, analysis);
	}
}
