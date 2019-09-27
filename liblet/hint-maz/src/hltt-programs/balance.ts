import { Lib } from "./commons";

enum GapOcc {
	OnePx,
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

export const InitBalanceMultiStrokeHints = Lib.Func(function*(e) {
	const [N, vpGapOcc, vpInkOcc, vpGaps] = e.args(4);
	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const j = e.local();
	const gap = e.local();
	yield e.set(j, 0);
	yield e.while(e.lt(j, N), function*() {
		yield e.set(e.part(pInkOcc, j), InkOcc.Clear);
		yield e.set(j, e.add(j, 1));
	});
	yield e.set(j, 0);
	yield e.while(e.lteq(j, N), function*() {
		yield e.set(gap, e.part(pGaps, j));
		yield e.if(
			e.lt(gap, e.coerce.toF26D6(1 + 1 / 8)),
			function*() {
				yield e.set(e.part(pGapOcc, j), GapOcc.OnePx);
			},
			function*() {
				yield e.if(
					e.lt(gap, e.coerce.toF26D6(2 + 1 / 8)),
					function*() {
						yield e.set(e.part(pGapOcc, j), GapOcc.TwoClear);
					},
					function*() {
						yield e.set(e.part(pGapOcc, j), GapOcc.MoreClear);
					}
				);
			}
		);
		yield e.set(j, e.add(j, 1));
	});
});

export const BalanceOneStrokeExtDown = Lib.Func(function*(e) {
	const [j, vpGapOcc, vpInkOcc, vpGaps, vpInks, vpaInk] = e.args(6);

	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const pAInk = e.coerce.fromIndex.variable(vpaInk);

	const aInk = e.local(),
		cInk = e.local();
	const occBelow = e.part(pGapOcc, j),
		occInk = e.part(pInkOcc, j);
	const delta = e.local();

	yield e.set(aInk, e.part(pAInk, j));
	yield e.set(cInk, e.part(pInks, j));

	yield e.if(
		e.not(
			e.and(
				e.or(e.eq(InkOcc.Clear, occInk), e.eq(InkOcc.Up, occInk)),
				e.or(
					e.eq(GapOcc.TwoClear, occBelow),
					e.or(e.eq(GapOcc.MoreClear, occBelow), e.eq(GapOcc.MoreDown, occBelow))
				)
			)
		),
		function*() {
			yield e.return(0);
		}
	);

	yield e.set(delta, e.min(e.coerce.toF26D6(4 / 5), e.sub(aInk, cInk)));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, j), e.sub(e.part(pGaps, j), delta));
	yield e.if(e.eq(InkOcc.Clear, occInk), function*() {
		yield e.set(occInk, InkOcc.Down);
	});
	yield e.if(e.eq(InkOcc.Up, occInk), function*() {
		yield e.set(occInk, InkOcc.Both);
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

export const BalanceOneStrokeExtUp = Lib.Func(function*(e) {
	const [j, vpGapOcc, vpInkOcc, vpGaps, vpInks, vpaInk] = e.args(6);

	const pGapOcc = e.coerce.fromIndex.variable(vpGapOcc);
	const pInkOcc = e.coerce.fromIndex.variable(vpInkOcc);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const pAInk = e.coerce.fromIndex.variable(vpaInk);

	const aInk = e.local(),
		cInk = e.local();
	const occInk = e.part(pInkOcc, j),
		occAbove = e.part(pGapOcc, e.add(1, j));
	const delta = e.local();

	yield e.set(aInk, e.part(pAInk, j));
	yield e.set(cInk, e.part(pInks, j));

	yield e.if(
		e.not(
			e.and(
				e.or(e.eq(InkOcc.Clear, occInk), e.eq(InkOcc.Down, occInk)),
				e.or(
					e.eq(GapOcc.TwoClear, occAbove),
					e.or(e.eq(GapOcc.MoreClear, occAbove), e.eq(GapOcc.MoreUp, occAbove))
				)
			)
		),
		function*() {
			yield e.return(0);
		}
	);

	yield e.set(delta, e.min(e.coerce.toF26D6(4 / 5), e.sub(aInk, cInk)));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, e.add(1, j)), e.sub(e.part(pGaps, e.add(1, j)), delta));
	yield e.if(e.eq(InkOcc.Clear, occInk), function*() {
		yield e.set(occInk, InkOcc.Up);
	});
	yield e.if(e.eq(InkOcc.Up, occInk), function*() {
		yield e.set(occInk, InkOcc.Both);
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

export const ShrinkDelta = Lib.Func(function*(e) {
	const [aInk, cInk] = e.args(2);

	yield e.return(e.neg(e.sub(cInk, e.max(e.coerce.toF26D6(3 / 5), aInk))));
});

export const BalanceShrinkOneStrokeDown = Lib.Func(function*(e) {
	const [j, aInk, cInk, vpInks, vpGaps] = e.args(5);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const delta = e.local();
	yield e.set(delta, e.call(ShrinkDelta, aInk, cInk));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, j), e.sub(e.part(pGaps, j), delta));
});

export const BalanceShrinkOneStrokeUp = Lib.Func(function*(e) {
	const [j, aInk, cInk, vpInks, vpGaps] = e.args(5);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const delta = e.local();
	yield e.set(delta, e.call(ShrinkDelta, aInk, cInk));
	yield e.set(e.part(pInks, j), e.add(e.part(pInks, j), delta));
	yield e.set(e.part(pGaps, e.add(1, j)), e.sub(e.part(pGaps, e.add(1, j)), delta));
});

export const BalanceOneStroke = Lib.Func(function*(e) {
	const [j, scalar, vpGapOcc, vpInkOcc, vpGaps, vpInks, vpaGap, vpaInk] = e.args(8);
	const pGaps = e.coerce.fromIndex.variable(vpGaps);
	const pInks = e.coerce.fromIndex.variable(vpInks);
	const pAInk = e.coerce.fromIndex.variable(vpaInk);
	const pAGap = e.coerce.fromIndex.variable(vpaGap);

	const aInk = e.local();
	const cGapBelow = e.local(),
		aGapBelow = e.local(),
		cInk = e.local(),
		cGapAbove = e.local(),
		aGapAbove = e.local();

	yield e.set(aInk, e.part(pAInk, j));
	yield e.set(cGapBelow, e.part(pGaps, j));
	yield e.set(aGapBelow, e.mul(scalar, e.part(pAGap, j)));
	yield e.set(cInk, e.part(pInks, j));
	yield e.set(cGapAbove, e.part(pGaps, e.add(1, j)));
	yield e.set(aGapAbove, e.mul(scalar, e.part(pAGap, e.add(1, j))));

	yield e.if(e.lt(aInk, e.coerce.toF26D6(1 / 8)), function*() {
		yield e.return();
	});

	// Extend
	yield e.if(e.lt(cInk, aInk), function*() {
		yield e.if(
			e.gteq(e.sub(cGapBelow, aGapBelow), e.sub(cGapAbove, aGapAbove)),
			function*() {
				yield e.if(
					e.not(
						e.call(
							BalanceOneStrokeExtDown,
							j,
							vpGapOcc,
							vpInkOcc,
							vpGaps,
							vpInks,
							vpaInk
						)
					),
					function*() {
						yield e.call(
							BalanceOneStrokeExtUp,
							j,
							vpGapOcc,
							vpInkOcc,
							vpGaps,
							vpInks,
							vpaInk
						);
					}
				);
			},
			function*() {
				yield e.if(
					e.not(
						e.call(BalanceOneStrokeExtUp, j, vpGapOcc, vpInkOcc, vpGaps, vpInks, vpaInk)
					),
					function*() {
						yield e.call(
							BalanceOneStrokeExtDown,
							j,
							vpGapOcc,
							vpInkOcc,
							vpGaps,
							vpInks,
							vpaInk
						);
					}
				);
			}
		);
	});

	// Shrink
	yield e.if(e.gt(cInk, aInk), function*() {
		yield e.if(
			e.gt(cGapBelow, cGapAbove),
			function*() {
				yield e.if(
					e.gt(aGapAbove, e.coerce.toF26D6(1 / 8)),
					function*() {
						yield e.call(BalanceShrinkOneStrokeUp, j, aInk, cInk, vpInks, vpGaps);
					},
					function*() {
						yield e.call(BalanceShrinkOneStrokeDown, j, aInk, cInk, vpInks, vpGaps);
					}
				);
			},
			function*() {
				yield e.if(
					e.gt(aGapBelow, e.coerce.toF26D6(1 / 8)),
					function*() {
						yield e.call(BalanceShrinkOneStrokeDown, j, aInk, cInk, vpInks, vpGaps);
					},
					function*() {
						yield e.call(BalanceShrinkOneStrokeUp, j, aInk, cInk, vpInks, vpGaps);
					}
				);
			}
		);
	});
});

export const BalanceStrokes = Lib.Func(function*(e) {
	const [N, scalar, vpGapOcc, vpInkOcc, vpGaps, vpInks, vpaGap, vpaInk] = e.args(8);
	const jj = e.local();

	yield e.call(InitBalanceMultiStrokeHints, N, vpGapOcc, vpInkOcc, vpGaps);
	yield e.set(jj, 0);
	yield e.while(e.lt(jj, N), function*() {
		yield e.call(
			BalanceOneStroke,
			jj,
			scalar,
			vpGapOcc,
			vpInkOcc,
			vpGaps,
			vpInks,
			vpaGap,
			vpaInk
		);
		yield e.set(jj, e.add(1, jj));
	});
});
