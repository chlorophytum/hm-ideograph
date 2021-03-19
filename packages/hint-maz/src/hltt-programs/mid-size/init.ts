import { AdjustStrokeDistT, OctDistOrigT } from "@chlorophytum/hint-programs-stoke-adjust";
import {
	add,
	div,
	Frac,
	Func,
	GlyphPoint,
	Int,
	lt,
	lteq,
	max,
	mul,
	Store,
	Template,
	THandle,
	While
} from "@chlorophytum/hltt-next";

import { FetchOrigGap } from "../commons";
import { midBot, midTop } from "../macros";

import { MaxAverageDivisorIncreaseStep } from "./loop";

export const InitMSDGapEntries = Template((Tb: THandle, Tt: THandle) =>
	Func(
		Int,
		Store(Frac),
		Store(Frac),
		Store(Frac),
		Store(Frac),
		Store(Frac),
		Tb,
		Tt,
		Store(GlyphPoint),
		Store(Frac)
	).def(function* ($, N, pTotalDist, pA, pC, pDiv, pAlloc, zBot, zTop, pZMids, pGapMD) {
		const j = $.Local(Int);
		const gapDist = $.Local(Frac);
		yield j.set(0);
		yield gapDist.set(0);
		yield While(lteq(j, N), function* () {
			yield gapDist.set(FetchOrigGap(Tb, Tt)(N, j, zBot, zTop, pZMids));
			yield InitMSDistEntry(
				mul(2, j),
				pTotalDist,
				pA,
				pC,
				pDiv,
				pAlloc,
				gapDist,
				pGapMD.part(j)
			);
			yield j.set(add(j, 1));
		});
	})
);

export const InitMSDInkEntries = Func(
	Int,
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(GlyphPoint),
	Store(Frac)
).def(function* ($, N, pTotalDist, pA, pC, pDiv, pAlloc, pZMids, pInkMD) {
	const j = $.Local(Int);
	yield j.set(0);
	yield While(lt(j, N), function* () {
		yield InitMSDistEntry(
			add(1, mul(2, j)),
			pTotalDist,
			pA,
			pC,
			pDiv,
			pAlloc,
			AdjustStrokeDistT(2)(
				OctDistOrigT(GlyphPoint, GlyphPoint)(midBot(pZMids, j), midTop(pZMids, j))
			),
			pInkMD.part(j)
		);
		yield j.set(add(j, 1));
	});
});

const InitMSDistEntry = Func(
	Int,
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Store(Frac),
	Frac,
	Frac
).def(function* ($, j, pTotalDist, pA, pC, pDiv, pAlloc, origDist, pixelsAllocated) {
	const divisor = $.Local(Frac);
	yield divisor.set(add(1, mul(MaxAverageDivisorIncreaseStep, pixelsAllocated)));
	yield pA.part(j).set(max(0, origDist));
	yield pC.part(j).set(div(pA.part(j), divisor));
	yield pDiv.part(j).set(divisor);
	yield pAlloc.part(j).set(pixelsAllocated);
	yield pTotalDist.deRef.set(add(pTotalDist.deRef, pA.part(j)));
});
