import { Func, Template } from "@chlorophytum/hltt-next";
import { abs, add, and, gc, lt, mul, not, or, round, sub } from "@chlorophytum/hltt-next-expr";
import { If, Ip, Mdap, Scfs, While } from "@chlorophytum/hltt-next-stmt";
import { Bool, Frac, GlyphPoint, Int, Store, THandle } from "@chlorophytum/hltt-next-type-system";

const IpClose = Template((Tb: THandle, Tt: THandle) =>
	Func(Bool, Bool, Tb, Tt, GlyphPoint, GlyphPoint).def(function* (
		$,
		forceRoundBottom,
		forceRoundTop,
		zBot,
		zTop,
		z1,
		z2
	) {
		yield Ip(zBot, zTop, [z1, z2]);
		const distOrig = $.Local(Frac);
		const drTop = $.Local(Frac);
		const drBot = $.Local(Frac);
		yield distOrig.set(sub(gc.orig(z2), gc.orig(z1)));
		yield drBot.set(abs(sub(gc.cur(z1), round.gray(gc.cur(z1)))));
		yield drTop.set(abs(sub(gc.cur(z2), round.gray(gc.cur(z2)))));
		yield If(or(forceRoundTop, and(not(forceRoundBottom), lt(drTop, drBot))))
			.Then(function* () {
				yield Scfs(z2, round.gray(gc.cur(z2)));
				yield Scfs(z1, sub(round.gray(gc.cur(z2)), distOrig));
			})
			.Else(function* () {
				yield Scfs(z1, round.gray(gc.cur(z1)));
				yield Scfs(z2, add(round.gray(gc.cur(z1)), distOrig));
			});
	})
);

// This function is used at very large PPEM -- whether to round is no longer important, just IP
export const HintMultipleStrokesSimple = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Bool, Bool, Tb, Tt, Store(GlyphPoint)).def(function* (
		$,
		N,
		forceRoundBottom,
		forceRoundTop,
		zBot,
		zTop,
		pZMids
	) {
		yield Mdap(zBot);
		yield Mdap(zTop);

		const j = $.Local(Int);
		yield j.set(0);
		yield While(lt(j, N), function* () {
			yield IpClose(Tb, Tt)(
				forceRoundBottom,
				forceRoundTop,
				zBot,
				zTop,
				pZMids.part(mul(2, j)),
				pZMids.part(add(1, mul(2, j)))
			);
			yield j.set(add(j, 1));
		});
	})
);
