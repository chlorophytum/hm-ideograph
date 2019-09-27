export function isIdeographCodePoint(code: number) {
	return (
		(code >= 0x2e80 && code <= 0x2fff) || // CJK radicals
		(code >= 0x3192 && code <= 0x319f) || // CJK strokes
		(code >= 0x3300 && code <= 0x9fff) || // BMP ideographs
		(code >= 0xf900 && code <= 0xfa6f) || // CJK compatibility ideographs
		(code >= 0x20000 && code <= 0x3ffff) // SIP, TIP
	);
}

export function isHangulCodePoint(code: number) {
	return (
		code >= 0xac00 && code <= 0xd7af // Hangul Syllables
	);
}
