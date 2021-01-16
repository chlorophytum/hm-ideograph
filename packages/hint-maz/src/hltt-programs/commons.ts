import { OctDistOrig } from "@chlorophytum/hint-programs-stoke-adjust";
import { Edsl } from "@chlorophytum/hltt";

import { PREFIX } from "../constants";

export const Lib = new Edsl.Library(`${PREFIX}::TtLib::HlttPrograms`);

export const ConsideredDark = 3 / 4;

function midBot(e: Edsl.ProgramDsl, zMids: Edsl.Variable<Edsl.VkStorage>, index: Edsl.Expression) {
	return e.part(zMids, e.mul(e.coerce.toF26D6(2), index));
}
function midTop(e: Edsl.ProgramDsl, zMids: Edsl.Variable<Edsl.VkStorage>, index: Edsl.Expression) {
	return e.part(zMids, e.add(1, e.mul(e.coerce.toF26D6(2), index)));
}
export const GetFillRate = Lib.Func(function* ($) {
	const [N, zBot, zTop, vpZMids] = $.args(4);
	const ink = $.local();
	const gap = $.local();

	const pZMids = $.coerce.fromIndex.variable(vpZMids);

	yield $.set(ink, 0);
	yield $.set(gap, 0);

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
		yield $.set(gap, $.add(gap, gapDist));
		yield $.addSet(j, 1);
	});

	yield $.set(j, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.addSet(ink, $.call(OctDistOrig, midBot($, pZMids, j), midTop($, pZMids, j)));
		yield $.addSet(j, 1);
	});

	yield $.return($.div(gap, $.add(gap, ink)));
});
