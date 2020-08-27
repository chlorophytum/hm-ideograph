import { OctDistOrig } from "@chlorophytum/hint-programs-stoke-adjust";
import { Expression, ProgramDsl, Variable } from "@chlorophytum/hltt";

import { splitNArgs } from "../util";

import { Lib } from "./commons";
import { MapArrIntToPx, TInitArr, TInitZMids } from "./middle-array";
import { THintMultipleStrokesMainImpl } from "./middle-main";

function midBot(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.mul(e.coerce.toF26D6(2), index));
}
function midTop(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.add(1, e.mul(e.coerce.toF26D6(2), index)));
}
const AmendMinGapDist = Lib.Func(function* ($) {
	const [N, zBot, zTop, vpZMids, vpGapMD] = $.args(5);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	const pGapMD = $.coerce.fromIndex.variable(vpGapMD);

	const j = $.local();
	const gapDist = $.local();
	const gapMinDistOld = $.local();

	yield $.set(j, 0);
	yield $.set(gapDist, 0);
	yield $.set(gapMinDistOld, 0);

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

		yield $.set(gapMinDistOld, $.part(pGapMD, j));
		yield $.set(
			$.part(pGapMD, j),
			$.max(
				$.floor(gapMinDistOld),
				$.mul(
					$.min($.coerce.toF26D6(1), $.floor(gapMinDistOld)),
					$.max(
						0,
						$.round.white(
							$.sub(
								gapDist,
								$.add($.coerce.toF26D6(1), $.mul($.coerce.toF26D6(2), $.mppem()))
							)
						)
					)
				)
			)
		);

		yield $.addSet(j, 1);
	});
});

function MultipleAlignZoneArgQuantity(N: number) {
	return N + 1 + N + N + N + 1 + 1 + 1 + 1 + 2 * N;
}

export const THintMultipleStrokesExplicit = Lib.Template(function* ($, N: number) {
	const argQty = [N + 1, N, N, N, 1, 1, 1, 1, 2 * N];
	const args = $.args(MultipleAlignZoneArgQuantity(N));
	const [
		ixGapMinDist,
		ixInkMinDist,
		ixRecPath,
		ixRecPathCollide,
		[iBotFree],
		[iTopFree],
		[zBot],
		[zTop],
		zMids,
	] = splitNArgs(args, argQty);

	const oGapMD = $.local(N + 1);
	const aGapMD = $.local(N + 1);
	const aInkMD = $.local(N);
	const aRecPath = $.local(N);
	const aRecPathCollide = $.local(N);
	const aZMids = $.local(N * 2);

	yield $.call(TInitArr(N + 1), oGapMD.ptr, ...ixGapMinDist);
	yield $.call(TInitArr(N + 1), aGapMD.ptr, ...ixGapMinDist);
	yield $.call(TInitArr(N), aInkMD.ptr, ...ixInkMinDist);
	yield $.call(TInitArr(N), aRecPath.ptr, ...ixRecPath);
	yield $.call(TInitArr(N), aRecPathCollide.ptr, ...ixRecPathCollide);
	yield $.call(TInitZMids(N), aZMids.ptr, ...zMids);
	yield $.call(MapArrIntToPx, oGapMD.ptr, N + 1);
	yield $.call(MapArrIntToPx, aGapMD.ptr, N + 1);
	yield $.call(MapArrIntToPx, aInkMD.ptr, N);

	yield $.call(AmendMinGapDist, N, zBot, zTop, aZMids.ptr, aGapMD.ptr);

	yield $.call(
		THintMultipleStrokesMainImpl(N),
		$.toFloat(iBotFree),
		$.toFloat(iTopFree),
		zBot,
		zTop,
		oGapMD.ptr,
		aZMids.ptr,
		aGapMD.ptr,
		aInkMD.ptr,
		aRecPath.ptr,
		aRecPathCollide.ptr
	);
});
