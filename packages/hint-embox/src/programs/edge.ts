import { Func } from "@chlorophytum/hltt-next";
import { add, gc, sub } from "@chlorophytum/hltt-next-expr";
import { Mdap, Scfs } from "@chlorophytum/hltt-next-stmt";
import { GlyphPoint, TwilightPoint } from "@chlorophytum/hltt-next-type-system";

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
