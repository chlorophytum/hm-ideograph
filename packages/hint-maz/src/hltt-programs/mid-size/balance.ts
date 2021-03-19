import {
	add,
	and,
	Bool,
	div,
	eq,
	Frac,
	Func,
	gt,
	gteq,
	If,
	Int,
	lt,
	lteq,
	max,
	min,
	mul,
	neg,
	not,
	or,
	Store,
	sub,
	While
} from "@chlorophytum/hltt-next";

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

const DARKNESS_ADJUST_PIXELS_MAX = 1 / 4;

const DecideGapOcc = Func(Int, Int, Frac, Frac, Frac).returns(Int);
DecideGapOcc.def(function* ($, N, strokeIndex, gap, bottomSeize, topSeize) {
	yield If(eq(0, strokeIndex)).Then($.Return(DecideGapOccBottom(gap, bottomSeize)));
	yield If(eq(N, strokeIndex)).Then($.Return(DecideGapOccTop(gap, topSeize)));
	yield $.Return(DecideGapOccMiddle(gap));
});

const DecideGapOccBottom = Func(Frac, Frac).returns(Int);
DecideGapOccBottom.def(function* ($, gap, bottomSeize) {
	yield If(lt(gap, 1 + 1 / 5)).Then(
		If(lt(bottomSeize, 1 / 5))
			.Then($.Return(GapOcc.OneClear))
			.Else($.Return(GapOcc.OneBlur))
	);
	yield If(lt(gap, 2 + 1 / 5)).Then(
		If(lt(bottomSeize, 1 / 5))
			.Then($.Return(GapOcc.TwoClear))
			.Else($.Return(GapOcc.TwoDown))
	);
	yield If(lt(bottomSeize, 1 / 5))
		.Then($.Return(GapOcc.MoreClear))
		.Else($.Return(GapOcc.MoreDown));
});

const DecideGapOccTop = Func(Frac, Frac).returns(Int);
DecideGapOccTop.def(function* ($, gap, topSeize) {
	yield If(lt(gap, 1 + 1 / 5)).Then(
		If(lt(topSeize, 1 / 5))
			.Then($.Return(GapOcc.OneClear))
			.Else($.Return(GapOcc.OneBlur))
	);
	yield If(lt(gap, 2 + 1 / 5)).Then(
		If(lt(topSeize, 1 / 5))
			.Then($.Return(GapOcc.TwoClear))
			.Else($.Return(GapOcc.TwoUp))
	);
	yield If(lt(topSeize, 1 / 5))
		.Then($.Return(GapOcc.MoreClear))
		.Else($.Return(GapOcc.MoreUp));
});

