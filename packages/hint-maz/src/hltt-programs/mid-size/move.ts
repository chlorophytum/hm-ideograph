import {
	add,
	Frac,
	Func,
	gc,
	GlyphPoint,
	Int,
	lt,
	Mdap,
	Scfs,
	Store,
	Template,
	THandle,
	While
} from "@chlorophytum/hltt-next";

import { midBot, midTop } from "../macros";

const PlaceStrokeDist2 = Func(Store(Frac), GlyphPoint, GlyphPoint, Frac, Frac);
PlaceStrokeDist2.def(function* ($, pY, zBot, zTop, gap, ink) {
	yield pY.deRef.set(add(pY.deRef, gap));
	yield Mdap(zBot);
	yield Scfs(zBot, pY.deRef);
	yield pY.deRef.set(add(pY.deRef, ink));
	yield Scfs(zTop, pY.deRef);
});

export const MovePointsForMiddleHintT = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, Frac, Store(Frac), Store(Frac), Store(GlyphPoint)).def(function* (
		$,
		N,
		zBot,
		zTop,
		y0,
		pGaps,
		pInks,
		pZMids
	) {
		const j = $.Local(Int);
		const y = $.Local(Frac);
		const yBot = $.Local(Frac);
		const yTop = $.Local(Frac);

		yield j.set(0);
		yield y.set(y0);
		yield yBot.set(gc.cur(zBot));
		yield yTop.set(gc.cur(zTop));
		yield While(lt(j, N), function* () {
			yield PlaceStrokeDist2(
				y.ptr,
				midBot(pZMids, j),
				midTop(pZMids, j),
				pGaps.part(j),
				pInks.part(j)
			);
			yield j.set(add(j, 1));
		});
		yield Scfs(zBot, yBot);
		yield Scfs(zTop, yTop);
	})
);
