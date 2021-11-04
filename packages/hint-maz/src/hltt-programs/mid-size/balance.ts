import { Func } from "@chlorophytum/hltt-next";
import {
	add,
	and,
	div,
	eq,
	gt,
	gteq,
	lt,
	lteq,
	max,
	min,
	mul,
	not,
	or,
	sub
} from "@chlorophytum/hltt-next-expr";
import { If, While } from "@chlorophytum/hltt-next-stmt";
import { Bool, Frac, Int, Store } from "@chlorophytum/hltt-next-type-system";

enum GapOcc {
	OneClear,
	OneBlur,
	TwoClear,
	TwoUp,
	TwoDown,
	MoreClear,
	MoreUp,
	MoreDown,
	MoreBoth
}
enum InkOcc {
	Clear,
	Up,
	Down,
	Both
}

const DARKNESS_DECIDING_ENTRY_TYPE = 1 / 4;
const DARKNESS_ADJUST_PIXELS_MAX = 2 / 5;

const DecideGapOcc = Func(Int, Int, Frac, Frac, Frac).returns(Int);
DecideGapOcc.def(function* ($, N, strokeIndex, gap, bottomSeize, topSeize) {
	yield If(eq(0, strokeIndex)).Then($.Return(DecideGapOccBottom(gap, bottomSeize)));
	yield If(eq(N, strokeIndex)).Then($.Return(DecideGapOccTop(gap, topSeize)));
	yield $.Return(DecideGapOccMiddle(gap));
});

const DecideGapOccBottom = Func(Frac, Frac).returns(Int);
DecideGapOccBottom.def(function* ($, gap, bottomSeize) {
	yield If(lt(gap, 1 + DARKNESS_DECIDING_ENTRY_TYPE)).Then(
		If(lt(bottomSeize, DARKNESS_DECIDING_ENTRY_TYPE))
			.Then($.Return(GapOcc.OneClear))
			.Else($.Return(GapOcc.OneBlur))
	);
	yield If(lt(gap, 2 + DARKNESS_DECIDING_ENTRY_TYPE)).Then(
		If(lt(bottomSeize, DARKNESS_DECIDING_ENTRY_TYPE))
			.Then($.Return(GapOcc.TwoClear))
			.Else($.Return(GapOcc.TwoDown))
	);
	yield If(lt(bottomSeize, DARKNESS_DECIDING_ENTRY_TYPE))
		.Then($.Return(GapOcc.MoreClear))
		.Else($.Return(GapOcc.MoreDown));
});

const DecideGapOccTop = Func(Frac, Frac).returns(Int);
DecideGapOccTop.def(function* ($, gap, topSeize) {
	yield If(lt(gap, 1 + DARKNESS_DECIDING_ENTRY_TYPE)).Then(
		If(lt(topSeize, DARKNESS_DECIDING_ENTRY_TYPE))
			.Then($.Return(GapOcc.OneClear))
			.Else($.Return(GapOcc.OneBlur))
	);
	yield If(lt(gap, 2 + DARKNESS_DECIDING_ENTRY_TYPE)).Then(
		If(lt(topSeize, DARKNESS_DECIDING_ENTRY_TYPE))
			.Then($.Return(GapOcc.TwoClear))
			.Else($.Return(GapOcc.TwoUp))
	);
	yield If(lt(topSeize, DARKNESS_DECIDING_ENTRY_TYPE))
		.Then($.Return(GapOcc.MoreClear))
		.Else($.Return(GapOcc.MoreUp));
});

const DecideGapOccMiddle = Func(Frac).returns(Int);
DecideGapOccMiddle.def(function* ($, gap) {
	yield If(lt(gap, 1 + DARKNESS_DECIDING_ENTRY_TYPE)).Then($.Return(GapOcc.OneClear));
	yield If(lt(gap, 2 + DARKNESS_DECIDING_ENTRY_TYPE)).Then($.Return(GapOcc.TwoClear));
	yield $.Return(GapOcc.MoreClear);
});

