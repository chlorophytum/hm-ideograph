import { VisDistT } from "@chlorophytum/hint-programs-stoke-adjust";
import { Edsl } from "@chlorophytum/hltt";
import { ConsideredDark, GetFillRate, Lib } from "./commons";
import { DecideRequiredGap, THintMultipleStrokesMidSize } from "./middle-midsize";
import { HintMultipleStrokesGiveUp, HintMultipleStrokesSimple } from "./simple";
import {
	AlignTwoStrokes,
	CollideDownTwoStrokes,
	CollideHangBottom,
	CollideHangTop,
	CollideUpTwoStrokes
} from "./stroke-omit";

export const TwoN = Lib.Func(function* ($) {
	const [x] = $.args(1);
	yield $.return($.add(x, x));
});
export const TwoN_P1 = Lib.Func(function* ($) {
	const [x] = $.args(1);
	yield $.return($.add(1, $.add(x, x)));
});
export const TwoN_M1 = Lib.Func(function* ($) {
	const [x] = $.args(1);
	yield $.return($.sub($.add(x, x), 1));
});
export const TwoN_M2 = Lib.Func(function* ($) {
	const [x] = $.args(1);
	yield $.return($.sub($.add(x, x), 2));
});
export const DropArrayItem = Lib.Func(function* ($) {
	const [N, i, vpA, vpB] = $.args(4);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pB = $.coerce.fromIndex.variable(vpB);
	const j = $.local();
	const k = $.local();
	yield $.set(j, 0);
	yield $.set(k, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.if($.neq(j, i), function* () {
			yield $.set($.part(pB, k), $.part(pA, j));
			yield $.addSet(k, 1);
		});
		yield $.addSet(j, 1);
	});
});
export const DropGapArrayItem = Lib.Func(function* ($) {
	const [N, i, vpA, vpB, mode] = $.args(5);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pB = $.coerce.fromIndex.variable(vpB);
	const j = $.local();
	const k = $.local();
	yield $.set(j, 0);
	yield $.set(k, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.if($.neq(j, i), function* () {
			yield $.if(
				$.or(
					$.and($.eq(mode, GAP_DROP_MODE_UP), $.eq($.add(j, 1), i)),
					$.and($.eq(mode, GAP_DROP_MODE_DOWN), $.eq($.sub(j, 1), i))
				)
			)
				.then(function* () {
					yield $.set($.part(pB, k), $.max($.part(pA, j), $.part(pA, i)));
				})
				.else(function* () {
					yield $.set($.part(pB, k), $.part(pA, j));
				});
			yield $.addSet(k, 1);
		});
		yield $.addSet(j, 1);
	});
});
export const DropArrayItemX2 = Lib.Func(function* ($) {
	const [N, i, vpA, vpB] = $.args(4);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pB = $.coerce.fromIndex.variable(vpB);
	const j = $.local();
	const k = $.local();
	yield $.set(j, 0);
	yield $.set(k, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.if($.neq(j, i)).then(function* () {
			yield $.set($.part(pB, $.call(TwoN, k)), $.part(pA, $.call(TwoN, j)));
			yield $.set($.part(pB, $.call(TwoN_P1, k)), $.part(pA, $.call(TwoN_P1, j)));
			yield $.addSet(k, 1);
		});
		yield $.addSet(j, 1);
	});
});

