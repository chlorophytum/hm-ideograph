import { VisCeilT, VisFloorT } from "@chlorophytum/hint-programs-stoke-adjust";
import {
	add,
	Bool,
	div,
	Frac,
	Func,
	gc,
	GlyphPoint,
	Int,
	lt,
	mul,
	Store,
	sub,
	Template,
	THandle,
	While
} from "@chlorophytum/hltt-next";

import { ConsideredDark } from "./commons";
import { midBot, midTop } from "./macros";
import { BalanceStrokes } from "./mid-size/balance";
import { InitMSDGapEntries, InitMSDInkEntries } from "./mid-size/init";
import { HighestAverageLoop } from "./mid-size/loop";
import { MovePointsForMiddleHintT } from "./mid-size/move";

export const DecideRequiredGap = Func(Int, Store(Frac))
	.returns(Frac)
	.def(function* (e, N, pGapMD) {
		const j = e.Local(Int);
		const s = e.Local(Frac);
		yield j.set(0);
		yield s.set(0);
		yield While(lt(j, N), function* () {
			yield s.set(add(s, pGapMD.part(j)));
			yield j.set(add(j, 1));
		});
		yield e.Return(s);
	});

export const THintMultipleStrokesMidSize = Template((NMax: number, Tb: THandle, Tt: THandle) =>
	Func(
		Int,
		Frac,
		Bool,
		Bool,
		Frac,
		Frac,
		Tb,
		Tt,
		Store(GlyphPoint),
		Store(Frac),
		Store(Frac)
	).def(function* (
		e,
		N,
		dist,
		forceRoundBottom,
		forceRoundTop,
		frBot,
		frTop,
		zBot,
		zTop,
		pZMids,
		pGapMD,
		pInkMD
	) {
		const pxReqGap = e.Local(Frac);
		const pxReqInk = e.Local(Frac);
		yield pxReqGap.set(DecideRequiredGap(add(1, N), pGapMD));
		yield pxReqInk.set(DecideRequiredGap(N, pInkMD));

		const totalInk = e.Local(Frac);
		const totalGap = e.Local(Frac);
		const aDist = e.LocalArray(Frac, 2 * NMax + 1);
		const cDist = e.LocalArray(Frac, 2 * NMax + 1);
		const divisor = e.LocalArray(Frac, 2 * NMax + 1);
		const alloc = e.LocalArray(Frac, 2 * NMax + 1);

		const scalar = e.Local(Frac);
		yield scalar.set(div(dist, sub(gc.orig(zTop), gc.orig(zBot))));

		yield totalInk.set(0);
		yield totalGap.set(0);

		yield InitMSDGapEntries(Tb, Tt)(
			N,
			totalGap.ptr,
			aDist,
			cDist,
			divisor,
			alloc,
			zBot,
			zTop,
			pZMids,
			pGapMD
		);
		yield InitMSDInkEntries(N, totalInk.ptr, aDist, cDist, divisor, alloc, pZMids, pInkMD);

		yield HighestAverageLoop(
			add(1, mul(2, N)),
			aDist,
			cDist,
			divisor,
			alloc,
			scalar,
			sub(sub(dist, pxReqInk), pxReqGap)
		);

		const aGapDist = e.LocalArray(Frac, NMax + 1);
		const gaps = e.LocalArray(Frac, NMax + 1);
		const gapOcc = e.LocalArray(Int, NMax + 1);
		const aInkDist = e.LocalArray(Frac, NMax);
		const inks = e.LocalArray(Frac, NMax);
		const inkOcc = e.LocalArray(Int, NMax);
		const fStrokeBalanced = e.LocalArray(Bool, NMax);

		yield splitGapInkArrayData(N, aDist, aGapDist, aInkDist);
		yield splitGapInkArrayData(N, alloc, gaps, inks);

		// Balance
		const visPosBottom = e.Local(Frac);
		const visPosTop = e.Local(Frac);
		const bottomSeize = e.Local(Frac);
		const topSeize = e.Local(Frac);
		yield visPosBottom.set(VisCeilT(ConsideredDark)(gc.cur(zBot), frBot));
		yield visPosTop.set(VisFloorT(ConsideredDark)(gc.cur(zTop), frTop));
		yield bottomSeize.set(sub(gc.cur(zBot), visPosBottom));
		yield topSeize.set(sub(visPosTop, gc.cur(zTop)));

		yield BalanceStrokes(
			N,
			bottomSeize,
			topSeize,
			forceRoundBottom,
			forceRoundTop,
			gapOcc,
			inkOcc,
			gaps,
			inks,
			aGapDist,
			aInkDist,
			fStrokeBalanced
		);

		yield MovePointsForMiddleHintT(Tb, Tt)(N, zBot, zTop, visPosBottom, gaps, inks, pZMids);
	})
);

const splitGapInkArrayData = Func(Int, Store(Frac), Store(Frac), Store(Frac)).def(function* (
	$,
	N,
	p,
	pGap,
	pInk
) {
	const j = $.Local(Int);
	yield j.set(0);
	yield While(lt(j, N), function* () {
		yield pGap.part(j).set(midBot(p, j));
		yield pInk.part(j).set(midTop(p, j));
		yield j.set(add(j, 1));
	});
	yield pGap.part(N).set(midBot(p, N));
});
