import { Func, Template } from "@chlorophytum/hltt-next";
import { add, ceiling, floor, gc, gteq, sub } from "@chlorophytum/hltt-next-expr";
import { If } from "@chlorophytum/hltt-next-stmt";
import { Frac, THandle } from "@chlorophytum/hltt-next-type-system";

export const VisFloorT = Template((consideredDark: number) =>
	Func(Frac, Frac)
		.returns(Frac)
		.def(function* ($, x, fillRate) {
			yield If(gteq(sub(x, floor(x)), consideredDark))
				.Then($.Return(add(1, floor(x))))
				.Else($.Return(floor(x)));
		})
);

export const VisCeilT = Template((consideredDark: number) =>
	Func(Frac, Frac)
		.returns(Frac)
		.def(function* ($, x, fillRate) {
			yield If(gteq(sub(ceiling(x), x), consideredDark))
				.Then($.Return(sub(ceiling(x), 1)))
				.Else($.Return(ceiling(x)));
		})
);

export const VisDistT = Template((ConsideredDark: number, Tb: THandle, Tt: THandle) =>
	Func(Tb, Tt, Frac, Frac)
		.returns(Frac)
		.def(function* ($, zBot, zTop, frBot, frTop) {
			yield $.Return(
				sub(
					VisFloorT(ConsideredDark)(gc.cur(zTop), frTop),
					VisCeilT(ConsideredDark)(gc.cur(zBot), frBot)
				)
			);
		})
);

export const OctDistOrigT = Template((Tb: THandle, Tt: THandle) =>
	Func(Tb, Tt)
		.returns(Frac)
		.def(function* ($, zBot, zTop) {
			yield $.Return(sub(gc.orig(zTop), gc.orig(zBot)));
		})
);