const GAP_DROP_MODE_DOWN = 0;
const GAP_DROP_MODE_UP = 1;
const UpdateNewProps = Lib.Func(function* ($) {
	const [
		N,
		collideMode,
		mergeIndex,
		mergeDown,
		vpOGapMD,
		vpGapMD,
		vpInkMD,
		vpZMids,
		vpOGapMD1,
		vpGapMD1,
		vpInkMD1,
		vpZMids1
	] = $.args(12);

	const pOGapMD1 = $.coerce.fromIndex.variable(vpOGapMD1);
	const pGapMD1 = $.coerce.fromIndex.variable(vpGapMD1);
	const dropGapIndex = $.local();
	const dropInkIndex = $.local();
	const gapDropMode = $.local();
	yield $.if($.lteq(mergeIndex, 0))
		.then(function* () {
			yield $.set(dropGapIndex, 0);
			yield $.set(dropInkIndex, 0);
			yield $.set(gapDropMode, GAP_DROP_MODE_UP);
		})
		.else(
			$.if($.gteq(mergeIndex, N))
				.then(function* () {
					yield $.set(dropGapIndex, N);
					yield $.set(dropInkIndex, $.sub(N, 1));
					yield $.set(gapDropMode, GAP_DROP_MODE_DOWN);
				})
				.else(
					$.if(mergeDown)
						.then(function* () {
							yield $.set(dropGapIndex, mergeIndex);
							yield $.set(dropInkIndex, mergeIndex);
							yield $.set(gapDropMode, GAP_DROP_MODE_DOWN);
						})
						.else(function* () {
							yield $.set(dropGapIndex, mergeIndex);
							yield $.set(dropInkIndex, $.sub(mergeIndex, 1));
							yield $.set(gapDropMode, GAP_DROP_MODE_UP);
						})
				)
		);

	yield $.call(DropGapArrayItem, $.add(1, N), dropGapIndex, vpOGapMD, vpOGapMD1, gapDropMode);
	yield $.call(DropGapArrayItem, $.add(1, N), dropGapIndex, vpGapMD, vpGapMD1, gapDropMode);
	yield $.call(DropArrayItem, N, dropInkIndex, vpInkMD, vpInkMD1);
	yield $.call(DropArrayItemX2, N, dropInkIndex, vpZMids, vpZMids1);

	// If we are in the collide mode, increase the corresponded gap's minimal depth by 1px.
	yield $.if(collideMode).then(function* () {
		yield $.set(
			$.part(pGapMD1, dropInkIndex),
			$.add($.coerce.toF26D6(1), $.part(pGapMD1, dropInkIndex))
		);
		yield $.set(
			$.part(pOGapMD1, dropInkIndex),
			$.add($.coerce.toF26D6(1), $.part(pOGapMD1, dropInkIndex))
		);
	});
});

