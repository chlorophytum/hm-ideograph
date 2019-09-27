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

const TDistAdjustBot = Lib.Template(function*(e, stretch: StretchProps) {
	const [d] = e.args(1);
	const correctedPpem = e.max(
		e.coerce.toF26D6(1),
		e.add(
			e.coerce.toF26D6(stretch.STRETCH_BOTTOM_A),
			e.mul(e.coerce.toF26D6((stretch.STRETCH_BOTTOM_X * 64) / 12), e.mppem())
		)
	);
	yield e.return(
		e.max(0, e.mul(d, e.sub(e.coerce.toF26D6(1), e.div(e.coerce.toF26D6(1), correctedPpem))))
	);
});

const TDistAdjustTop = Lib.Template(function*(e, stretch: StretchProps) {
	const [d] = e.args(1);
	const correctedPpem = e.max(
		e.coerce.toF26D6(1),
		e.add(
			e.coerce.toF26D6(stretch.STRETCH_TOP_A),
			e.mul(e.coerce.toF26D6((stretch.STRETCH_TOP_X * 64) / 12), e.mppem())
		)
	);
	yield e.return(
		e.max(0, e.mul(d, e.sub(e.coerce.toF26D6(1), e.div(e.coerce.toF26D6(1), correctedPpem))))
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
	const [zBot, zTop, zaBot, zaTop, zsBot, zsTop] = $.args(6);

	// Perform a "free" position first -- we'd like to grab the positions
	yield $.call(THintBottomStrokeFree, zBot, zTop, zsBot, zsTop);

	const dOffset = $.local();

	yield $.set(
		dOffset,
		$.call(
			TComputeOffsetPixelsForTB(stretch),
			$.call(TDistAdjustBot(stretch), $.sub($.gc.orig(zsBot), $.gc.orig(zBot))),
			$.sub($.gc.cur(zsBot), $.gc.cur(zBot)),
			$.call(TDistAdjustBot(stretch), $.sub($.gc.orig(zsBot), $.gc.orig(zaBot))),
			$.sub($.gc.cur(zsBot), $.gc.cur(zaBot)),
			$.coerce.toF26D6(+1)
		)
	);

	yield $.scfs(zsBot, $.add($.gc.cur(zsBot), dOffset));
	yield $.scfs(zsTop, $.add($.gc.cur(zsTop), dOffset));
});

export const THintBottomStrokeFree = Lib.Func(function*(e) {
	const [zBot, zTop, zsBot, zsTop] = e.args(4);
	const dBelowOrig = e.local();
	const dAboveOrig = e.local();
	const wOrig = e.local();
	const wCur = e.local();
	const spaceCur = e.local();
	yield e.set(dBelowOrig, e.sub(e.gc.orig(zsBot), e.gc.orig(zBot)));
	yield e.set(dAboveOrig, e.sub(e.gc.orig(zTop), e.gc.orig(zsTop)));
	yield e.set(wOrig, e.sub(e.gc.orig(zsTop), e.gc.orig(zsBot)));
	yield e.set(wCur, e.max(e.coerce.toF26D6(3 / 5), e.call(AdjustStrokeDistT(2), wOrig)));
	yield e.set(spaceCur, e.sub(e.sub(e.gc.cur(zTop), e.gc.cur(zBot)), wCur));
	yield e.scfs(
		zsBot,
		e.round.white(
			e.add(e.gc.cur(zBot), e.mul(spaceCur, e.div(dBelowOrig, e.add(dBelowOrig, dAboveOrig))))
		)
	);
	yield e.scfs(zsTop, e.add(e.gc.cur(zsBot), wCur));
});

export const THintTopStroke = Lib.Template(function*(e, stretch: StretchProps) {
	const [zBot, zTop, zaBot, zaTop, zsBot, zsTop] = e.args(6);

	// Perform a "free" position first -- we'd like to grab the positions
	yield e.call(THintTopStrokeFree, zBot, zTop, zsBot, zsTop);
	const dOffset = e.local();

	yield e.set(
		dOffset,
		e.call(
			TComputeOffsetPixelsForTB(stretch),
			e.call(TDistAdjustTop(stretch), e.sub(e.gc.orig(zTop), e.gc.orig(zsTop))),
			e.sub(e.gc.cur(zTop), e.gc.cur(zsTop)),
			e.call(TDistAdjustTop(stretch), e.sub(e.gc.orig(zaTop), e.gc.orig(zsTop))),
			e.sub(e.gc.cur(zaTop), e.gc.cur(zsTop)),
			e.coerce.toF26D6(-1)
		)
	);
	yield e.scfs(zsBot, e.add(e.gc.cur(zsBot), dOffset));
	yield e.scfs(zsTop, e.add(e.gc.cur(zsTop), dOffset));
});

export const THintTopStrokeFree = Lib.Func(function*(e) {
	const [zBot, zTop, zsBot, zsTop] = e.args(4);
	const dBelowOrig = e.local();
	const dAboveOrig = e.local();
	const wOrig = e.local();
	const wCur = e.local();
	const spaceCur = e.local();
	yield e.set(dBelowOrig, e.sub(e.gc.orig(zsBot), e.gc.orig(zBot)));
	yield e.set(dAboveOrig, e.sub(e.gc.orig(zTop), e.gc.orig(zsTop)));
	yield e.set(wOrig, e.sub(e.gc.orig(zsTop), e.gc.orig(zsBot)));
	yield e.set(wCur, e.max(e.coerce.toF26D6(3 / 5), e.call(AdjustStrokeDistT(2), wOrig)));
	yield e.set(spaceCur, e.sub(e.sub(e.gc.cur(zTop), e.gc.cur(zBot)), wCur));
	yield e.scfs(
		zsTop,
		e.round.white(
			e.sub(e.gc.cur(zTop), e.mul(spaceCur, e.div(dAboveOrig, e.add(dBelowOrig, dAboveOrig))))
		)
	);
	yield e.scfs(zsBot, e.sub(e.gc.cur(zsTop), wCur));
});

export const THintStrokeFreeAuto = Lib.Func(function*(e) {
	const [zBot, zTop, zsBot, zsTop] = e.args(4);
	const dBelowOrig = e.local();
	const dAboveOrig = e.local();
	const wOrig = e.local();
	const wCur = e.local();
	const spaceCur = e.local();
	const urTop = e.local();
	const rTop = e.local();
	const urBot = e.local();
	const rBot = e.local();
	yield e.set(dBelowOrig, e.sub(e.gc.orig(zsBot), e.gc.orig(zBot)));
	yield e.set(dAboveOrig, e.sub(e.gc.orig(zTop), e.gc.orig(zsTop)));
	yield e.set(wOrig, e.sub(e.gc.orig(zsTop), e.gc.orig(zsBot)));
	yield e.set(wCur, e.max(e.coerce.toF26D6(3 / 5), e.call(AdjustStrokeDistT(2), wOrig)));
	yield e.set(spaceCur, e.sub(e.sub(e.gc.cur(zTop), e.gc.cur(zBot)), wCur));
	yield e.set(
		urTop,
		e.sub(e.gc.cur(zTop), e.mul(spaceCur, e.div(dAboveOrig, e.add(dBelowOrig, dAboveOrig))))
	);
	yield e.set(
		urBot,
		e.add(e.gc.cur(zBot), e.mul(spaceCur, e.div(dBelowOrig, e.add(dBelowOrig, dAboveOrig))))
	);
	yield e.set(rTop, e.round.white(urTop));
	yield e.set(rBot, e.round.white(urBot));
	yield e.if(
		e.gt(e.abs(e.sub(rTop, urTop)), e.abs(e.sub(rBot, urBot))),
		function*() {
			yield e.scfs(zsBot, rBot);
			yield e.scfs(zsTop, e.add(rBot, wCur));
		},
		function*() {
			yield e.scfs(zsTop, rTop);
			yield e.scfs(zsBot, e.sub(rTop, wCur));
		}
	);
});

export const THintBottomEdge = Lib.Func(function*(e) {
	const [zBot, zTop, zsBot] = e.args(3);
	const adjustedDist = e.sub(e.gc.orig(zsBot), e.gc.orig(zBot));
	yield e.mdap(zsBot);
	yield e.scfs(zsBot, e.add(e.gc.cur(zBot), adjustedDist));
});

export const THintTopEdge = Lib.Func(function*(e) {
	const [zBot, zTop, zsTop] = e.args(3);
	const adjustedDist = e.sub(e.gc.orig(zTop), e.gc.orig(zsTop));
	yield e.mdap(zsTop);
	yield e.scfs(zsTop, e.sub(e.gc.cur(zTop), adjustedDist));
});

export const ULink = Lib.Func(function*($) {
	const [a, b] = $.args(2);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.orig(b), $.gc.orig(a))));
});
export const RLink = Lib.Func(function*($) {
	const [a, b] = $.args(2);
	yield $.scfs(b, $.add($.gc.cur(a), $.round.gray($.sub($.gc.orig(b), $.gc.orig(a)))));
});

