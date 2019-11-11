import { ProgramLib } from "./twilight";

const ULink = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
});

const RLink = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig)))));
});

const RLinkLim = ProgramLib.Func(function*($) {
	const [a, b, c, aOrig, bOrig, cOrig] = $.args(6);
	const dist = $.local();
	const absDist = $.local();
	const absDistC = $.local();
	yield $.set(dist, $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
	yield $.set(absDist, $.abs(dist));
	yield $.set(absDistC, $.abs($.sub($.gc.cur(cOrig), $.gc.cur(aOrig))));
	yield $.while($.gt(absDist, absDistC), function*() {
		yield $.set(absDist, $.sub(absDist, $.coerce.toF26D6(1)));
	});
	yield $.if(
		$.gt(dist, 0),
		function*() {
			yield $.scfs(b, $.add($.gc.cur(a), absDist));
		},
		function*() {
			yield $.scfs(b, $.sub($.gc.cur(a), absDist));
		}
	);
});

export const TInitEmBoxTwilightPoints = ProgramLib.Func(function*($) {
	const [
		strokeBottom,
		strokeTop,
		archBottom,
		archTop,
		spurBottom,
		spurTop,
		strokeBottomOrig,
		strokeTopOrig,
		archBottomOrig,
		archTopOrig,
		spurBottomOrig,
		spurTopOrig
	] = $.args(12);

	// These MDAPs are not necessary but VTT loves them
	yield $.mdap(strokeBottom);
	yield $.mdap(strokeTop);
	yield $.mdap(archBottom);
	yield $.mdap(archTop);
	yield $.mdap(spurBottom);
	yield $.mdap(spurTop);

	yield $.scfs(strokeBottom, $.round.black($.gc.cur(strokeBottomOrig)));
	yield $.call(RLink, strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
	yield $.call(ULink, strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
	yield $.call(ULink, strokeTop, spurTop, strokeTopOrig, spurTopOrig);
	yield $.call(
		RLinkLim,
		strokeBottom,
		archBottom,
		spurBottom,
		strokeBottomOrig,
		archBottomOrig,
		spurBottomOrig
	);
	yield $.call(RLinkLim, strokeTop, archTop, spurTop, strokeTopOrig, archTopOrig, spurTopOrig);
});
