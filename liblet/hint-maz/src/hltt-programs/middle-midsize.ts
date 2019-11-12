import { VisCeilT, VisFloorT } from "@chlorophytum/hint-programs-stoke-adjust";

import { ConsideredDark, Lib } from "./commons";
import { BalanceStrokes } from "./mid-size/balance";
import { InitMSDGapEntries, InitMSDInkEntries } from "./mid-size/init";
import { HighestAverageLoop } from "./mid-size/loop";
import { MovePointsForMiddleHint } from "./mid-size/move";

export const DecideRequiredGap = Lib.Func(function*(e) {
	const [N, vpGapMD] = e.args(2);
	const pGapMD = e.coerce.fromIndex.variable(vpGapMD);
	const j = e.local();
	const s = e.local();
	yield e.set(j, 0);
	yield e.set(s, 0);
	yield e.while(e.lt(j, N), function*() {
		yield e.set(s, e.add(s, e.part(pGapMD, j)));
		yield e.set(j, e.add(j, 1));
	});
	yield e.return(s);
});

export const THintMultipleStrokesMidSize = Lib.Template(function*(e, NMax: number) {
	const [
		N,
		dist,
		forceRoundBottom,
		forceRoundTop,
		frBot,
		frTop,
		zBot,
		zTop,
		vpZMids,
		vpGapMD,
		vpInkMD
	] = e.args(11);

	const pxReqGap = e.local();
	const pxReqInk = e.local();
	yield e.set(pxReqGap, e.call(DecideRequiredGap, e.add(1, N), vpGapMD));
	yield e.set(pxReqInk, e.call(DecideRequiredGap, N, vpInkMD));

	const totalInk = e.local();
	const totalGap = e.local();
	const aDist = e.local(2 * NMax + 1);
	const cDist = e.local(2 * NMax + 1);
	const divisor = e.local(2 * NMax + 1);
	const alloc = e.local(2 * NMax + 1);

	const scalar = e.local();
	yield e.set(scalar, e.div(dist, e.sub(e.gc.orig(zTop), e.gc.orig(zBot))));

	yield e.set(totalInk, 0);
	yield e.set(totalGap, 0);

	yield e.call(
		InitMSDGapEntries,
		N,
		totalGap.ptr,
		aDist.ptr,
		cDist.ptr,
		divisor.ptr,
		alloc.ptr,
		zBot,
		zTop,
		vpZMids,
		vpGapMD
	);
	yield e.call(
		InitMSDInkEntries,
		N,
		totalInk.ptr,
		aDist.ptr,
		cDist.ptr,
		divisor.ptr,
		alloc.ptr,
		vpZMids,
		vpInkMD
	);

	yield e.call(
		HighestAverageLoop,
		e.add(1, e.mul(e.coerce.toF26D6(2), N)),
		aDist.ptr,
		cDist.ptr,
		divisor.ptr,
		alloc.ptr,
		scalar,
		e.sub(e.sub(dist, pxReqInk), pxReqGap)
	);

	const aGapDist = e.local(NMax + 1);
	const gaps = e.local(NMax + 1);
	const gapOcc = e.local(NMax + 1);
	const aInkDist = e.local(NMax);
	const inks = e.local(NMax);
	const inkOcc = e.local(NMax);
	const fStrokeBalanced = e.local(NMax);

	yield e.call(splitGapInkArrayData, N, aDist.ptr, aGapDist.ptr, aInkDist.ptr);
	yield e.call(splitGapInkArrayData, N, alloc.ptr, gaps.ptr, inks.ptr);

	// Balance
	const visPosBottom = e.local();
	const visPosTop = e.local();
	const bottomSeize = e.local();
	const topSeize = e.local();
	yield e.set(visPosBottom, e.call(VisCeilT(ConsideredDark), e.gc.cur(zBot), frBot));
	yield e.set(visPosTop, e.call(VisFloorT(ConsideredDark), e.gc.cur(zTop), frTop));
	yield e.set(bottomSeize, e.sub(e.gc.cur(zBot), visPosBottom));
	yield e.set(topSeize, e.sub(visPosTop, e.gc.cur(zTop)));

	yield e.call(
		BalanceStrokes,
		N,
		scalar,
		bottomSeize,
		topSeize,
		forceRoundBottom,
		forceRoundTop,
		gapOcc.ptr,
		inkOcc.ptr,
		gaps.ptr,
		inks.ptr,
		aGapDist.ptr,
		aInkDist.ptr,
		fStrokeBalanced.ptr
	);

	yield e.call(MovePointsForMiddleHint, N, zBot, zTop, visPosBottom, gaps.ptr, inks.ptr, vpZMids);
});

const splitGapInkArrayData = Lib.Func(function*($) {
	const [N, vp, vpGap, vpInk] = $.args(4);
	const p = $.coerce.fromIndex.variable(vp);
	const pGap = $.coerce.fromIndex.variable(vpGap);
	const pInk = $.coerce.fromIndex.variable(vpInk);
	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function*() {
		yield $.set($.part(pGap, j), $.part(p, $.mul($.coerce.toF26D6(2), j)));
		yield $.set($.part(pInk, j), $.part(p, $.add(1, $.mul($.coerce.toF26D6(2), j))));
		yield $.set(j, $.add(1, j));
	});
	yield $.set($.part(pGap, N), $.part(p, $.mul($.coerce.toF26D6(2), N)));
});
