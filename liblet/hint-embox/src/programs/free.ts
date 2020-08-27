import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";

import { ProgramLib } from "./twilight";

export const THintStrokeFreeAuto = ProgramLib.Func(function* ($) {
	const [mdBot, mdTop, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(8);
	const dBelowOrig = $.local();
	const dAboveOrig = $.local();
	const wOrig = $.local();
	const wCur = $.local();
	const spaceCur = $.local();
	const urTop = $.local();
	const rTop = $.local();
	const urBot = $.local();
	const rBot = $.local();
	yield $.set(dBelowOrig, $.sub($.gc.orig(zsBot), $.gc.cur(zBotOrig)));
	yield $.set(dAboveOrig, $.sub($.gc.cur(zTopOrig), $.gc.orig(zsTop)));
	yield $.set(wOrig, $.sub($.gc.orig(zsTop), $.gc.orig(zsBot)));
	yield $.set(wCur, $.max($.coerce.toF26D6(3 / 5), $.call(AdjustStrokeDistT(2), wOrig)));
	yield $.set(spaceCur, $.sub($.sub($.gc.cur(zTop), $.gc.cur(zBot)), wCur));
	yield $.set(
		urTop,
		$.sub($.gc.cur(zTop), $.mul(spaceCur, $.div(dAboveOrig, $.add(dBelowOrig, dAboveOrig))))
	);
	yield $.set(
		urBot,
		$.add($.gc.cur(zBot), $.mul(spaceCur, $.div(dBelowOrig, $.add(dBelowOrig, dAboveOrig))))
	);
	yield $.set(rTop, $.round.white(urTop));
	yield $.set(rBot, $.round.white(urBot));
	yield $.if($.gt($.abs($.sub(rTop, urTop)), $.abs($.sub(rBot, urBot))))
		.then(function* () {
			yield $.scfs(zsBot, rBot);
			yield $.scfs(zsTop, $.add(rBot, wCur));
		})
		.else(function* () {
			yield $.scfs(zsTop, rTop);
			yield $.scfs(zsBot, $.sub(rTop, wCur));
		});
	// Leave space for distinguishing
	yield $.if($.lt($.gc.cur(zsTop), $.add($.gc.cur(zBot), mdBot))).then(function* () {
		yield $.scfs(zsBot, $.add($.gc.cur(zsBot), $.coerce.toF26D6(1)));
		yield $.scfs(zsTop, $.add($.gc.cur(zsTop), $.coerce.toF26D6(1)));
	});
	yield $.if($.gt($.gc.cur(zsBot), $.sub($.gc.cur(zTop), mdTop))).then(function* () {
		yield $.scfs(zsBot, $.sub($.gc.cur(zsBot), $.coerce.toF26D6(1)));
		yield $.scfs(zsTop, $.sub($.gc.cur(zsTop), $.coerce.toF26D6(1)));
	});
});
