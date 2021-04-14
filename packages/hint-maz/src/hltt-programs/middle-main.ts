import { VisDistT } from "@chlorophytum/hint-programs-stoke-adjust";
import { CallableFunc, Func, Template } from "@chlorophytum/hltt-next";
import {
	abs,
	add,
	and,
	eq,
	gc,
	gt,
	gteq,
	lt,
	lteq,
	max,
	mul,
	neq,
	not,
	or,
	sub
} from "@chlorophytum/hltt-next-expr";
import { If, Scfs, While } from "@chlorophytum/hltt-next-stmt";
import {
	Bool,
	Frac,
	GlyphPoint,
	Int,
	Store,
	THandle,
	TT
} from "@chlorophytum/hltt-next-type-system";

import { ConsideredDark, GetFillRateT } from "./commons";
import { HintMultipleStrokesGiveUp } from "./give-up";
import { DecideRequiredGap, THintMultipleStrokesMidSize } from "./middle-midsize";
import { HintMultipleStrokesSimple } from "./simple";
import {
	AlignTwoStrokes,
	CollideDownTwoStrokes,
	CollideHangBottom,
	CollideHangTop,
	CollideUpTwoStrokes
} from "./stroke-omit";

const TwoN = Func(Int)
	.returns(Int)
	.def(function* ($, x) {
		yield $.Return(add(x, x));
	});
const TwoN_P1 = Func(Int)
	.returns(Int)
	.def(function* ($, x) {
		yield $.Return(add(1, add(x, x)));
	});
const TwoN_M1 = Func(Int)
	.returns(Int)
	.def(function* ($, x) {
		yield $.Return(sub(add(x, x), 1));
	});
const TwoN_M2 = Func(Int)
	.returns(Int)
	.def(function* ($, x) {
		yield $.Return(sub(add(x, x), 2));
	});

const DropArrayItemT = Template(<T extends TT>(ty: T) =>
	Func(Int, Int, Store(ty), Store(ty)).def(function* ($, N, i, pA, pB) {
		const j = $.Local(Int);
		const k = $.Local(Int);
		yield j.set(0);
		yield k.set(0);
		yield While(lt(j, N), function* () {
			yield If(neq(j, i)).Then(function* () {
				yield pB.part(k).set(pA.part(j));
				yield k.set(add(k, 1));
			});
			yield j.set(add(j, 1));
		});
	})
);

export const DropGapArrayItem = Func(Int, Int, Store(Frac), Store(Frac), Int);
DropGapArrayItem.def(function* ($, N, i, pA, pB, mode) {
	const j = $.Local(Int);
	const k = $.Local(Int);
	yield j.set(0);
	yield k.set(0);
	yield While(lt(j, N), function* () {
		yield If(neq(j, i)).Then(function* () {
			yield If(
				or(
					and(eq(mode, GAP_DROP_MODE_UP), eq(add(j, 1), i)),
					and(eq(mode, GAP_DROP_MODE_DOWN), eq(sub(j, 1), i))
				)
			)
				.Then(function* () {
					yield pB.part(k).set(max(pA.part(j), pA.part(i)));
				})
				.Else(function* () {
					yield pB.part(k).set(pA.part(j));
				});
			yield k.set(add(k, 1));
		});
		yield j.set(add(j, 1));
	});
});

export const DropArrayItemX2T = Template(<T extends TT>(ty: T) =>
	Func(Int, Int, Store(ty), Store(ty)).def(function* ($, N, i, pA, pB) {
		const j = $.Local(Int);
		const k = $.Local(Int);
		yield j.set(0);
		yield k.set(0);
		yield While(lt(j, N), function* () {
			yield If(neq(j, i)).Then(function* () {
				yield pB.part(TwoN(k)).set(pA.part(TwoN(j)));
				yield pB.part(TwoN_P1(k)).set(pA.part(TwoN_P1(j)));
				yield k.set(add(k, 1));
			});
			yield j.set(add(j, 1));
		});
	})
);

