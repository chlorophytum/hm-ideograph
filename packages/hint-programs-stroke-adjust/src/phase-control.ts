import { Func, Template } from "@chlorophytum/hltt-next";
import { add, ceiling, div, i2f, max, mppem, mul, sub } from "@chlorophytum/hltt-next-expr";
import { Frac } from "@chlorophytum/hltt-next-type-system";

export const StdAdjustStrokeDistRate = 4;
export const AdjustStrokeDistT = Template((rate: number) =>
	Func(Frac)
		.returns(Frac)
		.def(function* ($, d) {
			const ceilDist = $.Local(Frac);
			yield ceilDist.set(ceiling(d));
			const kPhase = $.Local(Frac);
			yield kPhase.set(sub(1, div(1, max(1, mul(1 / rate, i2f(mppem()))))));
			yield $.Return(add(1, mul(sub(d, 1), kPhase)));
		})
);
