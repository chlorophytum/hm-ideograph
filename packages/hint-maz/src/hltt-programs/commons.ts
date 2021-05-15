import { OctDistOrigT } from "@chlorophytum/hint-programs-stoke-adjust";
import { Func, Template } from "@chlorophytum/hltt-next";
import { add, div, eq, lt, lteq, sub } from "@chlorophytum/hltt-next-expr";
import { If, While } from "@chlorophytum/hltt-next-stmt";
import { Frac, GlyphPoint, Int, Store, THandle } from "@chlorophytum/hltt-next-type-system";

import { midBot, midTop } from "./macros";

export const ConsideredDark = 4 / 5;

export const GetFillRateT = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, Store(GlyphPoint))
		.returns(Frac)
		.def(function* ($, N, zBot, zTop, pZMids) {
			const ink = $.Local(Frac);
			const gap = $.Local(Frac);
			yield ink.set(0);
			yield gap.set(0);

			const j = $.Local(Int);
			const gapDist = $.Local(Frac);
			yield j.set(0);
			yield gapDist.set(0);
			yield While(lteq(j, N), function* () {
				yield gapDist.set(FetchOrigGap(Tb, Tt)(N, j, zBot, zTop, pZMids));
				yield gap.set(add(gap, gapDist));
				yield j.set(add(j, 1));
			});

			yield j.set(0);
			yield While(lt(j, N), function* () {
				yield ink.set(
					add(
						ink,
						OctDistOrigT(GlyphPoint, GlyphPoint)(midBot(pZMids, j), midTop(pZMids, j))
					)
				);
				yield j.set(add(j, 1));
			});

			yield $.Return(div(gap, add(gap, ink)));
		})
);

export const FetchOrigGap = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Int, Tb, Tt, Store(GlyphPoint))
		.returns(Frac)
		.def(function* ($, N, j, zBot, zTop, pZMids) {
			yield If(eq(j, 0)).Then(
				$.Return(OctDistOrigT(Tb, GlyphPoint)(zBot, midBot(pZMids, j)))
			);
			yield If(eq(j, N)).Then(
				$.Return(OctDistOrigT(GlyphPoint, Tt)(midTop(pZMids, sub(j, 1)), zTop))
			);
			yield $.Return(
				OctDistOrigT(GlyphPoint, GlyphPoint)(midTop(pZMids, sub(j, 1)), midBot(pZMids, j))
			);
		})
);
