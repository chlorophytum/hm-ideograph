import { IFontEntry, ITask, WellKnownGlyphRelation } from "@chlorophytum/arch";
import { IdeographHintingParams } from "@chlorophytum/ideograph-shape-analyzer-shared";

const DefaultLookupKinds = [`gsub_single`, `gsub_multiple`, `gsub_alternate`];

export class EffectiveGlyphAnalysisTask<GID> implements ITask<Set<GID>> {
	private acceptAllGlyphs: boolean;
	private acceptableLookupKinds: ReadonlySet<string>;
	private acceptableScriptTags: ReadonlySet<string>;
	private acceptableFeatureTags: ReadonlySet<string>;
	private acceptableUnicode: ReadonlySet<number>;

	constructor(private readonly font: IFontEntry<GID>, params: IdeographHintingParams) {
		this.acceptAllGlyphs = !!params.acceptAllGlyphs;

		this.acceptableLookupKinds = new Set(DefaultLookupKinds);
		this.acceptableScriptTags = new Set(params.trackScripts);
		this.acceptableFeatureTags = new Set(params.trackFeatures);

		const au: Set<number> = new Set();
		for (const [start, end] of params.unicodeRanges) {
			for (let c = start; c <= end; c++) au.add(c);
		}
		this.acceptableUnicode = au;
	}
	public async execute() {
		if (this.acceptAllGlyphs) {
			return new Set(await this.font.getGlyphSet());
		} else {
			const charSet = await this.font.getCharacterSet();
			const gidSet: Set<GID> = new Set();
			for (const ch of charSet) await this.analyzeEffectiveGlyphsForChar(gidSet, ch);
			return gidSet;
		}
	}
	private async analyzeEffectiveGlyphsForChar(gidSet: Set<GID>, ch: number) {
		if (!this.unicodeAcceptable(ch)) return;
		const gid = await this.font.getEncodedGlyph(ch);
		if (!gid) return;
		gidSet.add(gid);
		const related = await this.font.getRelatedGlyphs(gid, ch);
		if (!related) return;
		for (const { target, relationTag } of related) {
			if (this.relationshipAcceptable(relationTag)) gidSet.add(target);
		}
	}
	private unicodeAcceptable(code: number) {
		return this.acceptableUnicode.has(code);
	}
	private relationshipAcceptable(relationTag: string) {
		const selector = WellKnownGlyphRelation.UnicodeVariant.unApply(relationTag);
		if (selector) return true;

		const gsub = WellKnownGlyphRelation.Gsub.unApply(relationTag);
		if (!gsub) return false;
		const [script, language, feature, kind] = gsub;
		return (
			this.acceptableScriptTags.has(script) &&
			this.acceptableFeatureTags.has(feature.slice(0, 4)) &&
			this.acceptableLookupKinds.has(kind)
		);
	}
}
