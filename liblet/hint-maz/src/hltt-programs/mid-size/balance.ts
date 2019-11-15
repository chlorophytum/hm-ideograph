import { Lib } from "../commons";

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

const DecideGapOcc = Lib.Func(function*($) {
	const [N, strokeIndex, gap, bottomSeize, topSeize] = $.args(5);
	yield $.if($.eq(0, strokeIndex), function*() {
		yield $.return($.call(DecideGapOccBottom, gap, bottomSeize));
	});
	yield $.if($.eq(N, strokeIndex), function*() {
		yield $.return($.call(DecideGapOccTop, gap, topSeize));
	});
	yield $.return($.call(DecideGapOccMiddle, gap));
});
const DecideGapOccBottom = Lib.Func(function*($) {
	const [gap, bottomSeize] = $.args(2);
	yield $.if($.lt(gap, $.coerce.toF26D6(1 + 1 / 5)), function*() {
		yield $.if(
			$.lt(bottomSeize, $.coerce.toF26D6(1 / 5)),
			function*() {
				yield $.return(GapOcc.OneClear);
			},
			function*() {
				yield $.return(GapOcc.OneBlur);
			}
		);
	});
	yield $.if($.lt(gap, $.coerce.toF26D6(2 + 1 / 5)), function*() {
		yield $.if(
			$.lt(bottomSeize, $.coerce.toF26D6(1 / 5)),
			function*() {
				yield $.return(GapOcc.TwoClear);
			},
			function*() {
				yield $.return(GapOcc.TwoDown);
			}
		);
	});
	yield $.if(
		$.lt(bottomSeize, $.coerce.toF26D6(1 / 5)),
		function*() {
			yield $.return(GapOcc.MoreClear);
		},
		function*() {
			yield $.return(GapOcc.MoreDown);
		}
	);
});
const DecideGapOccTop = Lib.Func(function*($) {
	const [gap, topSeize] = $.args(2);
	yield $.if($.lt(gap, $.coerce.toF26D6(1 + 1 / 5)), function*() {
		yield $.if(
			$.lt(topSeize, $.coerce.toF26D6(1 / 5)),
			function*() {
				yield $.return(GapOcc.OneClear);
			},
			function*() {
				yield $.return(GapOcc.OneBlur);
			}
		);
	});
	yield $.if($.lt(gap, $.coerce.toF26D6(2 + 1 / 5)), function*() {
		yield $.if(
			$.lt(topSeize, $.coerce.toF26D6(1 / 5)),
			function*() {
				yield $.return(GapOcc.TwoClear);
			},
			function*() {
				yield $.return(GapOcc.TwoUp);
			}
		);
	});
	yield $.if(
		$.lt(topSeize, $.coerce.toF26D6(1 / 5)),
		function*() {
			yield $.return(GapOcc.MoreClear);
		},
		function*() {
			yield $.return(GapOcc.MoreUp);
		}
	);
});
const DecideGapOccMiddle = Lib.Func(function*($) {
	const [gap] = $.args(1);
	yield $.if($.lt(gap, $.coerce.toF26D6(1 + 1 / 5)), function*() {
		yield $.return(GapOcc.OneClear);
	});
	yield $.if($.lt(gap, $.coerce.toF26D6(2 + 1 / 5)), function*() {
		yield $.return(GapOcc.TwoClear);
	});
	yield $.return(GapOcc.MoreClear);
});

const InitBalanceMultiStrokeHints = Lib.Func(function*(e) {
	const [N, bottomSeize, topSeize, vpGapOcc, vpInkOcc, vpGaps, vpfStrokeBalanced] = e.args(7);
	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pfStrokeBalanced = e.coerce.fromIndex.variable(vpfStrokeBalanced);
	const j = e.local();
	yield e.set(j, 0);
	yield e.while(e.lt(j, N), function*() {
		yield e.set(e.part(pInkOcc, j), InkOcc.Clear);
		yield e.set(e.part(pfStrokeBalanced, j), 0);
		yield e.set(j, e.add(j, 1));
	});
	yield e.set(j, 0);
	yield e.while(e.lteq(j, N), function*() {
		yield e.set(
			e.part(pGapOcc, j),
			e.call(DecideGapOcc, N, j, e.part(pGaps, j), bottomSeize, topSeize)
		);
		yield e.set(j, e.add(j, 1));
	});
});

