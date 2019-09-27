import { AdjustStrokeDistT, OctDistOrig } from "@chlorophytum/hint-programs-stoke-adjust";
import { Expression, ProgramDsl, Variable } from "@chlorophytum/hltt";

import { Lib } from "./commons";

const DIV_STEP = 2;

function midBot(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.mul(e.coerce.toF26D6(2), index));
}
function midTop(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.add(1, e.mul(e.coerce.toF26D6(2), index)));
}

export const InitMSDGapEntries = Lib.Func(function*($) {
	const [N, vpTotalDist, vpA, vpB, vpC, vpDiv, vpAlloc, zBot, zTop, vpZMids, vpGapMD] = $.args(
		11
	);

	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	const pGapMD = $.coerce.fromIndex.variable(vpGapMD);

	const j = $.local();
	const gapDist = $.local();
	yield $.set(j, 0);
	yield $.set(gapDist, 0);
	yield $.while($.lteq(j, N), function*() {
		yield $.if(
			$.eq(j, 0),
			function*() {
				yield $.set(gapDist, $.call(OctDistOrig, zBot, midBot($, pZMids, j)));
			},
			function*() {
				yield $.if(
					$.eq(j, N),
					function*() {
						yield $.set(
							gapDist,
							$.call(OctDistOrig, midTop($, pZMids, $.sub(j, 1)), zTop)
						);
					},
					function*() {
						yield $.set(
							gapDist,
							$.call(
								OctDistOrig,
								midTop($, pZMids, $.sub(j, 1)),
								midBot($, pZMids, j)
							)
						);
					}
				);
			}
		);
		yield $.call(
			InitMSDistEntry,
			$.toFloat(N),
			$.mul($.coerce.toF26D6(2), j),
			vpTotalDist,
			vpA,
			vpB,
			vpC,
			vpDiv,
			vpAlloc,
			gapDist,
			$.coerce.toF26D6(1),
			$.part(pGapMD, j)
		);
		yield $.set(j, $.add(1, j));
	});
});

export const InitMSDInkEntries = Lib.Func(function*($) {
	const [N, vpTotalDist, vpA, vpB, vpC, vpDiv, vpAlloc, vpZMids, vpStrokeMD] = $.args(9);

	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	const pStrokeMD = $.coerce.fromIndex.variable(vpStrokeMD);

	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function*() {
		yield $.call(
			InitMSDistEntry,
			$.toFloat(N),
			$.add(1, $.mul($.coerce.toF26D6(2), j)),
			vpTotalDist,
			vpA,
			vpB,
			vpC,
			vpDiv,
			vpAlloc,
			$.call(
				AdjustStrokeDistT(2),
				$.call(OctDistOrig, midBot($, pZMids, j), midTop($, pZMids, j))
			),
			$.coerce.toF26D6(1),
			$.part(pStrokeMD, j)
		);
		yield $.set(j, $.add(1, j));
	});
});

const InitMSDistEntry = Lib.Func(function*($) {
	const [N, j, vpTotalDist, vpA, vpB, vpC, vpDiv, vpAlloc, x, r, p] = $.args(11);
	const pTotalDist = $.coerce.fromIndex.variable(vpTotalDist);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pB = $.coerce.fromIndex.variable(vpB);
	const pC = $.coerce.fromIndex.variable(vpC);
	const pDiv = $.coerce.fromIndex.variable(vpDiv);
	const pAlloc = $.coerce.fromIndex.variable(vpAlloc);
	const divisor = $.add($.coerce.toF26D6(1), $.mul($.coerce.toF26D6(DIV_STEP), p));
	yield $.set($.part(pA, j), $.max(0, x));
	yield $.set($.part(pB, j), $.max(0, $.sub($.mul(r, x), $.div($.coerce.toF26D6(1), N))));
	yield $.set($.part(pC, j), $.div($.part(pB, j), divisor));
	yield $.set(pTotalDist, $.add(pTotalDist, $.part(pA, j)));
	yield $.set($.part(pDiv, j), divisor);
	yield $.set($.part(pAlloc, j), p);
});

export const MaxAverageLoop = Lib.Func(function*($) {
	const [N, vpA, vpB, vpC, vpDiv, vpAlloc, scalar, rest] = $.args(8);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pB = $.coerce.fromIndex.variable(vpB);
	const pC = $.coerce.fromIndex.variable(vpC);
	const pDiv = $.coerce.fromIndex.variable(vpDiv);
	const pAlloc = $.coerce.fromIndex.variable(vpAlloc);

	const ONE = $.coerce.toF26D6(1);

	const restInk = $.local();
	const jOpt = $.local();
	const jLoop = $.local();
	const dOpt = $.local();
	yield $.set(restInk, rest);
	yield $.while($.gt(restInk, 0), function*() {
		yield $.set(jOpt, -1);
		yield $.set(dOpt, -255);
		yield $.set(jLoop, 0);
		yield $.while($.lt(jLoop, N), function*() {
			yield $.if(
				$.and(
					$.lt(
						$.part(pAlloc, jLoop),
						$.add($.coerce.toF26D6(2), $.mul(scalar, $.part(pA, jLoop)))
					),
					$.or(
						$.and($.odd(jLoop), $.gt($.part(pC, jLoop), dOpt)),
						$.and($.not($.odd(jLoop)), $.gteq($.part(pC, jLoop), dOpt))
					)
				),
				function*() {
					yield $.set(jOpt, jLoop);
					yield $.set(dOpt, $.part(pC, jLoop));
				}
			);
			yield $.set(jLoop, $.add(jLoop, 1));
		});

		yield $.if($.gteq(jOpt, 0), function*() {
			yield $.set($.part(pAlloc, jOpt), $.add($.part(pAlloc, jOpt), $.min(restInk, ONE)));
			yield $.set($.part(pDiv, jOpt), $.add($.part(pDiv, jOpt), $.coerce.toF26D6(DIV_STEP)));
			yield $.set($.part(pC, jOpt), $.div($.part(pB, jOpt), $.part(pDiv, jOpt)));
		});
		yield $.set(restInk, $.sub(restInk, ONE));
	});
});

const PlaceStrokeDist2 = Lib.Func(function*($) {
	const [vpY, zBot, zTop, gap, ink] = $.args(5);
	const pY = $.coerce.fromIndex.variable(vpY);
	yield $.set(pY, $.add(pY, gap));
	yield $.mdap(zBot);
	yield $.scfs(zBot, pY);
	yield $.set(pY, $.add(pY, ink));
	yield $.scfs(zTop, pY);
});

export const MovePointsForMiddleHint = Lib.Func(function*($) {
	const [N, zBot, zTop, y0, vpGaps, vpInks, vpZMids] = $.args(7);
	const pGaps = $.coerce.fromIndex.variable(vpGaps);
	const pInks = $.coerce.fromIndex.variable(vpInks);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	const j = $.local();
	const y = $.local();
	const yBot = $.local();
	const yTop = $.local();

	yield $.set(j, 0);
	yield $.set(y, y0);
	yield $.set(yBot, $.gc.cur(zBot));
	yield $.set(yTop, $.gc.cur(zTop));
	yield $.while($.lt(j, N), function*() {
		yield $.call(
			PlaceStrokeDist2,
			y.ptr,
			midBot($, pZMids, j),
			midTop($, pZMids, j),
			$.part(pGaps, j),
			$.part(pInks, j)
		);
		yield $.set(j, $.add(1, j));
	});
	yield $.scfs(zBot, yBot);
	yield $.scfs(zTop, yTop);
});
