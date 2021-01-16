import { Lib } from "./commons";

export const ProcessCollidedStrokeWidth = Lib.Func(function* (e) {
	const [w0] = e.args(1);
	yield e.return(e.max(e.coerce.toF26D6(2 / 5), e.mul(e.coerce.toF26D6(1 / 2), w0)));
});

export const CollideHangBottom = Lib.Func(function* (e) {
	const [botLim, botCur, topCur] = e.args(3);
	yield e.scfs(botCur, e.gc.cur(botLim));
	yield e.scfs(
		topCur,
		e.add(
			e.round.gray(e.gc.cur(botLim)),
			e.call(ProcessCollidedStrokeWidth, e.sub(e.gc.orig(topCur), e.gc.orig(botCur)))
		)
	);
});
export const CollideHangTop = Lib.Func(function* (e) {
	const [topLim, botCur, topCur] = e.args(3);
	yield e.scfs(topCur, e.gc.cur(topLim));
	yield e.scfs(
		botCur,
		e.sub(
			e.round.gray(e.gc.cur(topLim)),
			e.call(ProcessCollidedStrokeWidth, e.sub(e.gc.orig(topCur), e.gc.orig(botCur)))
		)
	);
});

export const AlignTwoStrokes = Lib.Func(function* ($) {
	const [a, b, c, d] = $.args(4);
	yield $.scfs(a, $.gc.cur(c));
	yield $.scfs(b, $.gc.cur(d));
});
export const CollideDownTwoStrokes = Lib.Func(function* (e) {
	const [botCur, topCur, botBelow, topBelow] = e.args(4);
	yield e.scfs(botCur, e.add(e.coerce.toF26D6(1), e.gc.cur(botBelow)));
	yield e.scfs(
		topCur,
		e.add(
			e.gc.cur(botCur),
			e.call(ProcessCollidedStrokeWidth, e.sub(e.gc.cur(topBelow), e.gc.cur(botBelow)))
		)
	);
});
export const CollideUpTwoStrokes = Lib.Func(function* (e) {
	const [botCur, topCur, botAbove, topAbove] = e.args(4);
	yield e.scfs(botCur, e.sub(e.gc.cur(botAbove), e.coerce.toF26D6(1)));
	yield e.scfs(
		topCur,
		e.add(
			e.gc.cur(botCur),
			e.call(ProcessCollidedStrokeWidth, e.sub(e.gc.cur(topAbove), e.gc.cur(botAbove)))
		)
	);
});
