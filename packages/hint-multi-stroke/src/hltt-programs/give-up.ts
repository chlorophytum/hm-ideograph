import { VisCeilT, VisFloorT } from "@chlorophytum/hint-programs-stroke-adjust";
import { Func, Template } from "@chlorophytum/hltt-next";
import { abs, add, and, div, eq, gc, gt, lt, mul, round, sub } from "@chlorophytum/hltt-next-expr";
import { If, Ip, Mdap, Mdrp, Scfs, While } from "@chlorophytum/hltt-next-stmt";
import { Frac, GlyphPoint, Int, Store, THandle } from "@chlorophytum/hltt-next-type-system";

import { ConsideredDark } from "./commons";

const kOddEven = 0.1;
const kSwBlend = 0.5;

const oddEvenAwareIp = Template((Tb: THandle, Tt: THandle) =>
	Func(Tb, Tt, GlyphPoint).def(function* ($, zBot, zTop, zP) {
		const yAbsorb = $.Local(Frac);
		const yCur = $.Local(Frac);

		const syBotRef = VisCeilT(ConsideredDark)(gc.cur(zBot), 0);
		const syTopRef = VisFloorT(ConsideredDark)(gc.cur(zTop), 0);

		yield yCur.set(gc.cur(zP));
		yield yAbsorb.set(
			sub(syTopRef, add(mul(round.gray(div(sub(sub(syTopRef, yCur), 0.5), 2)), 2), 0.5))
		);
		yield If(gt(yAbsorb, syBotRef)).Then(function* () {
			yield yCur.set(add(yAbsorb, mul(1 - kOddEven, sub(yCur, yAbsorb))));
			yield Scfs(zP, yCur);
		});
	})
);

const IP2 = Template((Tb: THandle, Tt: THandle) =>
	Func(Tb, Tt, GlyphPoint, GlyphPoint).def(function* ($, zBot, zTop, zA, zB) {
		yield Ip(zBot, zTop, [zA, zB]);
		const y1o = $.Local(Frac),
			y2o = $.Local(Frac),
			yMo = $.Local(Frac),
			y1c = $.Local(Frac),
			y2c = $.Local(Frac),
			yMc = $.Local(Frac);
		yield If(and(lt(abs(sub(y1o, y2o)), 1), lt(abs(sub(y1c, y2c)), abs(sub(y1o, y2o))))).Then(
			function* () {
				yield y1c.set(gc.cur(zA));
				yield y2c.set(gc.cur(zB));
				yield yMc.set(div(add(y1c, y2c), 2));
				yield y1o.set(gc.orig(zA));
				yield y2o.set(gc.orig(zB));
				yield yMo.set(div(add(y1o, y2o), 2));
				yield Scfs(
					zA,
					add(yMc, add(sub(y1c, yMc), mul(kSwBlend, sub(sub(y1o, yMo), sub(y1c, yMc)))))
				);
				yield Scfs(
					zB,
					add(yMc, add(sub(y2c, yMc), mul(kSwBlend, sub(sub(y2o, yMo), sub(y2c, yMc)))))
				);
			}
		);
	})
);

const IP2WithMode = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, GlyphPoint, GlyphPoint).def(function* ($, mode, zBot, zTop, zA, zB) {
		yield If(eq(mode, 0)).Then(function* () {
			yield IP2(Tb, Tt)(zBot, zTop, zA, zB);
			yield oddEvenAwareIp(Tb, Tt)(zBot, zTop, zA);
			yield oddEvenAwareIp(Tb, Tt)(zBot, zTop, zB);
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
			yield IP2WithMode(Tb, Tt)(
				giveUpMode,
				zBot,
				zTop,
				pZMids.part(mul(2, j)),
				pZMids.part(add(1, mul(2, j)))
			);
			yield j.set(add(j, 1));
		});
	})
);
