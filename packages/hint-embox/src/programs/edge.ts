import { ProgramLib } from "./twilight";

export const THintBottomEdge = ProgramLib.Func(function* ($) {
	const [zBot, zoBot, zsBot] = $.args(3);
	const adjustedDist = $.sub($.gc.cur(zBot), $.gc.cur(zoBot));
	yield $.mdap(zsBot);
	yield $.scfs(zsBot, $.add($.gc.orig(zsBot), adjustedDist));
});

export const THintTopEdge = ProgramLib.Func(function* ($) {
	const [zTop, zoTop, zsTop] = $.args(3);
	const adjustedDist = $.sub($.gc.cur(zTop), $.gc.cur(zoTop));
	yield $.mdap(zsTop);
	yield $.scfs(zsTop, $.add($.gc.orig(zsTop), adjustedDist));
});
