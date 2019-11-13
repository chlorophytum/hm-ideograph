import { Expression, ProgramDsl } from "@chlorophytum/hltt";

import { THintBottomStrokeFree, THintTopStrokeFree } from "./free";
import { ProgramLib } from "./twilight";

export interface StretchProps {
	readonly PIXEL_RATIO_TO_MOVE: number;
	readonly PIXEL_SHIFT_TO_MOVE: number;
	readonly STRETCH_BOTTOM_A: number;
	readonly STRETCH_BOTTOM_X: number;
	readonly STRETCH_TOP_A: number;
	readonly STRETCH_TOP_X: number;
	readonly CUTIN: number;
}

const TDistAdjustBot = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [d] = $.args(1);
	const correctedPpem = $.max(
		$.coerce.toF26D6(1),
		$.add(
			$.coerce.toF26D6(stretch.STRETCH_BOTTOM_A),
			$.mul($.coerce.toF26D6((stretch.STRETCH_BOTTOM_X * 64) / 12), $.mppem())
		)
	);
	yield $.return($.max(0, $.sub(d, $.div(d, correctedPpem))));
});

const TDistAdjustTop = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [d] = $.args(1);
	const correctedPpem = $.max(
		$.coerce.toF26D6(1),
		$.add(
			$.coerce.toF26D6(stretch.STRETCH_TOP_A),
			$.mul($.coerce.toF26D6((stretch.STRETCH_TOP_X * 64) / 12), $.mppem())
		)
	);
	yield $.return($.max(0, $.sub(d, $.div(d, correctedPpem))));
});

const FOffsetMovementHasImprovement = ProgramLib.Func(function*($) {
	const [dOrig, dCur, sign] = $.args(3);
	yield $.return($.lteq($.abs($.sub($.add(sign, dCur), dOrig)), $.abs($.sub(dCur, dOrig))));
});

function $TooMuch($: ProgramDsl, stretch: StretchProps, dCur: Expression, dOrig: Expression) {
	return $.or(
		$.gt(dCur, $.mul($.coerce.toF26D6(stretch.PIXEL_RATIO_TO_MOVE), dOrig)),
		$.gt(dCur, $.add($.coerce.toF26D6(stretch.PIXEL_SHIFT_TO_MOVE), dOrig))
	);
}
function $TooLess($: ProgramDsl, stretch: StretchProps, dCur: Expression, dOrig: Expression) {
	return $.or(
		$.lt(dCur, $.mul($.coerce.toF26D6(1 / stretch.PIXEL_RATIO_TO_MOVE), dOrig)),
		$.lt(dCur, $.add($.coerce.toF26D6(-stretch.PIXEL_SHIFT_TO_MOVE), dOrig))
	);
}

const TComputeOffsetPixelsForTBImpl = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [dOrig, dCur, sign] = $.args(3);

	yield $.if($.gteq(dOrig, $.coerce.toF26D6(stretch.CUTIN)), function*() {
		yield $.if(
			$.and(
				$TooMuch($, stretch, dCur, dOrig),
				$.call(FOffsetMovementHasImprovement, dOrig, dCur, $.coerce.toF26D6(-1))
			),
			function*() {
				yield $.return($.mul($.coerce.toF26D6(-1), sign));
			}
		);
		yield $.if(
			$.and(
				$TooLess($, stretch, dCur, dOrig),
				$.call(FOffsetMovementHasImprovement, dOrig, dCur, $.coerce.toF26D6(+1))
			),
			function*() {
				yield $.return($.mul($.coerce.toF26D6(+1), sign));
			}
		);
	});

	yield $.return(0);
});
const TComputeOffsetPixelsForTB = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [dOrig, dCur, sign] = $.args(3);

	const offset = $.local();
	yield $.set(offset, $.call(TComputeOffsetPixelsForTBImpl(stretch), dOrig, dCur, sign));
	yield $.if(offset, function*() {
		yield $.return(offset);
	});

	/*
	yield $.set(offset, $.call(TComputeOffsetPixelsForTBImpl(stretch), dOrigArch, dCurArch, sign));
	yield $.if(offset, function*() {
		yield $.return(offset);
	});
*/

	yield $.return(0);
});

export const THintBottomStroke = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(6);

	// Perform a "free" position first -- we'd like to grab the positions
	yield $.call(THintBottomStrokeFree, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop);

	const dOffset = $.local();

	yield $.set(
		dOffset,
		$.call(
			TComputeOffsetPixelsForTB(stretch),
			$.call(TDistAdjustBot(stretch), $.sub($.gc.orig(zsBot), $.gc.cur(zBotOrig))),
			$.sub($.gc.cur(zsBot), $.gc.cur(zBot)),

			$.coerce.toF26D6(+1)
		)
	);

	yield $.if($.lt($.add($.gc.cur(zsBot), dOffset), $.gc.cur(zBot)), function*() {
		yield $.set(dOffset, $.add(dOffset, $.coerce.toF26D6(+1)));
	});

	yield $.scfs(zsBot, $.add($.gc.cur(zsBot), dOffset));
	yield $.scfs(zsTop, $.add($.gc.cur(zsTop), dOffset));
});

export const THintTopStroke = ProgramLib.Template(function*($, stretch: StretchProps) {
	const [zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop] = $.args(6);

	// Perform a "free" position first -- we'd like to grab the positions
	yield $.call(THintTopStrokeFree, zBot, zTop, zBotOrig, zTopOrig, zsBot, zsTop);
	const dOffset = $.local();

	yield $.set(
		dOffset,
		$.call(
			TComputeOffsetPixelsForTB(stretch),
			$.call(TDistAdjustTop(stretch), $.sub($.gc.cur(zTopOrig), $.gc.orig(zsTop))),
			$.sub($.gc.cur(zTop), $.gc.cur(zsTop)),
			$.coerce.toF26D6(-1)
		)
	);
	yield $.if($.gt($.add($.gc.cur(zsTop), dOffset), $.gc.cur(zTop)), function*() {
		yield $.set(dOffset, $.add(dOffset, $.coerce.toF26D6(-1)));
	});

	yield $.scfs(zsBot, $.add($.gc.cur(zsBot), dOffset));
	yield $.scfs(zsTop, $.add($.gc.cur(zsTop), dOffset));
});