const THintMultipleStrokes_DoMerge_Consequence = Lib.Func(function* ($) {
	const [N, mergeIndex, mergeDown, vpZMids] = $.args(4);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	yield $.if($.and($.lt(0, mergeIndex), $.lt(mergeIndex, N))).then(
		$.if(mergeDown)
			.then(
				$.call(
					AlignTwoStrokes,
					$.part(pZMids, $.call(TwoN, mergeIndex)),
					$.part(pZMids, $.call(TwoN_P1, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M2, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M1, mergeIndex))
				)
			)
			.else(
				$.call(
					AlignTwoStrokes,
					$.part(pZMids, $.call(TwoN_M2, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M1, mergeIndex)),
					$.part(pZMids, $.call(TwoN, mergeIndex)),
					$.part(pZMids, $.call(TwoN_P1, mergeIndex))
				)
			)
	);
});
const THintMultipleStrokes_DoMerge_ConsequenceEdge = Lib.Func(function* ($) {
	const [N, mergeIndex, zBot, zTop, vpZMids] = $.args(5);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	yield $.if($.lteq(mergeIndex, 0)).then(function* () {
		yield $.scfs($.part(pZMids, 0), $.gc.cur(zBot));
		yield $.scfs($.part(pZMids, 1), $.gc.cur(zBot));
	});
	yield $.if($.gteq(mergeIndex, N)).then(function* () {
		yield $.scfs($.part(pZMids, $.call(TwoN_M2, N)), $.gc.cur(zTop));
		yield $.scfs($.part(pZMids, $.call(TwoN_M1, N)), $.gc.cur(zTop));
	});
});
const THintMultipleStrokes_DoMerge: Edsl.Template<Edsl.VkFpgm, [number]> = Lib.Template(function* (
	$,
	N: number
) {
	const [
		forceRoundBottom,
		forceRoundTop,
		zBot,
		zTop,
		vpOGapMD,
		vpZMids,
		vpGapMD,
		vpInkMD,
		vpRecPath,
		vpRecPathCollide,
		giveUpMode
	] = $.args(11);

	const pRecPath = $.coerce.fromIndex.variable(vpRecPath);
	const pRecPathCollide = $.coerce.fromIndex.variable(vpRecPathCollide);
	const pRecValue = pRecPath;

	yield $.if($.eq(pRecValue, 0)).then(function* () {
		yield $.call(HintMultipleStrokesGiveUp, N, zBot, zTop, vpZMids, giveUpMode);
		yield $.return(0);
	});

	const mergeIndex = $.local();
	const mergeDown = $.local();
	yield $.set(mergeIndex, $.sub($.abs(pRecValue), 1));
	yield $.set(mergeDown, $.lt(pRecValue, 0));

	const oGapMD1 = $.local(N);
	const zMids1 = $.local(2 * N - 2);
	const gapMD1 = $.local(N);
	const inkMD1 = $.local(N - 1);
	yield $.call(
		UpdateNewProps,
		N,
		0,
		mergeIndex,
		mergeDown,
		vpOGapMD,
		vpGapMD,
		vpInkMD,
		vpZMids,
		oGapMD1.ptr,
		gapMD1.ptr,
		inkMD1.ptr,
		zMids1.ptr
	);

	yield $.call(THintMultipleStrokes_DoMerge_ConsequenceEdge, N, mergeIndex, zBot, zTop, vpZMids);
	yield $.if(
		$.call(
			THintMultipleStrokesMainImpl(N - 1),
			forceRoundBottom,
			forceRoundTop,
			zBot,
			zTop,
			oGapMD1.ptr,
			zMids1.ptr,
			gapMD1.ptr,
			inkMD1.ptr,
			$.part(pRecPath, 1).ptr,
			$.part(pRecPathCollide, 1).ptr,
			giveUpMode
		)
	)
		.then(function* () {
			yield $.call(
				THintMultipleStrokes_DoMerge_Consequence,
				N,
				mergeIndex,
				mergeDown,
				vpZMids
			);
			yield $.return(1);
		})
		.else(function* () {
			yield $.call(HintMultipleStrokesGiveUp, N, zBot, zTop, vpZMids, giveUpMode);
			yield $.return(0);
		});
});
const THintMultipleStrokes_DoCollideMerge_Consequence = Lib.Func(function* ($) {
	const [N, mergeIndex, mergeDown, vpZMids] = $.args(4);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	yield $.if($.and($.lt(0, mergeIndex), $.lt(mergeIndex, N))).then(
		$.if(mergeDown)
			.then(
				$.call(
					CollideDownTwoStrokes,
					$.part(pZMids, $.call(TwoN, mergeIndex)),
					$.part(pZMids, $.call(TwoN_P1, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M2, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M1, mergeIndex))
				)
			)
			.else(
				$.call(
					CollideUpTwoStrokes,
					$.part(pZMids, $.call(TwoN_M2, mergeIndex)),
					$.part(pZMids, $.call(TwoN_M1, mergeIndex)),
					$.part(pZMids, $.call(TwoN, mergeIndex)),
					$.part(pZMids, $.call(TwoN_P1, mergeIndex))
				)
			)
	);
});
const THintMultipleStrokes_DoCollideMerge_ConsequenceEdge = Lib.Func(function* ($) {
	const [N, mergeIndex, zBot, zTop, vpZMids] = $.args(5);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	yield $.if($.lteq(mergeIndex, 0)).then(
		$.call(CollideHangBottom, zBot, $.part(pZMids, 0), $.part(pZMids, 1))
	);
	yield $.if($.gteq(mergeIndex, N)).then(
		$.call(
			CollideHangTop,
			zTop,
			$.part(pZMids, $.call(TwoN_M2, N)),
			$.part(pZMids, $.call(TwoN_M1, N))
		)
	);
});

