import { Lib } from "../commons";

export const MaxAverageDivisorIncreaseStep = 1;

export const HighestAverageLoop = Lib.Func(function*($) {
	const [N, vpA, vpC, vpDiv, vpAlloc, scalar, rest] = $.args(7);
	const pA = $.coerce.fromIndex.variable(vpA);
	const pC = $.coerce.fromIndex.variable(vpC);
	const pDiv = $.coerce.fromIndex.variable(vpDiv);
	const pAlloc = $.coerce.fromIndex.variable(vpAlloc);

	const ONE = $.coerce.toF26D6(1);

	const restInk = $.local();
	const jOpt = $.local();
	const jLoop = $.local();
	const dOpt = $.local();
	yield $.set(restInk, rest);
	yield $.while($.gt(restInk, 0), function*() {
		yield $.set(jOpt, -1);
		yield $.set(dOpt, -255);
		yield $.set(jLoop, 0);
		yield $.while($.lt(jLoop, N), function*() {
			yield $.if(
				$.and(
					$.lt(
						$.part(pAlloc, jLoop),
						$.add($.coerce.toF26D6(2), $.mul(scalar, $.part(pA, jLoop)))
					),
					$.or(
						$.and($.odd(jLoop), $.gt($.part(pC, jLoop), dOpt)),
						$.and($.not($.odd(jLoop)), $.gteq($.part(pC, jLoop), dOpt))
					)
				),
				function*() {
					yield $.set(jOpt, jLoop);
					yield $.set(dOpt, $.part(pC, jLoop));
				}
			);
			yield $.set(jLoop, $.add(jLoop, 1));
		});

		yield $.if($.gteq(jOpt, 0), function*() {
			yield $.set($.part(pAlloc, jOpt), $.add($.part(pAlloc, jOpt), $.min(restInk, ONE)));
			yield $.set(
				$.part(pDiv, jOpt),
				$.add($.part(pDiv, jOpt), $.coerce.toF26D6(MaxAverageDivisorIncreaseStep))
			);
			yield $.set($.part(pC, jOpt), $.div($.part(pA, jOpt), $.part(pDiv, jOpt)));
		});
		yield $.set(restInk, $.sub(restInk, ONE));
	});
});
