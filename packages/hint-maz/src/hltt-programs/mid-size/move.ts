import { Lib } from "../commons";
import { midBot, midTop } from "../macros";

const PlaceStrokeDist2 = Lib.Func(function* ($) {
	const [vpY, zBot, zTop, gap, ink] = $.args(5);
	const pY = $.coerce.fromIndex.variable(vpY);
	yield $.set(pY, $.add(pY, gap));
	yield $.mdap(zBot);
	yield $.scfs(zBot, pY);
	yield $.set(pY, $.add(pY, ink));
	yield $.scfs(zTop, pY);
});

export const MovePointsForMiddleHint = Lib.Func(function* ($) {
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
	yield $.while($.lt(j, N), function* () {
		yield $.call(
			PlaceStrokeDist2,
			y.ptr,
			midBot($, pZMids, j),
			midTop($, pZMids, j),
			$.part(pGaps, j),
			$.part(pInks, j)
		);
		yield $.addSet(j, 1);
	});
	yield $.scfs(zBot, yBot);
	yield $.scfs(zTop, yTop);
});