const InitBalanceMultiStrokeHints = Func(
	Int,
	Frac,
	Frac,
	Store(Int),
	Store(Int),
	Store(Frac),
	Store(Bool)
).def(function* (e, N, bottomSeize, topSeize, pGapOcc, pInkOcc, pGaps, pfStrokeBalanced) {
	const j = e.Local(Int);
	yield j.set(0);
	yield While(lt(j, N), function* () {
		yield pInkOcc.part(j).set(InkOcc.Clear);
		yield pfStrokeBalanced.part(j).set(false);
		yield j.set(add(j, 1));
	});
	yield j.set(0);
	yield While(lteq(j, N), function* () {
		yield pGapOcc.part(j).set(DecideGapOcc(N, j, pGaps.part(j), bottomSeize, topSeize));
		yield j.set(add(j, 1));
	});
});

enum BalancePlan {
	Unknown,
	ExtDown,
	ExtUp,
	ShrinkDown,
	ShrinkUp
}

const ExtDownScore = Func(Int, Frac, Frac, Store(Int), Store(Int))
	.returns(Frac)
	.def(function* ($, j, aInk, cInk, pGapOcc, pInkOcc) {
		const occBelow = pGapOcc.part(j),
			occInk = pInkOcc.part(j);

		yield If(lt(aInk, cInk)).Then($.Return(0));

		yield If(
			not(
				and(
					or(eq(InkOcc.Clear, occInk), eq(InkOcc.Up, occInk)),
					or(
						or(eq(GapOcc.OneClear, occBelow), eq(GapOcc.TwoClear, occBelow)),
						or(eq(GapOcc.MoreClear, occBelow), eq(GapOcc.MoreDown, occBelow))
					)
				)
			)
		).Then($.Return(0));

		yield If(eq(GapOcc.OneClear, occBelow))
			.Then($.Return(min(1 / 5, sub(aInk, cInk))))
			.Else($.Return(min(4 / 5, sub(aInk, cInk))));
	});

const ExtUpScore = Func(Int, Frac, Frac, Store(Int), Store(Int))
	.returns(Frac)
	.def(function* ($, j, aInk, cInk, pGapOcc, pInkOcc) {
		const occInk = pInkOcc.part(j),
			occAbove = pGapOcc.part(add(j, 1));

		yield If(lt(aInk, cInk)).Then($.Return(0));

		yield If(
			not(
				and(
					or(eq(InkOcc.Clear, occInk), eq(InkOcc.Down, occInk)),
					or(
						or(eq(GapOcc.OneClear, occAbove), eq(GapOcc.TwoClear, occAbove)),
						or(eq(GapOcc.MoreClear, occAbove), eq(GapOcc.MoreUp, occAbove))
					)
				)
			)
		).Then($.Return(0));

		yield If(eq(GapOcc.OneClear, occAbove))
			.Then($.Return(min(1 / 5, sub(aInk, cInk))))
			.Else($.Return(min(4 / 5, sub(aInk, cInk))));
	});

const ShrinkScore = Func(Frac, Frac)
	.returns(Frac)
	.def(function* ($, aInk, cInk) {
		yield $.Return(max(sub(cInk, aInk), 0));
	});

const ExtDownExec = Func(Int, Frac, Store(Int), Store(Int), Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, delta, pGapOcc, pInkOcc, pGaps, pInks) {
		const occBelow = pGapOcc.part(j),
			occInk = pInkOcc.part(j);

		yield pInks.part(j).set(add(pInks.part(j), delta));
		yield pGaps.part(j).set(sub(pGaps.part(j), delta));
		yield If(eq(InkOcc.Clear, occInk)).Then(occInk.set(InkOcc.Down));
		yield If(eq(InkOcc.Up, occInk)).Then(occInk.set(InkOcc.Both));
		yield If(eq(GapOcc.OneClear, occBelow)).Then(occBelow.set(GapOcc.OneBlur));
		yield If(eq(GapOcc.TwoClear, occBelow)).Then(occBelow.set(GapOcc.TwoUp));
		yield If(eq(GapOcc.MoreClear, occBelow)).Then(occBelow.set(GapOcc.MoreUp));
		yield If(eq(GapOcc.MoreDown, occBelow)).Then(occBelow.set(GapOcc.MoreBoth));

		yield $.Return(true);
	});

