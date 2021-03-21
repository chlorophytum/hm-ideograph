import { Func, Template } from "@chlorophytum/hltt-next";
import {
	abs,
	add,
	div,
	gc,
	i2f,
	lt,
	max,
	min,
	mppem,
	round,
	sub
} from "@chlorophytum/hltt-next-expr";
import { If, Mdap, Scfs } from "@chlorophytum/hltt-next-stmt";
import { Frac, TwilightPoint } from "@chlorophytum/hltt-next-type-system";

const BiRound = Template((rate: number) =>
	Func(TwilightPoint, TwilightPoint, TwilightPoint, TwilightPoint).def(function* (
		$,
		a,
		b,
		aOrig,
		bOrig
	) {
		const widthExpander = $.Local(Frac);
		yield widthExpander.set(min(0.5, div(1, max(1, i2f(mppem())))));

		const roundedDist = $.Local(Frac);
		yield roundedDist.set(round.gray(add(widthExpander, sub(gc.cur(bOrig), gc.cur(aOrig)))));

		const roundYBottom = $.Local(Frac);
		yield roundYBottom.set(round.gray(gc.cur(aOrig)));
		const roundBottomTotalMove = $.Local(Frac);
		yield roundBottomTotalMove.set(
			add(
				abs(sub(gc.cur(aOrig), roundYBottom)),
				abs(sub(gc.cur(bOrig), add(roundYBottom, roundedDist)))
			)
		);

		const roundYTop = $.Local(Frac);
		yield roundYTop.set(round.gray(gc.cur(bOrig)));
		const roundTopTotalMove = $.Local(Frac);
		yield roundTopTotalMove.set(
			add(
				abs(sub(gc.cur(bOrig), roundYTop)),
				abs(sub(gc.cur(aOrig), sub(roundYTop, roundedDist)))
			)
		);

		yield If(lt(roundTopTotalMove, roundBottomTotalMove))
			.Then(function* () {
				yield Scfs(b, roundYTop);
				yield Scfs(a, sub(roundYTop, roundedDist));
			})
			.Else(function* () {
				yield Scfs(a, roundYBottom);
				yield Scfs(b, add(roundYBottom, roundedDist));
			});
	})
);

const ULink = Func(TwilightPoint, TwilightPoint, TwilightPoint, TwilightPoint).def(function* (
	$,
	a,
	b,
	aOrig,
	bOrig
) {
	yield Scfs(b, add(gc.cur(a), sub(gc.cur(bOrig), gc.cur(aOrig))));
});

export const TInitEmBoxTwilightPoints = Template((rate: number) =>
	Func(
		TwilightPoint,
		TwilightPoint,
		TwilightPoint,
		TwilightPoint,
		TwilightPoint,
		TwilightPoint,
		TwilightPoint,
		TwilightPoint
	).def(function* (
		$,
		strokeBottom,
		strokeTop,
		spurBottom,
		spurTop,
		strokeBottomOrig,
		strokeTopOrig,
		spurBottomOrig,
		spurTopOrig
	) {
		yield Mdap(strokeBottom);
		yield Mdap(strokeTop);
		yield Mdap(spurBottom);
		yield Mdap(spurTop);

		yield BiRound(rate)(strokeBottom, strokeTop, strokeBottomOrig, strokeTopOrig);
		yield ULink(strokeBottom, spurBottom, strokeBottomOrig, spurBottomOrig);
		yield ULink(strokeTop, spurTop, strokeTopOrig, spurTopOrig);
	})
);
