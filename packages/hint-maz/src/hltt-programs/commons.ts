import { OctDistOrigT } from "@chlorophytum/hint-programs-stoke-adjust";
import {
	add,
	div,
	eq,
	Frac,
	Func,
	GlyphPoint,
	If,
	Int,
	lt,
	lteq,
	Store,
	sub,
	Template,
	THandle,
	While
} from "@chlorophytum/hltt-next";

import { midBot, midTop } from "./macros";

export const ConsideredDark = 3 / 4;

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
