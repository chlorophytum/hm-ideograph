import { Func, Template } from "@chlorophytum/hltt-next";
import { add, gc, max, mul, round, sub } from "@chlorophytum/hltt-next-expr";
import { Scfs } from "@chlorophytum/hltt-next-stmt";
import { Frac, GlyphPoint, THandle } from "@chlorophytum/hltt-next-type-system";

export const ProcessCollidedStrokeWidth = Func(Frac)
	.returns(Frac)
	.def(function* (e, w0) {
		yield e.Return(max(2 / 5, mul(1 / 2, w0)));
	});

export const CollideHangBottom = Template((Tb: THandle) =>
	Func(Tb, GlyphPoint, GlyphPoint).def(function* (e, botLim, botCur, topCur) {
		yield Scfs(botCur, gc.cur(botLim));
		yield Scfs(
			topCur,
			add(
				round.gray(gc.cur(botLim)),
				ProcessCollidedStrokeWidth(sub(gc.orig(topCur), gc.orig(botCur)))
			)
		);
	})
);

export const CollideHangTop = Template((Tb: THandle) =>
	Func(Tb, GlyphPoint, GlyphPoint).def(function* (e, topLim, botCur, topCur) {
		yield Scfs(topCur, gc.cur(topLim));
		yield Scfs(
			botCur,
			sub(
				round.gray(gc.cur(topLim)),
				ProcessCollidedStrokeWidth(sub(gc.orig(topCur), gc.orig(botCur)))
			)
		);
	})
);

export const AlignTwoStrokes = Func(GlyphPoint, GlyphPoint, GlyphPoint, GlyphPoint);
AlignTwoStrokes.def(function* ($, a, b, c, d) {
	yield Scfs(a, gc.cur(c));
	yield Scfs(b, gc.cur(d));
});

export const CollideDownTwoStrokes = Func(GlyphPoint, GlyphPoint, GlyphPoint, GlyphPoint);
CollideDownTwoStrokes.def(function* (e, botCur, topCur, botBelow, topBelow) {
	yield Scfs(botCur, add(1, gc.cur(botBelow)));
	yield Scfs(
		topCur,
		add(gc.cur(botCur), ProcessCollidedStrokeWidth(sub(gc.cur(topBelow), gc.cur(botBelow))))
	);
});

export const CollideUpTwoStrokes = Func(GlyphPoint, GlyphPoint, GlyphPoint, GlyphPoint);
CollideUpTwoStrokes.def(function* (e, botCur, topCur, botAbove, topAbove) {
	yield Scfs(topCur, sub(gc.cur(topAbove), 1));
	yield Scfs(
		botCur,
		sub(gc.cur(topCur), ProcessCollidedStrokeWidth(sub(gc.cur(topAbove), gc.cur(botAbove))))
	);
});