const ExtUpExec = Func(Int, Frac, Store(Int), Store(Int), Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, delta, pGapOcc, pInkOcc, pGaps, pInks) {
		const occInk = pInkOcc.part(j),
			occAbove = pGapOcc.part(add(j, 1));

		yield pInks.part(j).set(add(pInks.part(j), delta));
		yield pGaps.part(add(1, j)).set(sub(pGaps.part(add(1, j)), delta));

		yield If(eq(InkOcc.Clear, occInk)).Then(occInk.set(InkOcc.Up));
		yield If(eq(InkOcc.Down, occInk)).Then(occInk.set(InkOcc.Both));
		yield If(eq(GapOcc.OneClear, occAbove)).Then(occAbove.set(GapOcc.OneBlur));
		yield If(eq(GapOcc.TwoClear, occAbove)).Then(occAbove.set(GapOcc.TwoDown));
		yield If(eq(GapOcc.MoreClear, occAbove)).Then(occAbove.set(GapOcc.MoreDown));
		yield If(eq(GapOcc.MoreUp, occAbove)).Then(occAbove.set(GapOcc.MoreBoth));

		yield $.Return(true);
	});

const ShrinkDownExec = Func(Int, Frac, Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, delta, pGaps, pInks) {
		yield pInks.part(j).set(sub(pInks.part(j), delta));
		yield pGaps.part(j).set(add(pGaps.part(j), delta));
		yield $.Return(true);
	});

const ShrinkUpExec = Func(Int, Frac, Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, delta, pGaps, pInks) {
		yield pInks.part(j).set(sub(pInks.part(j), delta));
		yield pGaps.part(add(1, j)).set(add(pGaps.part(add(1, j)), delta));
		yield $.Return(true);
	});

const ComputeDarknessAdjustedStrokeWidth = Func(Frac, Frac)
	.returns(Frac)
	.def(function* ($, aInk, adjInk) {
		yield $.Return(
			min(add(aInk, div(DARKNESS_ADJUST_PIXELS_MAX, max(1, aInk))), max(aInk, adjInk))
		);
	});

const CompareAndMax = Func(Bool, Store(Frac), Frac, Store(Int), Int);
CompareAndMax.def(function* ($, fForbidden, pMax, v, pIndex, i) {
	yield If(and(not(fForbidden), gt(v, pMax.deRef))).Then(function* () {
		yield pMax.deRef.set(v);
		yield pIndex.deRef.set(i);
	});
});