const THintMultipleStrokes_DoCollideMerge: Edsl.Template<Edsl.VkFpgm, [number]> = Lib.Template(
	function* ($, N: number) {
		const [
			forceRoundBottom,
			forceRoundTop,
			zBot,
			zTop,
			vpOGapMD,
			vpZMids,
			vpGapMD,
			vpInkMD,
			vpRecPath,
			vpRecPathCollide,
			giveUpMode
		] = $.args(11);
		const pRecPath = $.coerce.fromIndex.variable(vpRecPath);
		const pRecPathCollide = $.coerce.fromIndex.variable(vpRecPathCollide);
		const pRecValue = pRecPathCollide;

		yield $.if($.eq(pRecValue, 0)).then(function* () {
			yield $.call(HintMultipleStrokesGiveUp, N, zBot, zTop, vpZMids, giveUpMode);
			yield $.return(0);
		});

		const collideIndex = $.local();
		const collideDown = $.local();
		yield $.set(collideIndex, $.sub($.abs(pRecValue), 1));
		yield $.set(collideDown, $.lt(pRecValue, 0));

		const oGapMD1 = $.local(N);
		const zMids1 = $.local(2 * N - 2);
		const gapMD1 = $.local(N);
		const inkMD1 = $.local(N - 1);
		yield $.call(
			UpdateNewProps,
			N,
			1,
			collideIndex,
			collideDown,
			vpOGapMD,
			vpGapMD,
			vpInkMD,
			vpZMids,
			oGapMD1.ptr,
			gapMD1.ptr,
			inkMD1.ptr,
			zMids1.ptr
		);

		yield $.call(
			THintMultipleStrokes_DoCollideMerge_ConsequenceEdge,
			N,
			collideIndex,
			zBot,
			zTop,
			vpZMids
		);
		yield $.if(
			$.call(
				THintMultipleStrokesMainImpl(N - 1),
				forceRoundBottom,
				forceRoundTop,
				zBot,
				zTop,
				oGapMD1.ptr,
				zMids1.ptr,
				gapMD1.ptr,
				inkMD1.ptr,
				$.part(pRecPath, 1).ptr,
				$.part(pRecPathCollide, 1).ptr,
				giveUpMode
			)
		)
			.then(function* () {
				yield $.call(
					THintMultipleStrokes_DoCollideMerge_Consequence,
					N,
					collideIndex,
					collideDown,
					vpZMids
				);
				yield $.return(1);
			})
			.else(function* () {
				yield $.call(HintMultipleStrokesGiveUp, N, zBot, zTop, vpZMids, giveUpMode);
				yield $.return(0);
			});
	}
);

const THasLargeGap = Lib.Template(function* ($, N: number) {
	const [vpOGapMD, vpGapMD] = $.args(2);

	const hasLargerGap = $.local();
	const jMaxExpandableGap = $.local();
	const j = $.local();
	const pOGapMD = $.coerce.fromIndex.variable(vpOGapMD);
	const pGapMD = $.coerce.fromIndex.variable(vpGapMD);

	yield $.set(hasLargerGap, 0);
	yield $.set(j, 0);
	yield $.while($.and($.not(hasLargerGap), $.lteq(j, N)), function* () {
		yield $.if($.gteq($.part(pOGapMD, j), $.coerce.toF26D6(2))).then(
			$.if($.not(hasLargerGap))
				.then($.begin($.set(hasLargerGap, 1), $.set(jMaxExpandableGap, j)))
				.else(
					$.if($.gt($.part(pGapMD, j), $.part(pGapMD, jMaxExpandableGap))).then(
						$.set(jMaxExpandableGap, j)
					)
				)
		);
		yield $.addSet(j, 1);
	});
	yield $.if(hasLargerGap).then($.addSet($.part(pGapMD, jMaxExpandableGap), $.coerce.toF26D6(1)));
	yield $.return(hasLargerGap);
});

const TTryShrinkGapMD = Lib.Template(function* ($, N: number) {
	const [vpOGapMD, vpGapMD] = $.args(2);

	const pOGapMD = $.coerce.fromIndex.variable(vpOGapMD);
	const pGapMD = $.coerce.fromIndex.variable(vpGapMD);

	const hasShrinkableGap = $.local();
	const jShrinkableGap = $.local();
	const j = $.local();

	yield $.set(hasShrinkableGap, 0);
	yield $.set(jShrinkableGap, 0);
	yield $.set(j, 0);
	yield $.while($.lteq(j, N), function* () {
		yield $.if($.gteq($.part(pGapMD, j), $.add($.part(pOGapMD, j), $.coerce.toF26D6(2)))).then(
			$.if($.not(hasShrinkableGap))
				.then($.begin($.set(hasShrinkableGap, 1), $.set(jShrinkableGap, j)))
				.else(
					$.if(
						$.gt($.part(pGapMD, j), $.part(pGapMD, jShrinkableGap)),
						$.set(jShrinkableGap, j)
					)
				)
		);
		yield $.addSet(j, 1);
	});

	yield $.if(hasShrinkableGap, $.subSet($.part(pGapMD, jShrinkableGap), $.coerce.toF26D6(1)));
	yield $.return(hasShrinkableGap);
});

