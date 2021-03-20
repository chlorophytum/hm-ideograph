import {
	add,
	and,
	div,
	Frac,
	Func,
	gt,
	gteq,
	i2f,
	If,
	Int,
	lt,
	min,
	mul,
	not,
	odd,
	or,
	Store,
	sub,
	While
} from "@chlorophytum/hltt-next";

export const MaxAverageDivisorIncreaseStep = 2;

export const HighestAverageLoop = Func(
	Int,
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Frac,
	Frac
).def(function* ($, N, pA, pC, pDiv, pAlloc, scalar, rest) {
	const restInk = $.Local(Frac);
	const jOpt = $.Local(Int);
	const jLoop = $.Local(Int);
	const dOpt = $.Local(Frac);

	yield restInk.set(rest);
	yield While(gt(restInk, 0), function* () {
		yield jOpt.set(-1);
		yield dOpt.set(-255);
		yield jLoop.set(0);
		yield While(lt(jLoop, N), function* () {
			yield If(
				and(
					lt(pAlloc.part(jLoop), add(2, mul(scalar, pA.part(jLoop)))),
					or(
						and(odd(i2f(jLoop)), gt(pC.part(jLoop), dOpt)),
						and(not(odd(i2f(jLoop))), gteq(pC.part(jLoop), dOpt))
					)
				)
			).Then(function* () {
				yield jOpt.set(jLoop);
				yield dOpt.set(pC.part(jLoop));
			});
			yield jLoop.set(add(jLoop, 1));
		});

		yield If(gteq(jOpt, 0)).Then(function* () {
			yield pAlloc.part(jOpt).set(add(pAlloc.part(jOpt), min(restInk, 1)));
			yield pDiv.part(jOpt).set(add(pDiv.part(jOpt), MaxAverageDivisorIncreaseStep));
			yield pC.part(jOpt).set(div(pA.part(jOpt), pDiv.part(jOpt)));
		});
		yield restInk.set(sub(restInk, 1));
	});
});
