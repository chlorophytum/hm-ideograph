import { ProgramLib } from "./twilight";

const BiRound = ProgramLib.Template(function* ($, rate: number) {
	const [a, b, aOrig, bOrig] = $.args(4);

	const widthExpander = $.local();
	yield $.set(
		widthExpander,
		$.min(
			$.coerce.toF26D6(0.5),
			$.div(
				$.coerce.toF26D6(1),
				$.max($.coerce.toF26D6(1), $.mul($.coerce.toF26D6(64), $.mppem()))
			)
		)
	);
	const roundedDist = $.local();
	yield $.set(
		roundedDist,
		$.round.gray($.add(widthExpander, $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))))
	);

	const roundYBottom = $.local();
	yield $.set(roundYBottom, $.round.gray($.gc.cur(aOrig)));
	const roundBottomTotalMove = $.local();
	yield $.set(
		roundBottomTotalMove,
		$.add(
			$.abs($.sub($.gc.cur(aOrig), roundYBottom)),
			$.abs($.sub($.gc.cur(bOrig), $.add(roundYBottom, roundedDist)))
		)
	);

	const roundYTop = $.local();
	yield $.set(roundYTop, $.round.gray($.gc.cur(bOrig)));
	const roundTopTotalMove = $.local();
	yield $.set(
		roundTopTotalMove,
		$.add(
			$.abs($.sub($.gc.cur(bOrig), roundYTop)),
			$.abs($.sub($.gc.cur(aOrig), $.sub(roundYTop, roundedDist)))
		)
	);

	yield $.if($.lt(roundTopTotalMove, roundBottomTotalMove))
		.then(function* () {
			yield $.scfs(b, roundYTop);
			yield $.scfs(a, $.sub(roundYTop, roundedDist));
		})
		.else(function* () {
			yield $.scfs(a, roundYBottom);
			yield $.scfs(b, $.add(roundYBottom, roundedDist));
		});
});

const ULink = ProgramLib.Func(function* ($) {
	const [a, b, aOrig, bOrig] = $.args(4);
	yield $.scfs(b, $.add($.gc.cur(a), $.sub($.gc.cur(bOrig), $.gc.cur(aOrig))));
});

export const TInitEmBoxTwilightPoints = ProgramLib.Template(function* ($, rate: number) {
	const [
		strokeBottom,
		strokeTop,
		spurBottom,
		spurTop,
		strokeBottomOrig,
		strokeTopOrig,
		spurBottomOrig,
		spurTopOrig,
	] = $.args(8);

	yield $.mdap(strokeBottom);
	yield $.mdap(strokeTop);
	yield $.mdap(spurBottom);
	yield $.mdap(spurTop);

	yield $.call(BiRound(rate), strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
	yield $.call(ULink, strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
	yield $.call(ULink, strokeTop, spurTop, strokeTopOrig, spurTopOrig);
});
