import { Func, Template } from "@chlorophytum/hltt-next";
import { add, div, eq, gc, gt, i2f, lt, min, mppem, mul, sub } from "@chlorophytum/hltt-next-expr";
import { If, Ip, Mdap, Mdrp, Scfs, While } from "@chlorophytum/hltt-next-stmt";
import { Frac, GlyphPoint, Int, Store, THandle } from "@chlorophytum/hltt-next-type-system";

const IP2Sh = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, GlyphPoint, GlyphPoint, Frac).def(function* (
		$,
		mode,
		zBot,
		zTop,
		zA,
		zB,
		sh
	) {
		yield If(eq(mode, 0)).Then(function* () {
			yield Ip(zBot, zTop, [zA, zB]);
			const y1 = $.Local(Frac),
				y2 = $.Local(Frac),
				yM = $.Local(Frac);
			yield y1.set(gc.cur(zA));
			yield y2.set(gc.cur(zB));
			yield yM.set(div(add(y1, y2), 2));
			yield Scfs(zA, add(yM, mul(sh, sub(y1, yM))));
			yield Scfs(zB, add(yM, mul(sh, sub(y2, yM))));
		});
		yield If(gt(mode, 0)).Then(function* () {
			yield Ip(zBot, zTop, [zB]);
			yield Mdrp(zB, zA);
		});
		yield If(lt(mode, 0)).Then(function* () {
			yield Ip(zBot, zTop, [zA]);
			yield Mdrp(zA, zB);
		});
	})
);

// This function is used at very small PPEM -- We can do almost nothing, just IP
export const HintMultipleStrokesGiveUp = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, Store(GlyphPoint), Int).def(function* ($, N, zBot, zTop, pZMids, giveUpMode) {
		yield Mdap(zBot);
		yield Mdap(zTop);
		const j = $.Local(Int);
		yield j.set(0);
		yield While(lt(j, N), function* () {
			yield IP2Sh(Tb, Tt)(
				giveUpMode,
				zBot,
				zTop,
				pZMids.part(mul(2, j)),
				pZMids.part(add(1, mul(2, j))),
				min(1, mul(1 / 16, i2f(mppem())))
			);
			yield j.set(add(j, 1));
		});
	})
);
