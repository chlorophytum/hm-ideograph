import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";
import {
	abs,
	add,
	div,
	Frac,
	Func,
	gc,
	GlyphPoint,
	gt,
	If,
	lt,
	max,
	mul,
	roundWhite,
	Scfs,
	sub,
	TwilightPoint
} from "@chlorophytum/hltt-next";

export const HintStrokeFreeAuto = Func(
	Frac,
	Frac,
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	GlyphPoint,
	GlyphPoint
).def(function* ($, mdBot, mdTop, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop) {
	const dBelowOrig = $.Local(Frac);
	const dAboveOrig = $.Local(Frac);
	const wOrig = $.Local(Frac);
	const wCur = $.Local(Frac);
	const spaceCur = $.Local(Frac);
	const urTop = $.Local(Frac);
	const rTop = $.Local(Frac);
	const urBot = $.Local(Frac);
	const rBot = $.Local(Frac);

	yield dBelowOrig.set(sub(gc.orig(zsBot), gc.cur(zBotOrig)));
	yield dAboveOrig.set(sub(gc.cur(zTopOrig), gc.orig(zsTop)));
	yield wOrig.set(sub(gc.orig(zsTop), gc.orig(zsBot)));
	yield wCur.set(max(3 / 5, AdjustStrokeDistT(2)(wOrig)));
	yield spaceCur.set(sub(sub(gc.cur(zTop), gc.cur(zBot)), wCur));
	yield urTop.set(sub(gc.cur(zTop), mul(spaceCur, div(dAboveOrig, add(dBelowOrig, dAboveOrig)))));
	yield urBot.set(add(gc.cur(zBot), mul(spaceCur, div(dBelowOrig, add(dBelowOrig, dAboveOrig)))));
	yield rTop.set(roundWhite(urTop));
	yield rBot.set(roundWhite(urBot));

	yield If(gt(abs(sub(rTop, urTop)), abs(sub(rBot, urBot))))
		.Then(function* () {
			yield Scfs(zsBot, rBot);
			yield Scfs(zsTop, add(rBot, wCur));
		})
		.Else(function* () {
			yield Scfs(zsTop, rTop);
			yield Scfs(zsBot, sub(rTop, wCur));
		});

	yield If(lt(gc.cur(zsTop), add(gc.cur(zBot), mdBot))).Then(function* () {
		yield Scfs(zsBot, add(gc.cur(zsBot), 1));
		yield Scfs(zsTop, add(gc.cur(zsTop), 1));
	});
	yield If(gt(gc.cur(zsBot), sub(gc.cur(zTop), mdTop))).Then(function* () {
		yield Scfs(zsBot, sub(gc.cur(zsBot), 1));
		yield Scfs(zsTop, sub(gc.cur(zsTop), 1));
	});
});