const BalanceOneStrokeExtDown = Lib.Func(function*(e) {
	const [j, desired, current, vpGapOcc, vpInkOcc, vpGaps, vpInks] = e.args(7);

	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);

	const occBelow = e.part(pGapOcc, j),
		occInk = e.part(pInkOcc, j);
	const delta = e.local();

	yield e.if(
		e.not(
			e.and(
				e.or(e.eq(InkOcc.Clear, occInk), e.eq(InkOcc.Up, occInk)),
				e.or(
					e.or(e.eq(GapOcc.OneClear, occBelow), e.eq(GapOcc.TwoClear, occBelow)),
					e.or(e.eq(GapOcc.MoreClear, occBelow), e.eq(GapOcc.MoreDown, occBelow))
				)
			)
		),
		function*() {
			yield e.return(0);
		}
	);

	yield e.if(
		e.eq(GapOcc.OneClear, occBelow),
		() => [e.set(delta, e.min(e.coerce.toF26D6(1 / 4), e.sub(desired, current)))],
		() => [e.set(delta, e.min(e.coerce.toF26D6(4 / 5), e.sub(desired, current)))]
	);
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, j), e.sub(e.part(pGaps, j), delta));
	yield e.if(e.eq(InkOcc.Clear, occInk), function*() {
		yield e.set(occInk, InkOcc.Down);
	});
	yield e.if(e.eq(InkOcc.Up, occInk), function*() {
		yield e.set(occInk, InkOcc.Both);
	});
	yield e.if(e.eq(GapOcc.OneClear, occBelow), function*() {
		yield e.set(occBelow, GapOcc.OneBlur);
	});
	yield e.if(e.eq(GapOcc.TwoClear, occBelow), function*() {
		yield e.set(occBelow, GapOcc.TwoUp);
	});
	yield e.if(e.eq(GapOcc.MoreClear, occBelow), function*() {
		yield e.set(occBelow, GapOcc.MoreUp);
	});
	yield e.if(e.eq(GapOcc.MoreDown, occBelow), function*() {
		yield e.set(occBelow, GapOcc.MoreBoth);
	});

	yield e.return(1);
});

const BalanceOneStrokeExtUp = Lib.Func(function*(e) {
	const [j, desired, current, vpGapOcc, vpInkOcc, vpGaps, vpInks] = e.args(7);

	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);

	const occInk = e.part(pInkOcc, j),
		occAbove = e.part(pGapOcc, e.add(1, j));
	const delta = e.local();

	yield e.if(
		e.not(
			e.and(
				e.or(e.eq(InkOcc.Clear, occInk), e.eq(InkOcc.Up, occInk)),
				e.or(
					e.or(e.eq(GapOcc.OneClear, occAbove), e.eq(GapOcc.TwoClear, occAbove)),
					e.or(e.eq(GapOcc.MoreClear, occAbove), e.eq(GapOcc.MoreUp, occAbove))
				)
			)
		),
		function*() {
			yield e.return(0);
		}
	);

	yield e.if(
		e.eq(GapOcc.OneClear, occAbove),
		() => [e.set(delta, e.min(e.coerce.toF26D6(1 / 5), e.sub(desired, current)))],
		() => [e.set(delta, e.min(e.coerce.toF26D6(4 / 5), e.sub(desired, current)))]
	);
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, e.add(1, j)), e.sub(e.part(pGaps, e.add(1, j)), delta));
	yield e.if(e.eq(InkOcc.Clear, occInk), function*() {
		yield e.set(occInk, InkOcc.Up);
	});
	yield e.if(e.eq(InkOcc.Up, occInk), function*() {
		yield e.set(occInk, InkOcc.Both);
	});
	yield e.if(e.eq(GapOcc.OneClear, occAbove), function*() {
		yield e.set(occAbove, GapOcc.OneBlur);
	});
	yield e.if(e.eq(GapOcc.TwoClear, occAbove), function*() {
		yield e.set(occAbove, GapOcc.TwoDown);
	});
	yield e.if(e.eq(GapOcc.MoreClear, occAbove), function*() {
		yield e.set(occAbove, GapOcc.MoreDown);
	});
	yield e.if(e.eq(GapOcc.MoreUp, occAbove), function*() {
		yield e.set(occAbove, GapOcc.MoreBoth);
	});

	yield e.return(1);
});

const ShrinkDelta = Lib.Func(function*(e) {
	const [aInk, cInk] = e.args(2);
	yield e.return(e.neg(e.sub(cInk, e.max(e.coerce.toF26D6(3 / 5), aInk))));
});

const BalanceShrinkOneStrokeDown = Lib.Func(function*(e) {
	const [j, aInk, cInk, vpInks, vpGaps] = e.args(5);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const delta = e.local();
	yield e.set(delta, e.call(ShrinkDelta, aInk, cInk));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, j), e.sub(e.part(pGaps, j), delta));
	yield e.return(1);
});