const GAP_DROP_MODE_DOWN = 0;
const GAP_DROP_MODE_UP = 1;
const UpdateNewProps = Func(
	Int,
	Bool,
	Int,
	Bool,
	Store(GlyphPoint),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(GlyphPoint),
	Store(Frac),
	Store(Frac),
	Store(Frac)
).def(function* (
	$,
	N,
	collideMode,
	mergeIndex,
	mergeDown,
	pZMids,
	pOGapMD,
	pGapMD,
	pInkMD,
	pZMids1,
	pOGapMD1,
	pGapMD1,
	pInkMD1
) {
	const dropGapIndex = $.Local(Int);
	const dropInkIndex = $.Local(Int);
	const gapDropMode = $.Local(Int);
	yield If(lteq(mergeIndex, 0))
		.Then(function* () {
			yield dropGapIndex.set(0);
			yield dropInkIndex.set(0);
			yield gapDropMode.set(GAP_DROP_MODE_UP);
		})
		.Else(
			If(gteq(mergeIndex, N))
				.Then(function* () {
					yield dropGapIndex.set(N);
					yield dropInkIndex.set(sub(N, 1));
					yield gapDropMode.set(GAP_DROP_MODE_DOWN);
				})
				.Else(
					If(mergeDown)
						.Then(function* () {
							yield dropGapIndex.set(mergeIndex);
							yield dropInkIndex.set(mergeIndex);
							yield gapDropMode.set(GAP_DROP_MODE_DOWN);
						})
						.Else(function* () {
							yield dropGapIndex.set(mergeIndex);
							yield dropInkIndex.set(sub(mergeIndex, 1));
							yield gapDropMode.set(GAP_DROP_MODE_UP);
						})
				)
		);

	yield DropGapArrayItem(add(1, N), dropGapIndex, pOGapMD, pOGapMD1, gapDropMode);
	yield DropGapArrayItem(add(1, N), dropGapIndex, pGapMD, pGapMD1, gapDropMode);
	yield DropArrayItemT(Frac)(N, dropInkIndex, pInkMD, pInkMD1);
	yield DropArrayItemX2T(GlyphPoint)(N, dropInkIndex, pZMids, pZMids1);

	// If we are in the collide mode, increase the corresponded gap's minimal depth by 1px.
	yield If(collideMode).Then(function* () {
		yield pGapMD1.part(dropInkIndex).set(add(1, pGapMD1.part(dropInkIndex)));
		yield pOGapMD1.part(dropInkIndex).set(add(1, pOGapMD1.part(dropInkIndex)));
	});
});

const THintMultipleStrokes_DoMerge_Consequence = Func(Int, Int, Bool, Store(GlyphPoint)).def(
	function* ($, N, mergeIndex, mergeDown, pZMids) {
		yield If(and(lt(0, mergeIndex), lt(mergeIndex, N))).Then(
			If(mergeDown)
				.Then(
					AlignTwoStrokes(
						pZMids.part(TwoN(mergeIndex)),
						pZMids.part(TwoN_P1(mergeIndex)),
						pZMids.part(TwoN_M2(mergeIndex)),
						pZMids.part(TwoN_M1(mergeIndex))
					)
				)
				.Else(
					AlignTwoStrokes(
						pZMids.part(TwoN_M2(mergeIndex)),
						pZMids.part(TwoN_M1(mergeIndex)),
						pZMids.part(TwoN(mergeIndex)),
						pZMids.part(TwoN_P1(mergeIndex))
					)
				)
		);
	}
);
const THintMultipleStrokes_DoMerge_ConsequenceEdge = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Int, Tb, Tt, Store(GlyphPoint)).def(function* ($, N, mergeIndex, zBot, zTop, pZMids) {
		yield If(lteq(mergeIndex, 0)).Then(function* () {
			yield Scfs(pZMids.part(0), gc.cur(zBot));
			yield Scfs(pZMids.part(1), gc.cur(zBot));
		});
		yield If(gteq(mergeIndex, N)).Then(function* () {
			yield Scfs(pZMids.part(TwoN_M2(N)), gc.cur(zTop));
			yield Scfs(pZMids.part(TwoN_M1(N)), gc.cur(zTop));
		});
	})
);

