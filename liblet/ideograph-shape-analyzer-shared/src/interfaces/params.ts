export interface IdeographHintingParams {
	readonly unicodeRanges: ReadonlyArray<[number, number]>;
	readonly trackScripts: ReadonlyArray<string>;
	readonly trackFeatures: ReadonlyArray<string>;
	readonly acceptAllGlyphs: boolean;
}

// prettier-ignore
const DefaultUnicodeRanges: [number, number][] = [
	[0x2e80,  0x2fff], // Radicals
	[0x31c0,  0x31e3], // Strokes
	[0x3400,  0x4dbf], // ExtA
	[0x4e00,  0x9fff], // URO
	[0xf900,  0xfa6f], // Compatibility
	[0x20000, 0x2ffff], // SIP
	[0xac00,  0xd7af] // Hangul
];
// prettier-ignore
const DefaultScriptTags = [`hani`, `hang`];
// prettier-ignore
const DefaultFeatureTags = [
	`locl`, `smpl`, `trad`, `tnam`, `jp78`, `jp83`, `jp90`, `jp04`, `hojo`, `nlck`, `expt`
];
for (let cv = 0; cv <= 99; cv++) {
	let cvTag: string = "" + cv;
	while (cvTag.length < 2) cvTag = "0" + cvTag;
	DefaultFeatureTags.push(`cv` + cvTag);
	DefaultFeatureTags.push(`ss` + cvTag);
}

export const DefaultIdeographHintingParams: IdeographHintingParams = {
	acceptAllGlyphs: false,
	unicodeRanges: DefaultUnicodeRanges,
	trackScripts: DefaultScriptTags,
	trackFeatures: DefaultFeatureTags
};
