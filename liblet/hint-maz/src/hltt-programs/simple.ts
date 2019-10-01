import { Lib } from "./commons";

const IP2Sh = Lib.Func(function*($) {
	const [zBot, zTop, zA, zB, sh] = $.args(5);
	yield $.ip(zBot, zTop, zA, zB);
	const y1 = $.local(),
		y2 = $.local(),
		yM = $.local();
	yield $.set(y1, $.gc.cur(zA));
	yield $.set(y2, $.gc.cur(zB));
	yield $.set(yM, $.div($.add(y1, y2), $.coerce.toF26D6(2)));
	yield $.scfs(zA, $.add(yM, $.mul(sh, $.sub(y1, yM))));
	yield $.scfs(zB, $.add(yM, $.mul(sh, $.sub(y2, yM))));
});

// This function is used at very small PPEM -- We can do almost nothing, just IP
export const HintMultipleStrokesGiveUp = Lib.Func(function*($) {
	const [N, zBot, zTop, vpZMids] = $.args(4);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	yield $.mdap(zBot);
	yield $.mdap(zTop);
	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function*() {
		yield $.call(
			IP2Sh,
			zBot,
			zTop,
			$.part(pZMids, $.mul($.coerce.toF26D6(2), j)),
			$.part(pZMids, $.add(1, $.mul($.coerce.toF26D6(2), j))),
			$.min($.coerce.toF26D6(1), $.mul($.coerce.toF26D6(4), $.mppem()))
		);
		yield $.set(j, $.add(1, j));
	});
});

const IpClose = Lib.Func(function*($) {
	const [zBot, zTop, z1, z2] = $.args(4);
	yield $.ip(zBot, zTop, z1, z2);
	const distOrig = $.local();
	const drTop = $.local();
	const drBot = $.local();
	yield $.set(distOrig, $.sub($.gc.orig(z2), $.gc.orig(z1)));
	yield $.set(drTop, $.abs($.sub($.gc.cur(z1), $.round.gray($.gc.cur(z1)))));
	yield $.set(drBot, $.abs($.sub($.gc.cur(z2), $.round.gray($.gc.cur(z2)))));
	yield $.if(
		$.lt(drTop, drBot),
		function*() {
			yield $.scfs(z2, $.round.gray($.gc.cur(z2)));
			yield $.scfs(z1, $.sub($.round.gray($.gc.cur(z2)), distOrig));
		},
		function*() {
			yield $.scfs(z1, $.round.gray($.gc.cur(z1)));
			yield $.scfs(z2, $.add($.round.gray($.gc.cur(z1)), distOrig));
		}
	);
});

// This function is used at very large PPEM -- whether to round is no longer important, just IP
export const HintMultipleStrokesSimple = Lib.Func(function*($) {
	const [N, zBot, zTop, vpZMids] = $.args(4);
	const pZMids = $.coerce.fromIndex.variable(vpZMids);
	yield $.mdap(zBot);
	yield $.mdap(zTop);

	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function*() {
		yield $.call(
			IpClose,
			zBot,
			zTop,
			$.part(pZMids, $.mul($.coerce.toF26D6(2), j)),
			$.part(pZMids, $.add(1, $.mul($.coerce.toF26D6(2), j)))
		);

		yield $.set(j, $.add(1, j));
	});
});