const THintMultipleStrokes_DoCollideMerge_Consequence = Func(Int, Int, Bool, Store(GlyphPoint)).def(
	function* ($, N, mergeIndex, mergeDown, pZMids) {
		yield If(and(lt(0, mergeIndex), lt(mergeIndex, N))).Then(
			If(mergeDown)
				.Then(
					CollideDownTwoStrokes(
						pZMids.part(TwoN(mergeIndex)),
						pZMids.part(TwoN_P1(mergeIndex)),
						pZMids.part(TwoN_M2(mergeIndex)),
						pZMids.part(TwoN_M1(mergeIndex))
					)
				)
				.Else(
					CollideUpTwoStrokes(
						pZMids.part(TwoN_M2(mergeIndex)),
						pZMids.part(TwoN_M1(mergeIndex)),
						pZMids.part(TwoN(mergeIndex)),
						pZMids.part(TwoN_P1(mergeIndex))
					)
				)
		);
	}
);

const THintMultipleStrokes_DoCollideMerge_ConsequenceEdge = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Int, Tb, Tt, Store(GlyphPoint)).def(function* ($, N, mergeIndex, zBot, zTop, pZMids) {
		yield If(lteq(mergeIndex, 0)).Then(
			CollideHangBottom(Tb)(zBot, pZMids.part(0), pZMids.part(1))
		);
		yield If(gteq(mergeIndex, N)).Then(
			CollideHangTop(Tt)(zTop, pZMids.part(TwoN_M2(N)), pZMids.part(TwoN_M1(N)))
		);
	})
);

const HasLargeGap = Func(Int, Store(Frac), Store(Frac)).returns(Bool);
HasLargeGap.def(function* ($, N, pOGapMD, pGapMD) {
	const hasLargerGap = $.Local(Bool);
	const jMaxExpandableGap = $.Local(Int);
	const j = $.Local(Int);

	yield hasLargerGap.set(false);
	yield j.set(0);
	yield While(and(not(hasLargerGap), lteq(j, N)), function* () {
		yield If(gteq(pOGapMD.part(j), 2)).Then(
			If(not(hasLargerGap))
				.Then(function* () {
					yield hasLargerGap.set(true);
					yield jMaxExpandableGap.set(j);
				})
				.Else(
					If(gt(pGapMD.part(j), pGapMD.part(jMaxExpandableGap))).Then(
						jMaxExpandableGap.set(j)
					)
				)
		);
		yield j.set(add(j, 1));
	});
	yield If(hasLargerGap).Then(
		pGapMD.part(jMaxExpandableGap).set(add(pGapMD.part(jMaxExpandableGap), 1))
	);
	yield $.Return(hasLargerGap);
});

const TryShrinkGapMD = Func(Int, Store(Frac), Store(Frac)).returns(Bool);
TryShrinkGapMD.def(function* ($, N, pOGapMD, pGapMD) {
	const hasShrinkableGap = $.Local(Bool);
	const jShrinkableGap = $.Local(Int);
	const j = $.Local(Int);

	yield hasShrinkableGap.set(false);
	yield jShrinkableGap.set(0);
	yield j.set(0);
	yield While(lteq(j, N), function* () {
		yield If(gteq(pGapMD.part(j), add(pOGapMD.part(j), 2))).Then(
			If(not(hasShrinkableGap))
				.Then(function* () {
					yield hasShrinkableGap.set(true);
					yield jShrinkableGap.set(j);
				})
				.Else(
					If(gt(pGapMD.part(j), pGapMD.part(jShrinkableGap))).Then(jShrinkableGap.set(j))
				)
		);
		yield j.set(add(j, 1));
	});

	yield If(hasShrinkableGap).Then(
		pGapMD.part(jShrinkableGap).set(add(pGapMD.part(jShrinkableGap), 1))
	);
	yield $.Return(hasShrinkableGap);
});