const BalanceOneStroke = Func(
	Int,
	Bool,
	Bool,
	Store(Int),
	Store(Int),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac)
).def(function* (
	$,
	j,
	forceRoundBottom,
	forceRoundTop,
	pGapOcc,
	pInkOcc,
	pCGaps,
	pCInks,
	pAGaps,
	pAInks
) {
	const aInk = $.Local(Frac),
		cInk = $.Local(Frac),
		aGapBelow = $.Local(Frac),
		cGapBelow = $.Local(Frac),
		aGapAbove = $.Local(Frac),
		cGapAbove = $.Local(Frac);

	yield cInk.set(pCInks.part(j));
	yield aInk.set(pAInks.part(j));
	yield cGapBelow.set(pCGaps.part(j));
	yield aGapBelow.set(pAGaps.part(j));
	yield cGapAbove.set(pCGaps.part(add(1, j)));
	yield aGapAbove.set(pAGaps.part(add(1, j)));

	yield If(lt(aInk, 1 / 8)).Then($.Exit());

	const inkDownDesired = $.Local(Frac),
		inkUpDesired = $.Local(Frac);

	yield inkDownDesired.set(
		ComputeDarknessAdjustedStrokeWidth(
			aInk,
			div(mul(aInk, add(cInk, cGapBelow)), add(aInk, aGapBelow))
		)
	);
	yield inkUpDesired.set(
		ComputeDarknessAdjustedStrokeWidth(
			aInk,
			div(mul(aInk, add(cInk, cGapAbove)), add(aInk, aGapAbove))
		)
	);

	const planToExecute = $.Local(Int);
	yield planToExecute.set(BalancePlan.Unknown);

	const deltaToApply = $.Local(Frac);
	yield deltaToApply.set(0);

	yield CompareAndMax(
		forceRoundBottom,
		deltaToApply.ptr,
		ExtDownScore(j, inkDownDesired, cInk, pGapOcc, pInkOcc),
		planToExecute.ptr,
		BalancePlan.ExtDown
	);
	yield CompareAndMax(
		forceRoundTop,
		deltaToApply.ptr,
		ExtUpScore(j, inkUpDesired, cInk, pGapOcc, pInkOcc),
		planToExecute.ptr,
		BalancePlan.ExtUp
	);
	yield CompareAndMax(
		forceRoundBottom,
		deltaToApply.ptr,
		ShrinkScore(inkDownDesired, cInk),
		planToExecute.ptr,
		BalancePlan.ShrinkDown
	);
	yield CompareAndMax(
		forceRoundTop,
		deltaToApply.ptr,
		ShrinkScore(inkUpDesired, cInk),
		planToExecute.ptr,
		BalancePlan.ShrinkUp
	);

	yield If(eq(planToExecute, BalancePlan.ExtDown)).Then(
		ExtDownExec(j, deltaToApply, pGapOcc, pInkOcc, pCGaps, pCInks)
	);
	yield If(eq(planToExecute, BalancePlan.ExtUp)).Then(
		ExtUpExec(j, deltaToApply, pGapOcc, pInkOcc, pCGaps, pCInks)
	);
	yield If(eq(planToExecute, BalancePlan.ShrinkDown)).Then(
		ShrinkDownExec(j, deltaToApply, pCGaps, pCInks)
	);
	yield If(eq(planToExecute, BalancePlan.ShrinkUp)).Then(
		ShrinkUpExec(j, deltaToApply, pCGaps, pCInks)
	);
});

export const BalanceStrokes = Func(
	Int,
	Frac,
	Frac,
	Bool,
	Bool,
	Store(Int),
	Store(Int),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Bool)
).def(function* (
	$,
	N,
	bottomSeize,
	topSeize,
	forceRoundBottom,
	forceRoundTop,
	pGapOcc,
	pInkOcc,
	pCGaps,
	pCInks,
	pAGaps,
	pAInks,
	pfStrokeBalanced
) {
	const processStrokeIndex = $.Local(Int);

	yield InitBalanceMultiStrokeHints(
		N,
		bottomSeize,
		topSeize,
		pGapOcc,
		pInkOcc,
		pCGaps,
		pfStrokeBalanced
	);

	const jj = $.Local(Int);
	const found = $.Local(Bool);
	const rankT = $.Local(Int);
	const maxRank = $.Local(Int);
	const maxStrokeWidth = $.Local(Frac);

	yield found.set(true);
	yield processStrokeIndex.set(0);
	yield While(found, function* () {
		yield found.set(false);
		yield maxRank.set(0);
		yield jj.set(0);
		yield maxStrokeWidth.set(0);
		yield While(lt(jj, N), function* () {
			yield rankT.set(0);
			yield If(eq(jj, sub(N, 1))).Then(rankT.set(1));
			yield If(eq(jj, 0)).Then(rankT.set(2));
			yield If(
				and(
					not(pfStrokeBalanced.part(jj)),
					or(
						gt(rankT, maxRank),
						and(eq(rankT, maxRank), gt(pAInks.part(jj), maxStrokeWidth))
					)
				)
			).Then(function* () {
				yield found.set(true);
				yield processStrokeIndex.set(jj);
				yield maxRank.set(rankT);
				yield maxStrokeWidth.set(pAInks.part(jj));
			});
			yield jj.set(add(jj, 1));
		});
		yield If(found).Then(function* () {
			yield BalanceOneStroke(
				processStrokeIndex,
				and(forceRoundBottom, eq(processStrokeIndex, 0)),
				and(forceRoundTop, eq(processStrokeIndex, sub(N, 1))),
				pGapOcc,
				pInkOcc,
				pCGaps,
				pCInks,
				pAGaps,
				pAInks
			);
			yield pfStrokeBalanced.part(processStrokeIndex).set(true);
		});
	});
});
