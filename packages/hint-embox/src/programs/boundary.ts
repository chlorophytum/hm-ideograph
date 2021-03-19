import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";
import {
	add,
	div,
	floor,
	Frac,
	Func,
	gc,
	GlyphPoint,
	gteq,
	If,
	max,
	mul,
	Scfs,
	sub,
	TwilightPoint
} from "@chlorophytum/hltt-next";

const ComputeYAvgEmboxShift = Func(TwilightPoint, TwilightPoint, TwilightPoint, TwilightPoint)
	.returns(Frac)
	.def(function* ($, zBot, zTop, zBotOrig, zTopOrig) {
		yield $.Return(
			mul(
				1 / 2,
				add(sub(gc.cur(zBot), gc.cur(zBotOrig)), sub(gc.cur(zTop), gc.cur(zTopOrig)))
			)
		);
	});

export const HintBottomStroke = Func(
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	GlyphPoint,
	GlyphPoint
).def(function* ($, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop) {
	const dBelowOrig = $.Local(Frac);
	const dAboveOrig = $.Local(Frac);
	const wOrig = $.Local(Frac);
	const wCur = $.Local(Frac);
	const spaceCur = $.Local(Frac);

	yield dBelowOrig.set(sub(gc.orig(zsBot), gc.cur(zBotOrig)));
	yield dAboveOrig.set(sub(gc.cur(zTopOrig), gc.orig(zsTop)));
	yield wOrig.set(sub(gc.orig(zsTop), gc.orig(zsBot)));
	yield wCur.set(max(3 / 5, AdjustStrokeDistT(2)(wOrig)));
	yield spaceCur.set(sub(sub(gc.cur(zTop), gc.cur(zBot)), wCur));

	const yInterpolated = $.Local(Frac);
	yield yInterpolated.set(
		add(
			gc.cur(zBot),
			max(0, floor(mul(spaceCur, div(dBelowOrig, add(dBelowOrig, dAboveOrig)))))
		)
	);

	yield Scfs(zsBot, yInterpolated);
	yield Scfs(zsTop, add(yInterpolated, wCur));
});

export const HintTopStroke = Func(
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	TwilightPoint,
	GlyphPoint,
	GlyphPoint
).def(function* ($, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop) {
	const dBelowOrig = $.Local(Frac);
	const dAboveOrig = $.Local(Frac);
	const wOrig = $.Local(Frac);
	const wCur = $.Local(Frac);
	const spaceCur = $.Local(Frac);

	yield dBelowOrig.set(sub(gc.orig(zsBot), gc.cur(zBotOrig)));
	yield dAboveOrig.set(sub(gc.cur(zTopOrig), gc.orig(zsTop)));
	yield wOrig.set(sub(gc.orig(zsTop), gc.orig(zsBot)));
	yield wCur.set(max(3 / 5, AdjustStrokeDistT(2)(wOrig)));
	yield spaceCur.set(sub(sub(gc.cur(zTop), gc.cur(zBot)), wCur));

	const yInterpolated = $.Local(Frac);
	yield yInterpolated.set(
		sub(
			gc.cur(zTop),
			max(0, floor(mul(spaceCur, div(dAboveOrig, add(dBelowOrig, dAboveOrig)))))
		)
	);

	yield If(
		gteq(
			yInterpolated,
			add(gc.orig(zsTop), add(ComputeYAvgEmboxShift(zBot, zTop, zBotOrig, zTopOrig), 1))
		)
	).Then(function* () {
		yield yInterpolated.set(sub(yInterpolated, 1));
	});

	yield Scfs(zsTop, yInterpolated);
	yield Scfs(zsBot, sub(yInterpolated, wCur));
});
