import {
	abs,
	add,
	and,
	Bool,
	div,
	eq,
	Frac,
	Func,
	gc,
	GlyphPoint,
	gt,
	i2f,
	If,
	Int,
	Ip,
	lt,
	Mdap,
	Mdrp,
	min,
	mppem,
	mul,
	not,
	or,
	roundGray,
	Scfs,
	Store,
	sub,
	Template,
	THandle,
	While
} from "@chlorophytum/hltt-next";

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
		yield drBot.set(abs(sub(gc.cur(z1), roundGray(gc.cur(z1)))));
		yield drTop.set(abs(sub(gc.cur(z2), roundGray(gc.cur(z2)))));
		yield If(or(forceRoundTop, and(not(forceRoundBottom), lt(drTop, drBot))))
			.Then(function* () {
				yield Scfs(z2, roundGray(gc.cur(z2)));
				yield Scfs(z1, sub(roundGray(gc.cur(z2)), distOrig));
			})
			.Else(function* () {
				yield Scfs(z1, roundGray(gc.cur(z1)));
				yield Scfs(z2, add(roundGray(gc.cur(z1)), distOrig));
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
