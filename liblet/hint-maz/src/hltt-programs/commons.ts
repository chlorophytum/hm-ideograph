import { OctDistOrig } from "@chlorophytum/hint-programs-stoke-adjust";
import { TtLibrary } from "@chlorophytum/hltt";
import { Expression, ProgramDsl, Variable } from "@chlorophytum/hltt";

export const Lib = new TtLibrary(`Chlorophytum::MultipleAlignZone::HlttPrograms`);

export const ConsideredDark = 3 / 5;

function midBot(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.mul(e.coerce.toF26D6(2), index));
}
function midTop(e: ProgramDsl, zMids: Variable, index: Expression) {
	return e.part(zMids, e.add(1, e.mul(e.coerce.toF26D6(2), index)));
}
export const GetFillRate = Lib.Func(function*($) {
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
		yield $.set(gap, $.add(gap, gapDist));
		yield $.set(j, $.add(1, j));
	});

	yield $.set(j, 0);
	yield $.while($.lt(j, N), function*() {
		yield $.set(
			ink,
			$.add(ink, $.call(OctDistOrig, midBot($, pZMids, j), midTop($, pZMids, j)))
		);
		yield $.set(j, $.add(1, j));
	});

	yield $.return($.div(gap, $.add(gap, ink)));
});
