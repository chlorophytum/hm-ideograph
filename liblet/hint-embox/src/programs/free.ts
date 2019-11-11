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
		$.round.gray(
			$.add($.gc.cur(zBot), $.mul(spaceCur, $.div(dBelowOrig, $.add(dBelowOrig, dAboveOrig))))
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
	const yRoundUpTop = $.local();
	const yRoundDownTop = $.local();
	const totalMoveRoundUp = $.local();
	const totalMoveRoundDown = $.local();
	yield $.set(
		yInterpolated,
		$.sub($.gc.cur(zTop), $.mul(spaceCur, $.div(dAboveOrig, $.add(dBelowOrig, dAboveOrig))))
	);
	yield $.set(yRoundUpTop, $.ceiling(yInterpolated));
	yield $.set(yRoundDownTop, $.floor(yInterpolated));

	yield $.set(
		totalMoveRoundUp,
		$.add(
			$.abs($.sub(yRoundUpTop, $.gc.orig(zsTop))),
			$.abs($.sub($.sub(yRoundUpTop, wCur), $.gc.orig(zsBot)))
		)
	);
	yield $.set(
		totalMoveRoundDown,
		$.add(
			$.abs($.sub(yRoundDownTop, $.gc.orig(zsTop))),
			$.abs($.sub($.sub(yRoundDownTop, wCur), $.gc.orig(zsBot)))
		)
	);
	yield $.if(
		$.lt(totalMoveRoundDown, totalMoveRoundUp),
		function*() {
			yield $.scfs(zsTop, yRoundDownTop);
			yield $.scfs(zsBot, $.sub(yRoundDownTop, wCur));
		},
		function*() {
			yield $.scfs(zsTop, yRoundUpTop);
			yield $.scfs(zsBot, $.sub(yRoundUpTop, wCur));
		}
	);
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
