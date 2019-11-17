import { ProgramLib } from "./twilight";

const BiRound = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	const roundedDist = $.local();
	const roundBottomTotalMove = $.local();
	const roundTopTotalMove = $.local();
	yield $.set(roundedDist, $.round.gray($.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
	yield $.set(
		roundBottomTotalMove,
		$.add(
			$.abs($.sub($.gc.cur(aOrig), $.round.gray($.gc.cur(aOrig)))),
			$.abs($.sub($.gc.cur(bOrig), $.add($.round.gray($.gc.cur(aOrig)), roundedDist)))
		)
	);
	yield $.set(
		roundTopTotalMove,
		$.add(
			$.abs($.sub($.gc.cur(bOrig), $.round.gray($.gc.cur(bOrig)))),
			$.abs($.sub($.gc.cur(aOrig), $.sub($.round.gray($.gc.cur(bOrig)), roundedDist)))
		)
	);
	yield $.if(
		$.lt(roundTopTotalMove, roundBottomTotalMove),
		function*() {
			yield $.scfs(b, $.round.gray($.gc.cur(bOrig)));
			yield $.scfs(a, $.sub($.round.gray($.gc.cur(bOrig)), roundedDist));
		},
		function*() {
			yield $.scfs(a, $.round.gray($.gc.cur(aOrig)));
			yield $.scfs(b, $.add($.round.gray($.gc.cur(aOrig)), roundedDist));
		}
	);
});

const ULink = ProgramLib.Func(function*($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
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

	yield $.call(BiRound, strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
	yield $.call(ULink, strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
	yield $.call(ULink, strokeTop, spurTop, strokeTopOrig, spurTopOrig);
});
