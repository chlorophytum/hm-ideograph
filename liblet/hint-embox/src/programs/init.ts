import { ProgramLib } from "./twilight";

const ULink = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
});

const RLink = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig)))));
});

export const TInitEmBoxTwilightPoints = ProgramLib.Func(function*($) {
	const [
		strokeBottom,
		strokeTop,
		spurBottom,
		spurTop,
		strokeBottomOrig,
		strokeTopOrig,
		spurBottomOrig,
		spurTopOrig
	] = $.args(8);

	yield $.mdap(strokeBottom);
	yield $.mdap(strokeTop);
	yield $.mdap(spurBottom);
	yield $.mdap(spurTop);

	yield $.scfs(strokeBottom, $.round.black($.gc.cur(strokeBottomOrig)));
	yield $.call(RLink, strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
	yield $.call(ULink, strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
	yield $.call(ULink, strokeTop, spurTop, strokeTopOrig, spurTopOrig);
});