const BalanceShrinkOneStrokeUp = Lib.Func(function*(e) {
	const [j, aInk, cInk, vpInks, vpGaps] = e.args(5);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const delta = e.local();
	yield e.set(delta, e.call(ShrinkDelta, aInk, cInk));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, e.add(1, j)), e.sub(e.part(pGaps, e.add(1, j)), delta));
	yield e.return(1);
});

const ComputeDarknessAdjustedStrokeWidth = Lib.Func(function*($) {
	const [aInk, adjInk] = $.args(2);
	yield $.return(
		$.min(
			$.add(
				aInk,
				$.div(
					$.coerce.toF26D6(DARKNESS_ADJUST_PIXELS_MAX),
					$.max($.coerce.toF26D6(1), aInk)
				)
			),
			$.max(aInk, adjInk)
		)
	);
});

const BalanceOneStroke = Lib.Func(function*(e) {
	const [
		j,
		scalar,
		forceRoundBottom,
		forceRoundTop,
		vpGapOcc,
		vpInkOcc,
		vpGaps,
		vpInks,
		vpaGap,
		vpaInk
	] = e.args(10);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const pAInk = e.coerce.fromIndex.variable(vpaInk);
	const pAGap = e.coerce.fromIndex.variable(vpaGap);

	const aInk = e.local(),
		cInk = e.local(),
		aGapBelow = e.local(),
		cGapBelow = e.local(),
		aGapAbove = e.local(),
		cGapAbove = e.local();

	yield e.set(cInk, e.part(pInks, j));
	yield e.set(aInk, e.part(pAInk, j));
	yield e.set(cGapBelow, e.part(pGaps, j));
	yield e.set(aGapBelow, e.part(pAGap, j));
	yield e.set(cGapAbove, e.part(pGaps, e.add(1, j)));
	yield e.set(aGapAbove, e.part(pAGap, e.add(1, j)));

	yield e.if(e.lt(aInk, e.coerce.toF26D6(1 / 8)), function*() {
		yield e.return();
	});

	const hasMoreSpaceBelow = e.local(),
		canExtendDown = e.local(),
		canExtendUp = e.local(),
		canShrinkDown = e.local(),
		canShrinkUp = e.local(),
		inkDownDesired = e.local(),
		inkUpDesired = e.local();

	yield e.set(
		hasMoreSpaceBelow,
		e.or(
			e.gt(cGapBelow, cGapAbove),
			e.and(e.eq(cGapBelow, cGapAbove), e.gteq(aGapBelow, aGapAbove))
		)
	);

	yield e.set(
		inkDownDesired,
		e.call(
			ComputeDarknessAdjustedStrokeWidth,
			aInk,
			e.div(e.mul(aInk, e.add(cInk, cGapBelow)), e.add(aInk, aGapBelow))
		)
	);
	yield e.set(
		inkUpDesired,
		e.call(
			ComputeDarknessAdjustedStrokeWidth,
			aInk,
			e.div(e.mul(aInk, e.add(cInk, cGapAbove)), e.add(aInk, aGapAbove))
		)
	);

	yield e.set(canExtendDown, e.and(e.not(forceRoundBottom), e.lt(cInk, inkDownDesired)));
	yield e.set(canExtendUp, e.and(e.not(forceRoundTop), e.lt(cInk, inkUpDesired)));
	yield e.set(
		canShrinkDown,
		e.and(
			e.not(forceRoundBottom),
			e.and(e.gt(aGapBelow, e.coerce.toF26D6(1 / 8)), e.gt(cInk, inkDownDesired))
		)
	);
	yield e.set(
		canShrinkUp,
		e.and(
			e.not(forceRoundTop),
			e.and(e.gt(aGapAbove, e.coerce.toF26D6(1 / 8)), e.gt(cInk, inkUpDesired))
		)
	);

	const progress = e.local();
	yield e.set(progress, 0);

	yield e.if(
		hasMoreSpaceBelow,
		function*() {
			yield e.if(e.and(e.not(progress), canExtendDown), () => [
				e.set(
					progress,
					e.call(
						BalanceOneStrokeExtDown,
						j,
						inkDownDesired,
						cInk,
						vpGapOcc,
						vpInkOcc,
						vpGaps,
						vpInks
					)
				)
			]);
			yield e.if(e.and(e.not(progress), canExtendUp), () => [
				e.set(
					progress,
					e.call(
						BalanceOneStrokeExtUp,
						j,
						inkUpDesired,
						cInk,
						vpGapOcc,
						vpInkOcc,
						vpGaps,
						vpInks
					)
				)
			]);
			yield e.if(e.and(e.not(progress), canShrinkUp), () => [
				e.set(
					progress,
					e.call(BalanceShrinkOneStrokeUp, j, inkUpDesired, cInk, vpInks, vpGaps)
				)
			]);
			yield e.if(e.and(e.not(progress), canShrinkDown), () => [
				e.set(
					progress,
					e.call(BalanceShrinkOneStrokeDown, j, inkDownDesired, cInk, vpInks, vpGaps)
				)
			]);
		},
		function*() {
			yield e.if(e.and(e.not(progress), canExtendUp), () => [
				e.set(
					progress,
					e.call(
						BalanceOneStrokeExtUp,
						j,
						inkUpDesired,
						cInk,
						vpGapOcc,
						vpInkOcc,
						vpGaps,
						vpInks
					)
				)
			]);
			yield e.if(e.and(e.not(progress), canExtendDown), () => [
				e.set(
					progress,
					e.call(
						BalanceOneStrokeExtDown,
						j,
						inkDownDesired,
						cInk,
						vpGapOcc,
						vpInkOcc,
						vpGaps,
						vpInks
					)
				)
			]);
			yield e.if(e.and(e.not(progress), canShrinkDown), () => [
				e.set(
					progress,
					e.call(BalanceShrinkOneStrokeDown, j, inkDownDesired, cInk, vpInks, vpGaps)
				)
			]);
			yield e.if(e.and(e.not(progress), canShrinkUp), () => [
				e.set(
					progress,
					e.call(BalanceShrinkOneStrokeUp, j, inkUpDesired, cInk, vpInks, vpGaps)
				)
			]);
		}
	);
});

