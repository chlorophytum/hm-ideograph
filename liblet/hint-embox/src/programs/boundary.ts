import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";

import { ProgramLib } from "./twilight";

export interface StretchProps {
	readonly PIXEL_RATIO_TO_MOVE: number;
	readonly PIXEL_SHIFT_TO_MOVE: number;
	readonly STRETCH_BOTTOM_A: number;
	readonly STRETCH_BOTTOM_X: number;
	readonly STRETCH_TOP_A: number;
	readonly STRETCH_TOP_X: number;
	readonly CUTIN: number;
}

const ComputeYAvgEmboxShift = ProgramLib.Func(function*($) {
	const [zBot, zTop, zBotOrig, zTopOrig] = $.args(6);
	yield $.return(
		$.mul(
			$.add(
				$.sub($.gc.cur(zBot), $.gc.cur(zBotOrig)),
				$.sub($.gc.cur(zTop), $.gc.cur(zTopOrig))
			),
			$.coerce.toF26D6(1 / 2)
		)
	);
});

export const THintBottomStroke = ProgramLib.Template(function*($, stretch: StretchProps) {
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
			$.max(0, $.floor($.mul(spaceCur, $.div(dBelowOrig, $.add(dBelowOrig, dAboveOrig)))))
		)
	);
	yield $.scfs(zsBot, yInterpolated);
	yield $.scfs(zsTop, $.add(yInterpolated, wCur));
});

export const THintTopStroke = ProgramLib.Template(function*($, stretch: StretchProps) {
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
			$.max(0, $.floor($.mul(spaceCur, $.div(dAboveOrig, $.add(dBelowOrig, dAboveOrig)))))
		)
	);

	yield $.if(
		$.gteq(
			yInterpolated,
			$.add(
				$.gc.orig(zsTop),
				$.add(
					$.call(ComputeYAvgEmboxShift, zBot, zTop, zBotOrig, zTopOrig),
					$.coerce.toF26D6(1)
				)
			)
		),
		function*() {
			yield $.set(yInterpolated, $.sub(yInterpolated, $.coerce.toF26D6(1)));
		}
	);

	yield $.scfs(zsTop, yInterpolated);
	yield $.scfs(zsBot, $.sub(yInterpolated, wCur));
});