const THintMultipleStrokes_OmitImpl = Template((NMax: number, Tb: THandle, Tt: THandle) =>
	Func(
		Int,
		Bool,
		Bool,
		Int,
		Frac,
		Frac,
		Tb,
		Tt,
		Store(Frac),
		Store(GlyphPoint),
		Store(Frac),
		Store(Frac),
		Store(Int),
		Store(Int)
	)
		.returns(Bool)
		.def(function* (
			$,
			N,
			forceRoundBottom,
			forceRoundTop,
			giveUpMode,
			dist,
			reqDist,
			zBot,
			zTop,
			pOGapMD,
			pZMids,
			pGapMD,
			pInkMD,
			pRecPath,
			pRecPathCollide
		) {
			yield If(lteq(N, 1)).Then(function* () {
				yield HintMultipleStrokesGiveUp(Tb, Tt)(N, zBot, zTop, pZMids, giveUpMode);
				yield $.Return(false);
				return;
			});

			const isCollision = $.Local(Bool);
			const hasLargerGap = $.Local(Bool);
			yield isCollision.set(gteq(dist, sub(reqDist, 1)));
			yield hasLargerGap.set(false);

			yield If(isCollision).Then(hasLargerGap.set(HasLargeGap(N, pOGapMD, pGapMD)));
			yield isCollision.set(and(isCollision, not(hasLargerGap)));

			const pRecValue = $.Local(Int);
			yield If(isCollision)
				.Then(pRecValue.set(pRecPathCollide.deRef))
				.Else(pRecValue.set(pRecPath.deRef));

			const mergeIndex = $.Local(Int);
			const mergeDown = $.Local(Bool);
			yield mergeIndex.set(sub(abs(pRecValue), 1));
			yield mergeDown.set(lt(pRecValue, 0));

			const pZMids1 = $.LocalArray(GlyphPoint, 2 * NMax);
			const pOGapMD1 = $.LocalArray(Frac, 1 + NMax);
			const pGapMD1 = $.LocalArray(Frac, 1 + NMax);
			const pInkMD1 = $.LocalArray(Frac, NMax);

			yield UpdateNewProps(
				N,
				isCollision,
				mergeIndex,
				mergeDown,
				pZMids,
				pOGapMD,
				pGapMD,
				pInkMD,
				pZMids1,
				pOGapMD1,
				pGapMD1,
				pInkMD1
			);

			yield If(isCollision)
				.Then(
					THintMultipleStrokes_DoCollideMerge_ConsequenceEdge(Tb, Tt)(
						N,
						mergeIndex,
						zBot,
						zTop,
						pZMids
					)
				)
				.Else(
					THintMultipleStrokes_DoMerge_ConsequenceEdge(Tb, Tt)(
						N,
						mergeIndex,
						zBot,
						zTop,
						pZMids
					)
				);

			yield If(
				THintMultipleStrokesMainImpl(NMax, Tb, Tt)(
					sub(N, 1),
					forceRoundBottom,
					forceRoundTop,
					giveUpMode,
					zBot,
					zTop,
					pZMids1,
					pOGapMD1,
					pGapMD1,
					pInkMD1,
					pRecPath.part(1).ptr,
					pRecPathCollide.part(1).ptr
				)
			)
				.Then(function* () {
					yield If(isCollision)
						.Then(
							THintMultipleStrokes_DoCollideMerge_Consequence(
								N,
								mergeIndex,
								mergeDown,
								pZMids
							)
						)
						.Else(
							THintMultipleStrokes_DoMerge_Consequence(
								N,
								mergeIndex,
								mergeDown,
								pZMids
							)
						);
					yield $.Return(true);
				})
				.Else(function* () {
					yield HintMultipleStrokesGiveUp(Tb, Tt)(N, zBot, zTop, pZMids, giveUpMode);
					yield $.Return(false);
				});
		})
);

