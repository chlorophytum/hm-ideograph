import { AdjustStrokeDistT, OctDistOrig } from "@chlorophytum/hint-programs-stoke-adjust";

import { Lib } from "../commons";
import { midBot, midTop } from "../macros";

import { MaxAverageDivisorIncreaseStep } from "./loop";

export const InitMSDGapEntries = Lib.Func(function* ($) {
	const [N, vpTotalDist, vpA, vpC, vpDiv, vpAlloc, zBot, zTop, vpZMids, vpGapMD] = $.args(10);

	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	const pGapMD = $.coerce.fromIndex.variable(vpGapMD);

	const j = $.local();
	const gapDist = $.local();
	yield $.set(j, 0);
	yield $.set(gapDist, 0);
	yield $.while($.lteq(j, N), function* () {
		yield $.if($.eq(j, 0))
			.then($.set(gapDist, $.call(OctDistOrig, zBot, midBot($, pZMids, j))))
			.else(
				$.if($.eq(j, N))
					.then($.set(gapDist, $.call(OctDistOrig, midTop($, pZMids, $.sub(j, 1)), zTop)))
					.else(
						$.set(
							gapDist,
							$.call(
								OctDistOrig,
								midTop($, pZMids, $.sub(j, 1)),
								midBot($, pZMids, j)
							)
						)
					)
			);
		yield $.call(
			InitMSDistEntry,
			$.imul(2, j),
			vpTotalDist,
			vpA,
			vpC,
			vpDiv,
			vpAlloc,
			gapDist,
			$.part(pGapMD, j)
		);
		yield $.addSet(j, 1);
	});
});

export const InitMSDInkEntries = Lib.Func(function* ($) {
	const [N, vpTotalDist, vpA, vpC, vpDiv, vpAlloc, vpZMids, vpStrokeMD] = $.args(8);

	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	const pStrokeMD = $.coerce.fromIndex.variable(vpStrokeMD);

	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.call(
			InitMSDistEntry,
			$.add(1, $.imul(2, j)),
			vpTotalDist,
			vpA,
			vpC,
			vpDiv,
			vpAlloc,
			$.call(
				AdjustStrokeDistT(2),
				$.call(OctDistOrig, midBot($, pZMids, j), midTop($, pZMids, j))
			),
			$.part(pStrokeMD, j)
		);
		yield $.addSet(j, 1);
	});
});

const InitMSDistEntry = Lib.Func(function* ($) {
	const [j, vpTotalDist, vpA, vpC, vpDiv, vpAlloc, origDist, pixelsAllocated] = $.args(8);
	const pTotalDist = $.coerce.fromIndex.variable(vpTotalDist);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pC = $.coerce.fromIndex.variable(vpC);
	const pDiv = $.coerce.fromIndex.variable(vpDiv);
	const pAlloc = $.coerce.fromIndex.variable(vpAlloc);

	const divisor = $.local();
	yield $.set(
		divisor,
		$.add(
			$.coerce.toF26D6(1),
			$.mul($.coerce.toF26D6(MaxAverageDivisorIncreaseStep), pixelsAllocated)
		)
	);
	yield $.set($.part(pA, j), $.max(0, origDist));
	yield $.set($.part(pC, j), $.div($.part(pA, j), divisor));
	yield $.set($.part(pDiv, j), divisor);
	yield $.set($.part(pAlloc, j), pixelsAllocated);
	yield $.set(pTotalDist, $.add(pTotalDist, $.part(pA, j)));
});