const THintMultipleStrokes_OmitImpl = Lib.Template(function* ($, N: number) {
	const [
		dist,
		reqDist,
		forceRoundBottom,
		forceRoundTop,
		zBot,
		zTop,
		vpOGapMD,
		vpZMids,
		vpGapMD,
		vpInkMD,
		vpRecPath,
		vpRecPathCollide,
		giveUpMode
	] = $.args(13);

	if (N <= 1) {
		yield $.call(HintMultipleStrokesGiveUp, N, zBot, zTop, vpZMids, giveUpMode);
		yield $.return(0);
		return;
	}

	const isCollision = $.local();
	const hasLargerGap = $.local();
	yield $.set(isCollision, $.gteq(dist, $.sub(reqDist, $.coerce.toF26D6(1))));
	yield $.set(hasLargerGap, 0);

	yield $.if(isCollision).then($.set(hasLargerGap, $.call(THasLargeGap(N), vpOGapMD, vpGapMD)));

	yield $.if($.and(isCollision, $.not(hasLargerGap)))
		.then(
			$.return(
				$.call(
					THintMultipleStrokes_DoCollideMerge(N),
					forceRoundBottom,
					forceRoundTop,
					zBot,
					zTop,
					vpOGapMD,
					vpZMids,
					vpGapMD,
					vpInkMD,
					vpRecPath,
					vpRecPathCollide,
					giveUpMode
				)
			)
		)
		.else(
			$.return(
				$.call(
					THintMultipleStrokes_DoMerge(N),
					forceRoundBottom,
					forceRoundTop,
					zBot,
					zTop,
					vpOGapMD,
					vpZMids,
					vpGapMD,
					vpInkMD,
					vpRecPath,
					vpRecPathCollide,
					giveUpMode
				)
			)
		);
});

export const THintMultipleStrokesMainImpl = Lib.Template(function* ($, N: number) {
	const [
		forceRoundBottom,
		forceRoundTop,
		zBot,
		zTop,
		vpOGapMD,
		vpZMids,
		vpGapMD,
		vpInkMD,
		vpRecPath,
		vpRecPathCollide,
		giveUpMode
	] = $.args(11);

	const dist = $.local();
	const frBot = $.local();
	const frTop = $.local();
	yield $.set(frBot, $.call(GetFillRate, N, zBot, zTop, vpZMids));
	yield $.set(frTop, $.call(GetFillRate, N, zBot, zTop, vpZMids));
	yield $.set(dist, $.call(VisDistT(ConsideredDark), zBot, zTop, frBot, frTop));

	const pxReqGap = $.local();
	const pxReqGapOrig = $.local();
	const pxReqInk = $.local();

	yield $.set(pxReqGap, $.call(DecideRequiredGap, $.add(1, N), vpGapMD));
	yield $.set(pxReqGapOrig, $.call(DecideRequiredGap, $.add(1, N), vpOGapMD));
	yield $.set(pxReqInk, $.call(DecideRequiredGap, N, vpInkMD));

	// We have an one-pixel collide? Try to shrink a large gap
	yield $.if($.lt(dist, $.add(pxReqGap, pxReqInk))).then(function* () {
		const pRecPath = $.coerce.fromIndex.variable(vpRecPath);
		const pRecPathCollide = $.coerce.fromIndex.variable(vpRecPathCollide);
		yield $.if($.and($.not(pRecPath), $.not(pRecPathCollide))).then(function* () {
			yield $.call(TTryShrinkGapMD(N), vpOGapMD, vpGapMD);
			yield $.set(pxReqGap, $.call(DecideRequiredGap, $.add(1, N), vpGapMD));
		});
	});

	yield $.if($.lt(dist, $.add(pxReqGap, pxReqInk))).then(
		$.return(
			$.call(
				THintMultipleStrokes_OmitImpl(N),
				dist,
				$.add(pxReqGap, pxReqInk),
				forceRoundBottom,
				forceRoundTop,
				zBot,
				zTop,
				vpOGapMD,
				vpZMids,
				vpGapMD,
				vpInkMD,
				vpRecPath,
				vpRecPathCollide,
				giveUpMode
			)
		)
	);

	// If we have *many* pixels, do in a simple way
	yield $.if($.gteq(dist, $.mul($.coerce.toF26D6(4), $.add(pxReqGapOrig, pxReqInk)))).then(
		function* () {
			yield $.call(
				HintMultipleStrokesSimple,
				N,
				forceRoundBottom,
				forceRoundTop,
				zBot,
				zTop,
				vpZMids
			);
			yield $.return(1);
		}
	);

	const allocN = 8 * Math.ceil(N / 8);

	yield $.call(
		THintMultipleStrokesMidSize(allocN),
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
	);
	yield $.return(1);
});