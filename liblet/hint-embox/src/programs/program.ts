import { AdjustStrokeDistT } from "@chlorophytum/hint-programs-stoke-adjust";
import { Expression, ProgramDsl, TtLibrary } from "@chlorophytum/hltt";

const Lib = new TtLibrary(`Chlorophytum::EmBox::HlttSupportPrograms`);

export interface StretchProps {
	readonly PIXEL_RATIO_TO_MOVE: number;
	readonly PIXEL_SHIFT_TO_MOVE: number;
	readonly STRETCH_BOTTOM_A: number;
	readonly STRETCH_BOTTOM_X: number;
	readonly STRETCH_TOP_A: number;
	readonly STRETCH_TOP_X: number;
	readonly CUTIN: number;
}

const TDistAdjustBot = Lib.Template(function*($, stretch: StretchProps) {
	const [d] = $.args(1);
	const correctedPpem = $.max(
		$.coerce.toF26D6(1),
		$.add(
			$.coerce.toF26D6(stretch.STRETCH_BOTTOM_A),
			$.mul($.coerce.toF26D6((stretch.STRETCH_BOTTOM_X * 64) / 12), $.mppem())
		)
	);
	yield $.return(
		$.max(0, $.mul(d, $.sub($.coerce.toF26D6(1), $.div($.coerce.toF26D6(1), correctedPpem))))
	);
});

const TDistAdjustTop = Lib.Template(function*($, stretch: StretchProps) {
	const [d] = $.args(1);
	const correctedPpem = $.max(
		$.coerce.toF26D6(1),
		$.add(
			$.coerce.toF26D6(stretch.STRETCH_TOP_A),
			$.mul($.coerce.toF26D6((stretch.STRETCH_TOP_X * 64) / 12), $.mppem())
		)
	);
	yield $.return(
		$.max(0, $.mul(d, $.sub($.coerce.toF26D6(1), $.div($.coerce.toF26D6(1), correctedPpem))))
	);
});

const FOffsetMovementHasImprovement = Lib.Func(function*($) {
	const [dOrig, dCur, sign] = $.args(3);
	yield $.return($.lteq($.abs($.sub($.add(sign, dCur), dOrig)), $.abs($.sub(dCur, dOrig))));
});

function $TooMuch($: ProgramDsl, stretch: StretchProps, dCur: Expression, dOrig: Expression) {
	return $.or(
		$.gt(dCur, $.mul($.coerce.toF26D6(stretch.PIXEL_RATIO_TO_MOVE), dOrig)),
		$.gt(dCur, $.add($.coerce.toF26D6(stretch.PIXEL_SHIFT_TO_MOVE), dOrig))
	);
}
function $TooLess($: ProgramDsl, stretch: StretchProps, dCur: Expression, dOrig: Expression) {
	return $.or(
		$.lt(dCur, $.mul($.coerce.toF26D6(1 / stretch.PIXEL_RATIO_TO_MOVE), dOrig)),
		$.lt(dCur, $.add($.coerce.toF26D6(-stretch.PIXEL_SHIFT_TO_MOVE), dOrig))
	);
}

const TComputeOffsetPixelsForTBImpl = Lib.Template(function*($, stretch: StretchProps) {
	const [dOrig, dCur, sign] = $.args(3);

	yield $.if($.gt(dOrig, $.coerce.toF26D6(stretch.CUTIN)), function*() {
		yield $.if(
			$.and(
				$TooMuch($, stretch, dCur, dOrig),
				$.call(FOffsetMovementHasImprovement, dOrig, dCur, $.coerce.toF26D6(-1))
			),
			function*() {
				yield $.return($.mul($.coerce.toF26D6(-1), sign));
			}
		);
		yield $.if(
			$.and(
				$TooLess($, stretch, dCur, dOrig),
				$.call(FOffsetMovementHasImprovement, dOrig, dCur, $.coerce.toF26D6(+1))
			),
			function*() {
				yield $.return($.mul($.coerce.toF26D6(+1), sign));
			}
		);
	});

	yield $.return(0);
});
const TComputeOffsetPixelsForTB = Lib.Template(function*($, stretch: StretchProps) {
	const [dOrig, dCur, dOrigArch, dCurArch, sign] = $.args(5);

	const offset = $.local();
	yield $.set(offset, $.call(TComputeOffsetPixelsForTBImpl(stretch), dOrig, dCur, sign));
	yield $.if(offset, function*() {
		yield $.return(offset);
	});

	yield $.set(offset, $.call(TComputeOffsetPixelsForTBImpl(stretch), dOrigArch, dCurArch, sign));
	yield $.if(offset, function*() {
		yield $.return(offset);
	});

	yield $.return(0);
});

export const THintBottomStroke = Lib.Template(function*($, stretch: StretchProps) {
	const [
		zBot,
		zTop,
		zaBot,
		zaTop,
		zBotOrig,
		zTopOrig,
		zaBotOrig,
		zaTopOrig,
		zsBot,
		zsTop
	] = $.args(10);

	// Perform a "free" position first -- we'd like to grab the positions
	yield $.call(THintBottomStrokeFree, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop);

	const dOffset = $.local();

	yield $.set(
		dOffset,
		$.call(
			TComputeOffsetPixelsForTB(stretch),
			$.call(TDistAdjustBot(stretch), $.sub($.gc.orig(zsBot), $.gc.cur(zBotOrig))),
			$.sub($.gc.cur(zsBot), $.gc.cur(zBot)),
			$.call(TDistAdjustBot(stretch), $.sub($.gc.orig(zsBot), $.gc.cur(zaBotOrig))),
			$.sub($.gc.cur(zsBot), $.gc.cur(zaBot)),
			$.coerce.toF26D6(+1)
		)
	);

	yield $.scfs(zsBot, $.add($.gc.cur(zsBot), dOffset));
	yield $.scfs(zsTop, $.add($.gc.cur(zsTop), dOffset));
});