export const RLinkLim = Lib.Func(function*($) {
	const [a, b, c] = $.args(3);
	const dist = $.local();
	const absDist = $.local();
	const absDistC = $.local();
	yield $.set(dist, $.round.gray($.sub($.gc.orig(b), $.gc.orig(a))));
	yield $.set(absDist, $.abs(dist));
	yield $.set(absDistC, $.abs($.sub($.gc.orig(c), $.gc.orig(a))));
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
	const [strokeBottom, strokeTop, archBottom, archTop, spurBottom, spurTop] = $.args(6);
	// These MDAPs are not necessary but VTT loves them
	yield $.mdap(strokeBottom);
	yield $.mdap(strokeTop);
	yield $.mdap(archBottom);
	yield $.mdap(archTop);
	yield $.mdap(spurBottom);
	yield $.mdap(spurTop);

	yield $.scfs(strokeBottom, $.round.black($.gc.orig(strokeBottom)));
	yield $.call(RLink, strokeBottom, strokeTop);
	yield $.call(ULink, strokeBottom, spurBottom);
	yield $.call(ULink, strokeTop, spurTop);
	yield $.call(RLinkLim, strokeBottom, archBottom, spurBottom);
	yield $.call(RLinkLim, strokeTop, archTop, spurTop);
});