type TMainSig = (
	n: number,
	Tb: THandle,
	Tt: THandle
) => CallableFunc<
	[
		Int,
		Bool,
		Bool,
		Int,
		THandle,
		THandle,
		Store<GlyphPoint>,
		Store<Frac>,
		Store<Frac>,
		Store<Frac>,
		Store<Int>,
		Store<Int>
	],
	Bool
>;

export const THintMultipleStrokesMainImpl: TMainSig = Template((NMax, Tb, Tt) =>
	Func(
		Int,
		Bool,
		Bool,
		Int,
		Tb,
		Tt,
		Store(GlyphPoint),
		Store(Frac),
		Store(Frac),
		Store(Frac),
		Store(Int),
		Store(Int)
	)
		.returns(Bool)
		.def(function* (
			$,
			N,
			forceRoundBottom,
			forceRoundTop,
			giveUpMode,
			zBot,
			zTop,
			pZMids,
			pOGapMD,
			pGapMD,
			pInkMD,
			pRecPath,
			pRecPathCollide
		) {
			const dist = $.Local(Frac);
			const frBot = $.Local(Frac);
			const frTop = $.Local(Frac);
			yield frBot.set(GetFillRateT(Tb, Tt)(N, zBot, zTop, pZMids));
			yield frTop.set(GetFillRateT(Tb, Tt)(N, zBot, zTop, pZMids));
			yield dist.set(VisDistT(ConsideredDark, Tb, Tt)(zBot, zTop, frBot, frTop));

			const pxReqGap = $.Local(Frac);
			const pxReqGapOrig = $.Local(Frac);
			const pxReqInk = $.Local(Frac);

			yield pxReqGap.set(DecideRequiredGap(add(N, 1), pGapMD));
			yield pxReqGapOrig.set(DecideRequiredGap(add(N, 1), pOGapMD));
			yield pxReqInk.set(DecideRequiredGap(N, pInkMD));

			// We have an one-pixel collide? Try to shrink a large gap
			yield If(lt(dist, add(pxReqGap, pxReqInk))).Then(function* () {
				yield If(and(eq(pRecPath.deRef, 0), eq(pRecPathCollide.deRef, 0))).Then(
					function* () {
						yield TryShrinkGapMD(N, pOGapMD, pGapMD);
						yield pxReqGap.set(DecideRequiredGap(add(N, 1), pGapMD));
					}
				);
			});

			// If we have small space, do the omit path
			yield If(lt(dist, add(pxReqGap, pxReqInk))).Then(
				$.Return(
					THintMultipleStrokes_OmitImpl(NMax, Tb, Tt)(
						N,
						forceRoundBottom,
						forceRoundTop,
						giveUpMode,
						dist,
						add(pxReqGap, pxReqInk),
						zBot,
						zTop,
						pOGapMD,
						pZMids,
						pGapMD,
						pInkMD,
						pRecPath,
						pRecPathCollide
					)
				)
			);

			// If we have *many* pixels, do in a simple way
			yield If(gteq(dist, mul(4, add(pxReqGapOrig, pxReqInk)))).Then(function* () {
				yield HintMultipleStrokesSimple(Tb, Tt)(
					N,
					forceRoundBottom,
					forceRoundTop,
					zBot,
					zTop,
					pZMids
				);
				yield $.Return(true);
			});

			// Otherwise, it is mid-size.
			yield THintMultipleStrokesMidSize(NMax, Tb, Tt)(
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
			);
			yield $.Return(true);
		})
);
