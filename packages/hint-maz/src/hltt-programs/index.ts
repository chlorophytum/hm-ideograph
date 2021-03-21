import { Func, Template } from "@chlorophytum/hltt-next";
import {
	add,
	floor,
	i2f,
	lteq,
	max,
	min,
	mppem,
	mul,
	round,
	sub,
	unsafeCoerce
} from "@chlorophytum/hltt-next-expr";
import { VarArgs, While } from "@chlorophytum/hltt-next-stmt";
import { Bool, Frac, GlyphPoint, Int, Store, THandle } from "@chlorophytum/hltt-next-type-system";

import { FetchOrigGap } from "./commons";
import { repeatN, TInitArr, TInitZMids } from "./middle-array";
import { THintMultipleStrokesMainImpl } from "./middle-main";

const AmendMinGapDistT = Template((Tb: THandle, Tt: THandle) =>
	Func(Int, Tb, Tt, Store(GlyphPoint), Store(Frac)).def(function* (
		$,
		N,
		zBot,
		zTop,
		pZMids,
		pGapMD
	) {
		const j = $.Local(Int);
		const gapDist = $.Local(Frac);
		const gapMinDistOld = $.Local(Frac);

		yield j.set(0);
		yield gapDist.set(0);
		yield gapMinDistOld.set(0);

		yield While(lteq(j, N), function* () {
			yield gapDist.set(FetchOrigGap(Tb, Tt)(N, j, zBot, zTop, pZMids));
			yield gapMinDistOld.set(pGapMD.part(j));
			yield pGapMD
				.part(j)
				.set(
					max(
						floor(gapMinDistOld),
						mul(
							min(1, floor(gapMinDistOld)),
							max(0, round.white(sub(gapDist, add(1, mul(1 / 32, i2f(mppem()))))))
						)
					)
				);

			yield j.set(add(j, 1));
		});
	})
);

export const THintMultipleStrokesExplicit = Template((N: number, Tb: THandle, Tt: THandle) =>
	Func(
		...repeatN(N + 1, Frac),
		...repeatN(N, Frac),
		...repeatN(N, Int),
		...repeatN(N, Int),
		Bool,
		Bool,
		Tb,
		Tt,
		...repeatN(2 * N, GlyphPoint),
		Int
	).def(function* ($, ...args) {
		const va = VarArgs.from(args);
		const ixGapMinDist = va.take(Frac, N + 1);
		const ixInkMinDist = va.take(Frac, N);
		const ixRecPath = va.take(Int, N);
		const ixRecPathCollide = va.take(Int, N);
		const [iBotFree] = va.take(Bool, 1);
		const [iTopFree] = va.take(Bool, 1);
		const [zBot] = va.take(Tb, 1);
		const [zTop] = va.take(Tt, 1);
		const zMids = va.take(GlyphPoint, 2 * N);
		const [giveUpMode] = va.take(Int, 1);

		const oGapMD = $.LocalArray(Frac, N + 1);
		const aGapMD = $.LocalArray(Frac, N + 1);
		const aInkMD = $.LocalArray(Frac, N);
		const aRecPath = $.LocalArray(Int, N);
		const aRecPathCollide = $.LocalArray(Int, N);
		const aZMids = $.LocalArray(GlyphPoint, N * 2);

		yield TInitArr(N + 1, Frac)(oGapMD, ...ixGapMinDist);
		yield TInitArr(N + 1, Frac)(aGapMD, ...ixGapMinDist);
		yield TInitArr(N, Frac)(aInkMD, ...ixInkMinDist);
		yield TInitArr(N, Int)(aRecPath, ...ixRecPath);
		yield TInitArr(N, Int)(aRecPathCollide, ...ixRecPathCollide);
		yield TInitZMids(N, GlyphPoint)(aZMids, ...zMids);

		yield AmendMinGapDistT(Tb, Tt)(
			N,
			unsafeCoerce(Tb, zBot),
			unsafeCoerce(Tt, zTop),
			aZMids,
			aGapMD
		);

		yield THintMultipleStrokesMainImpl(N, Tb, Tt)(
			iBotFree,
			iTopFree,
			zBot,
			zTop,
			oGapMD,
			aZMids,
			aGapMD,
			aInkMD,
			aRecPath,
			aRecPathCollide,
			giveUpMode
		);
	})
);
