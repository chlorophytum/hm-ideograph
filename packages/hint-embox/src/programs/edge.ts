import { add, Func, gc, GlyphPoint, Mdap, Scfs, sub, TwilightPoint } from "@chlorophytum/hltt-next";

export const THintBottomEdge = Func(TwilightPoint, TwilightPoint, GlyphPoint).def(function* (
	$,
	zBot,
	zoBot,
	zsBot
) {
	const adjustedDist = sub(gc.cur(zBot), gc.cur(zoBot));
	yield Mdap(zsBot);
	yield Scfs(zsBot, add(gc.orig(zsBot), adjustedDist));
});

export const THintTopEdge = Func(TwilightPoint, TwilightPoint, GlyphPoint).def(function* (
	$,
	zTop,
	zoTop,
	zsTop
) {
	const adjustedDist = sub(gc.cur(zTop), gc.cur(zoTop));
	yield Mdap(zsTop);
	yield Scfs(zsTop, add(gc.orig(zsTop), adjustedDist));
});