export const BalanceStrokes = Lib.Func(function*($) {
	const [
		N,
		scalar,
		bottomSeize,
		topSeize,
		forceRoundBottom,
		forceRoundTop,
		vpGapOcc,
		vpInkOcc,
		vpGaps,
		vpInks,
		vpaGap,
		vpaInk,
		vpfStrokeBalanced
	] = $.args(13);

	const pfStrokeBalanced = $.coerce.fromIndex.variable(vpfStrokeBalanced);
	const paInk = $.coerce.fromIndex.variable(vpaInk);

	yield $.call(
		InitBalanceMultiStrokeHints,
		N,
		bottomSeize,
		topSeize,
		vpGapOcc,
		vpInkOcc,
		vpGaps,
		vpfStrokeBalanced
	);

	yield $.if($.gt(N, 0), function*() {
		yield $.call(
			BalanceOneStroke,
			0,
			scalar,
			forceRoundBottom,
			forceRoundTop,
			vpGapOcc,
			vpInkOcc,
			vpGaps,
			vpInks,
			vpaGap,
			vpaInk
		);
	});
	yield $.if($.gt(N, 1), function*() {
		yield $.call(
			BalanceOneStroke,
			$.sub(N, 1),
			scalar,
			forceRoundBottom,
			forceRoundTop,
			vpGapOcc,
			vpInkOcc,
			vpGaps,
			vpInks,
			vpaGap,
			vpaInk
		);
	});

	const jj = $.local();
	const find = $.local();
	const processStrokeIndex = $.local();
	const maxStrokeWidth = $.local();

	yield $.set(find, 1);
	yield $.set(processStrokeIndex, 0);
	yield $.while(find, function*() {
		yield $.set(find, 0);
		yield $.set(jj, 1);
		yield $.set(maxStrokeWidth, 0);
		yield $.while($.lt($.add(1, jj), N), function*() {
			yield $.if(
				$.and($.not($.part(pfStrokeBalanced, jj)), $.gt($.part(paInk, jj), maxStrokeWidth)),
				function*() {
					yield $.set(find, 1);
					yield $.set(processStrokeIndex, jj);
					yield $.set(maxStrokeWidth, $.part(paInk, jj));
				}
			);
			yield $.set(jj, $.add(1, jj));
		});
		yield $.if(find, function*() {
			yield $.call(
				BalanceOneStroke,
				processStrokeIndex,
				scalar,
				forceRoundBottom,
				forceRoundTop,
				vpGapOcc,
				vpInkOcc,
				vpGaps,
				vpInks,
				vpaGap,
				vpaInk
			);
			yield $.set($.part(pfStrokeBalanced, processStrokeIndex), 1);
		});
	});
});
