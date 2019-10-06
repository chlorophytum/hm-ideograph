import { IFontEntry, ITask, WellKnownGlyphRelation } from "@chlorophytum/arch";

import { HintingStrategy } from "../strategy";

import { isHangulCodePoint, isIdeographCodePoint } from "./unicode-kind";

const acceptableLookupKinds = new Set([`gsub_single`, `gsub_multiple`, `gsub_alternate`]);
const acceptableScriptTags = new Set([`hani`, `hang`]);
const acceptableFeatureTags = new Set([
	`locl`,
	`smpl`,
	`trad`,
	`tnam`,
	`jp78`,
	`jp83`,
	`jp90`,
	`jp04`,
	`hojo`,
	`nlck`
]);
for (let cv = 0; cv <= 99; cv++) {
	let cvTag: string = "" + cv;
	while (cvTag.length < 2) cvTag = "0" + cvTag;
	acceptableFeatureTags.add(`cv` + cvTag);
	acceptableFeatureTags.add(`ss` + cvTag);
}

export class EffectiveGlyphAnalysisTask<GID> implements ITask<Set<GID>> {
	constructor(private readonly font: IFontEntry<GID>, private readonly params: HintingStrategy) {}
	public async execute() {
		const charSet = await this.font.getCharacterSet();
		let gidSet: Set<GID> = new Set();
		for (const ch of charSet) await this.analyzeEffectiveGlyphsForChar(gidSet, ch);
		return gidSet;
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
		if (isIdeographCodePoint(code) && !this.params.ignoreIdeographs) return true;
		if (isHangulCodePoint(code) && !this.params.ignoreHangul) return true;
		return false;
	}
	private relationshipAcceptable(relationTag: string) {
		const selector = WellKnownGlyphRelation.UnicodeVariant.unApply(relationTag);
		if (selector) return true;

		const gsub = WellKnownGlyphRelation.Gsub.unApply(relationTag);
		if (!gsub) return false;
		const [script, language, feature, kind] = gsub;
		return (
			acceptableScriptTags.has(script) &&
			acceptableFeatureTags.has(feature.slice(0, 4)) &&
			acceptableLookupKinds.has(kind)
		);
	}
}
