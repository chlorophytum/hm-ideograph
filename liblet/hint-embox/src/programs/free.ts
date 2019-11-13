import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";

import { ProgramLib } from "./twilight";

export const THintBottomStrokeFree = ProgramLib.Func(function*($) {
	const [zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(6);
	const dBelowOrig = $.local();
	const dAboveOrig = $.local();
	const wOrig = $.local();
	const wCur = $.local();
	const spaceCur = $.local();
	yield $.set(dBelowOrig, $.sub($.gc.orig(zsBot), $.gc.cur(zBotOrig)));
	yield $.set(dAboveOrig, $.sub($.gc.cur(zTopOrig), $.gc.orig(zsTop)));
	yield $.set(wOrig, $.sub($.gc.orig(zsTop), $.gc.orig(zsBot)));
	yield $.set(wCur, $.max($.coerce.toF26D6(3 / 5), $.call(AdjustStrokeDistT(2), wOrig)));
	yield $.set(spaceCur, $.sub($.sub($.gc.cur(zTop), $.gc.cur(zBot)), wCur));

	const yInterpolated = $.local();
	yield $.set(
		yInterpolated,
		$.add(
			$.gc.cur(zBot),
			$.round.white($.mul(spaceCur, $.div(dBelowOrig, $.add(dBelowOrig, dAboveOrig))))
		)
	);
	yield $.scfs(zsBot, yInterpolated);
	yield $.scfs(zsTop, $.add(yInterpolated, wCur));
});

export const THintTopStrokeFree = ProgramLib.Func(function*($) {
	const [zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(6);
	const dBelowOrig = $.local();
	const dAboveOrig = $.local();
	const wOrig = $.local();
	const wCur = $.local();
	const spaceCur = $.local();
	yield $.set(dBelowOrig, $.sub($.gc.orig(zsBot), $.gc.cur(zBotOrig)));
	yield $.set(dAboveOrig, $.sub($.gc.cur(zTopOrig), $.gc.orig(zsTop)));
	yield $.set(wOrig, $.sub($.gc.orig(zsTop), $.gc.orig(zsBot)));
	yield $.set(wCur, $.max($.coerce.toF26D6(3 / 5), $.call(AdjustStrokeDistT(2), wOrig)));
	yield $.set(spaceCur, $.sub($.sub($.gc.cur(zTop), $.gc.cur(zBot)), wCur));

	const yInterpolated = $.local();
	yield $.set(
		yInterpolated,
		$.sub(
			$.gc.cur(zTop),
			$.round.white($.mul(spaceCur, $.div(dAboveOrig, $.add(dBelowOrig, dAboveOrig))))
		)
	);

	yield $.scfs(zsTop, yInterpolated);
	yield $.scfs(zsBot, $.sub(yInterpolated, wCur));
});

export const THintStrokeFreeAuto = ProgramLib.Func(function*($) {
	const [zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(6);
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
	yield $.if(
		$.gt($.abs($.sub(rTop, urTop)), $.abs($.sub(rBot, urBot))),
		function*() {
			yield $.scfs(zsBot, rBot);
			yield $.scfs(zsTop, $.add(rBot, wCur));
		},
		function*() {
			yield $.scfs(zsTop, rTop);
			yield $.scfs(zsBot, $.sub(rTop, wCur));
		}
	);
});