export const THintBottomStrokeFree = Lib.Func(function*($) {
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
	yield $.scfs(
		zsBot,
		$.round.white(
			$.add($.gc.cur(zBot), $.mul(spaceCur, $.div(dBelowOrig, $.add(dBelowOrig, dAboveOrig))))
		)
	);
	yield $.scfs(zsTop, $.add($.gc.cur(zsBot), wCur));
});

export const THintTopStroke = Lib.Template(function*($, stretch: StretchProps) {
	const [
		zBot,
		zTop,
		zaBot,
		zaTop,
		zBotOrig,
		zTopOrig,
		zaBotOrig,
		zaTopOrig,
		zsBot,
		zsTop
	] = $.args(10);

	// Perform a "free" position first -- we'd like to grab the positions
	yield $.call(THintTopStrokeFree, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop);
	const dOffset = $.local();

	yield $.set(
		dOffset,
		$.call(
			TComputeOffsetPixelsForTB(stretch),
			$.call(TDistAdjustTop(stretch), $.sub($.gc.cur(zTopOrig), $.gc.orig(zsTop))),
			$.sub($.gc.cur(zTop), $.gc.cur(zsTop)),
			$.call(TDistAdjustTop(stretch), $.sub($.gc.cur(zaTopOrig), $.gc.orig(zsTop))),
			$.sub($.gc.cur(zaTop), $.gc.cur(zsTop)),
			$.coerce.toF26D6(-1)
		)
	);
	yield $.scfs(zsBot, $.add($.gc.cur(zsBot), dOffset));
	yield $.scfs(zsTop, $.add($.gc.cur(zsTop), dOffset));
});

export const THintTopStrokeFree = Lib.Func(function*($) {
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
	yield $.scfs(
		zsTop,
		$.round.white(
			$.sub($.gc.cur(zTop), $.mul(spaceCur, $.div(dAboveOrig, $.add(dBelowOrig, dAboveOrig))))
		)
	);
	yield $.scfs(zsBot, $.sub($.gc.cur(zsTop), wCur));
});

export const THintStrokeFreeAuto = Lib.Func(function*($) {
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

export const THintBottomEdge = Lib.Func(function*($) {
	const [zBot, zoBot, zsBot] = $.args(3);
	const adjustedDist = $.sub($.gc.cur(zBot), $.gc.cur(zoBot));
	yield $.mdap(zsBot);
	yield $.scfs(zsBot, $.add($.gc.orig(zsBot), adjustedDist));
});

export const THintTopEdge = Lib.Func(function*($) {
	const [zTop, zoTop, zsTop] = $.args(3);
	const adjustedDist = $.sub($.gc.cur(zTop), $.gc.cur(zoTop));
	yield $.mdap(zsTop);
	yield $.scfs(zsTop, $.add($.gc.orig(zsTop), adjustedDist));
});

export const ULink = Lib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
});
export const RLink = Lib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig)))));
});

export const RLinkLim = Lib.Func(function*($) {
	const [a, b, c, aOrig, bOrig, cOrig] = $.args(6);
	const dist = $.local();
	const absDist = $.local();
	const absDistC = $.local();
	yield $.set(dist, $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
	yield $.set(absDist, $.abs(dist));
	yield $.set(absDistC, $.abs($.sub($.gc.cur(cOrig), $.gc.cur(aOrig))));
	yield $.while($.gt(absDist, absDistC), function*() {
		yield $.set(absDist, $.sub(absDist, $.coerce.toF26D6(1)));
	});
	yield $.if(
		$.gt(dist, 0),
		function*() {
			yield $.scfs(b, $.add($.gc.cur(a), absDist));
		},
		function*() {
			yield $.scfs(b, $.sub($.gc.cur(a), absDist));
		}
	);
});

export const TInitEmBoxTwilightPoints = Lib.Func(function*($) {
	const [
		strokeBottom,
		strokeTop,
		archBottom,
		archTop,
		spurBottom,
		spurTop,
		strokeBottomOrig,
		strokeTopOrig,
		archBottomOrig,
		archTopOrig,
		spurBottomOrig,
		spurTopOrig
	] = $.args(12);

	// These MDAPs are not necessary but VTT loves them
	yield $.mdap(strokeBottom);
	yield $.mdap(strokeTop);
	yield $.mdap(archBottom);
	yield $.mdap(archTop);
	yield $.mdap(spurBottom);
	yield $.mdap(spurTop);

	yield $.scfs(strokeBottom, $.round.black($.gc.cur(strokeBottomOrig)));
	yield $.call(RLink, strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
	yield $.call(ULink, strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
	yield $.call(ULink, strokeTop, spurTop, strokeTopOrig, spurTopOrig);
	yield $.call(
		RLinkLim,
		strokeBottom,
		archBottom,
		spurBottom,
		strokeBottomOrig,
		archBottomOrig,
		spurBottomOrig
	);
	yield $.call(RLinkLim, strokeTop, archTop, spurTop, strokeTopOrig, archTopOrig, spurTopOrig);
});
