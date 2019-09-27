import { IFontSource, ITask, WellKnownGlyphRelation } from "@chlorophytum/arch";

import { HintingStrategy } from "../strategy";

import { isHangulCodePoint, isIdeographCodePoint } from "./unicode-kind";

export class EffectiveGlyphAnalysisTask<GID> implements ITask<Set<GID>> {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly params: HintingStrategy
	) {}
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
			const selector = WellKnownGlyphRelation.UnicodeVariant.unApply(relationTag);
			if (selector) gidSet.add(target);
		}
	}
	private unicodeAcceptable(code: number) {
		if (isIdeographCodePoint(code) && !this.params.ignoreIdeographs) return true;
		if (isHangulCodePoint(code) && !this.params.ignoreHangul) return true;
		return false;
	}
}