const DecideGapOccMiddle = Func(Frac).returns(Int);
DecideGapOccMiddle.def(function* ($, gap) {
	yield If(lt(gap, 1 + 1 / 5)).Then($.Return(GapOcc.OneClear));
	yield If(lt(gap, 2 + 1 / 5)).Then($.Return(GapOcc.TwoClear));
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

const BalanceOneStrokeExtDown = Func(
	Int,
	Frac,
	Frac,
	Store(Int),
	Store(Int),
	Store(Frac),
	Store(Frac)
)
	.returns(Bool)
	.def(function* ($, j, desired, current, pGapOcc, pInkOcc, pGaps, pInks) {
		const occBelow = pGapOcc.part(j),
			occInk = pInkOcc.part(j);
		const delta = $.Local(Frac);

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
		).Then($.Return(false));

		yield If(eq(GapOcc.OneClear, occBelow))
			.Then(delta.set(min(1 / 5, sub(desired, current))))
			.Else(delta.set(min(4 / 5, sub(desired, current))));

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

const BalanceOneStrokeExtUp = Func(
	Int,
	Frac,
	Frac,
	Store(Int),
	Store(Int),
	Store(Frac),
	Store(Frac)
)
	.returns(Bool)
	.def(function* ($, j, desired, current, pGapOcc, pInkOcc, pGaps, pInks) {
		const occInk = pInkOcc.part(j),
			occAbove = pGapOcc.part(add(j, 1));
		const delta = $.Local(Frac);

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
		).Then($.Return(false));

		yield If(eq(GapOcc.OneClear, occAbove))
			.Then(delta.set(min(1 / 5, sub(desired, current))))
			.Else(delta.set(min(4 / 5, sub(desired, current))));

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

const ShrinkDelta = Func(Frac, Frac)
	.returns(Frac)
	.def(function* ($, aInk, cInk) {
		yield $.Return(neg(sub(cInk, max(3 / 5, aInk))));
	});

const BalanceShrinkOneStrokeDown = Func(Int, Frac, Frac, Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, aInk, cInk, pInks, pGaps) {
		const delta = $.Local(Frac);
		yield delta.set(ShrinkDelta(aInk, cInk));
		yield pInks.part(j).set(add(pInks.part(j), delta));
		yield pGaps.part(j).set(sub(pGaps.part(j), delta));
		yield $.Return(true);
	});

const BalanceShrinkOneStrokeUp = Func(Int, Frac, Frac, Store(Frac), Store(Frac))
	.returns(Bool)
	.def(function* ($, j, aInk, cInk, pInks, pGaps) {
		const delta = $.Local(Frac);
		yield delta.set(ShrinkDelta(aInk, cInk));
		yield pInks.part(j).set(add(pInks.part(j), delta));
		yield pGaps.part(add(1, j)).set(sub(pGaps.part(add(1, j)), delta));
		yield $.Return(true);
	});

const ComputeDarknessAdjustedStrokeWidth = Func(Frac, Frac)
	.returns(Frac)
	.def(function* ($, aInk, adjInk) {
		yield $.Return(
			min(add(aInk, div(DARKNESS_ADJUST_PIXELS_MAX, max(1, aInk))), max(aInk, adjInk))
		);
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
	e,
	j,
	forceRoundBottom,
	forceRoundTop,
	pGapOcc,
	pInkOcc,
	pCGaps,
	pCInks,
	pAGap,
	pAInk
) {
	const aInk = e.Local(Frac),
		cInk = e.Local(Frac),
		aGapBelow = e.Local(Frac),
		cGapBelow = e.Local(Frac),
		aGapAbove = e.Local(Frac),
		cGapAbove = e.Local(Frac);

	yield cInk.set(pCInks.part(j));
	yield aInk.set(pAInk.part(j));
	yield cGapBelow.set(pCGaps.part(j));
	yield aGapBelow.set(pAGap.part(j));
	yield cGapAbove.set(pCGaps.part(add(1, j)));
	yield aGapAbove.set(pAGap.part(add(1, j)));

	yield If(lt(aInk, 1 / 8)).Then(e.Exit());

	const hasMoreSpaceBelow = e.Local(Bool),
		canExtendDown = e.Local(Bool),
		canExtendUp = e.Local(Bool),
		canShrinkDown = e.Local(Bool),
		canShrinkUp = e.Local(Bool),
		inkDownDesired = e.Local(Frac),
		inkUpDesired = e.Local(Frac);

	yield hasMoreSpaceBelow.set(
		or(gt(cGapBelow, cGapAbove), and(eq(cGapBelow, cGapAbove), gteq(aGapBelow, aGapAbove)))
	);

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

	yield canExtendDown.set(and(not(forceRoundBottom), lt(cInk, inkDownDesired)));
	yield canExtendUp.set(and(not(forceRoundTop), lt(cInk, inkUpDesired)));
	yield canShrinkDown.set(
		and(not(forceRoundBottom), and(gt(aGapBelow, 1 / 8), gt(cInk, inkDownDesired)))
	);
	yield canShrinkUp.set(
		and(not(forceRoundTop), and(gt(aGapAbove, 1 / 8), gt(cInk, inkUpDesired)))
	);

	const progress = e.Local(Bool);
	yield progress.set(false);

	yield If(hasMoreSpaceBelow)
		.Then(function* () {
			yield If(and(not(progress), canExtendDown)).Then(
				progress.set(
					BalanceOneStrokeExtDown(
						j,
						inkDownDesired,
						cInk,
						pGapOcc,
						pInkOcc,
						pCGaps,
						pCInks
					)
				)
			);
			yield If(and(not(progress), canExtendUp)).Then(
				progress.set(
					BalanceOneStrokeExtUp(j, inkUpDesired, cInk, pGapOcc, pInkOcc, pCGaps, pCInks)
				)
			);
			yield If(and(not(progress), canShrinkUp)).Then(
				progress.set(BalanceShrinkOneStrokeUp(j, inkUpDesired, cInk, pCInks, pCGaps))
			);
			yield If(and(not(progress), canShrinkDown)).Then(
				progress.set(BalanceShrinkOneStrokeDown(j, inkDownDesired, cInk, pCInks, pCGaps))
			);
		})
		.Else(function* () {
			yield If(and(not(progress), canExtendUp)).Then(
				progress.set(
					BalanceOneStrokeExtUp(j, inkUpDesired, cInk, pGapOcc, pInkOcc, pCGaps, pCInks)
				)
			);
			yield If(and(not(progress), canExtendDown)).Then(
				progress.set(
					BalanceOneStrokeExtDown(
						j,
						inkDownDesired,
						cInk,
						pGapOcc,
						pInkOcc,
						pCGaps,
						pCInks
					)
				)
			);
			yield If(and(not(progress), canShrinkDown)).Then(
				progress.set(BalanceShrinkOneStrokeDown(j, inkDownDesired, cInk, pCInks, pCGaps))
			);
			yield If(and(not(progress), canShrinkUp)).Then(
				progress.set(BalanceShrinkOneStrokeUp(j, inkUpDesired, cInk, pCInks, pCGaps))
			);
		});
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
	yield InitBalanceMultiStrokeHints(
		N,
		bottomSeize,
		topSeize,
		pGapOcc,
		pInkOcc,
		pCGaps,
		pfStrokeBalanced
	);

	yield If(gt(N, 0)).Then(
		BalanceOneStroke(
			0,
			forceRoundBottom,
			forceRoundTop,
			pGapOcc,
			pInkOcc,
			pCGaps,
			pCInks,
			pAGaps,
			pAInks
		)
	);
	yield If(gt(N, 1)).Then(
		BalanceOneStroke(
			sub(N, 1),
			forceRoundBottom,
			forceRoundTop,
			pGapOcc,
			pInkOcc,
			pCGaps,
			pCInks,
			pAGaps,
			pAInks
		)
	);

	const jj = $.Local(Int);
	const find = $.Local(Bool);
	const processStrokeIndex = $.Local(Int);
	const maxStrokeWidth = $.Local(Frac);

	yield find.set(true);
	yield processStrokeIndex.set(0);
	yield While(find, function* () {
		yield find.set(false);
		yield jj.set(1);
		yield maxStrokeWidth.set(0);
		yield While(lt(add(1, jj), N), function* () {
			yield If(and(not(pfStrokeBalanced.part(jj)), gt(pAInks.part(jj), maxStrokeWidth))).Then(
				function* () {
					yield find.set(true);
					yield processStrokeIndex.set(jj);
					yield maxStrokeWidth.set(pAInks.part(jj));
				}
			);
			yield jj.set(add(jj, 1));
		});
		yield If(find).Then(function* () {
			yield BalanceOneStroke(
				processStrokeIndex,
				forceRoundBottom,
				forceRoundTop,
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
