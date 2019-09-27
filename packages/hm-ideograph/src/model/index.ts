import { IArbitratorProxy, IFontSource, IHintingModelExecEnv, ITask } from "@chlorophytum/arch";
import {
	IdeographHintingParams,
	IHintGen,
	IShapeAnalyzer
} from "@chlorophytum/ideograph-shape-analyzer-shared";

import { GlyphHintTask } from "./glyph-hint";
import { SharedHintTask } from "./shared-hint";

export class IdeographHintingTask<GID, G, S extends IdeographHintingParams, A>
	implements ITask<void>
{
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly analyzer: IShapeAnalyzer<S, G, A>,
		private readonly codeGen: IHintGen<S, G, A>,
		private readonly ptParams: Partial<S>,
		private readonly ee: IHintingModelExecEnv
	) {}

	private m_params: null | S = null;

	private async getParams() {
		if (!this.m_params) {
			this.m_params = await this.analyzer.createHintingStrategy(this.font, this.ptParams);
		}
		return this.m_params;
	}
	public async execute(arb: IArbitratorProxy) {
		const params = await this.getParams();
		// Collect entries from the font source
		const entries = await this.font.getEntries();

		// Collect effective glyphs and the first EHR associated to it
		const glyphs: Set<GID> = new Set();
		for (const entry of entries) {
			const gs = new Set(await entry.getGlyphSet());
			for (const g of gs) glyphs.add(g);
		}

		// Do per-glyph hinting
		const perGlyphHinting = Array.from(glyphs).map(gid =>
			arb.demand(
				new GlyphHintTask(this.font, this.analyzer, this.codeGen, params, this.ee, gid)
			)
		);
		await Promise.all(perGlyphHinting);

		// Do shared hinting
		await arb.demand(new SharedHintTask(this.codeGen, params, this.ee));
	}
}
