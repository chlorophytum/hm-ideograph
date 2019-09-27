import { Func, Template } from "@chlorophytum/hltt-next";
import { arrayInit } from "@chlorophytum/hltt-next-stmt";
import { Store, TT } from "@chlorophytum/hltt-next-type-system";

export function repeatN<T>(n: number, x: T): T[] {
	const a = [];
	for (let j = 0; j < n; j++) a.push(x);
	return a;
}

export const TInitArr = Template(<T extends TT>(N: number, ty: T) =>
	Func(Store(ty), ...repeatN(N, ty)).def(function* ($, pMD, ...arr) {
		if (arr.length !== N) throw new TypeError("TInitArr arity mismatch");
		yield arrayInit(pMD, ...arr);
	})
);

export const TInitZMids = Template(<T extends TT>(N: number, ty: T) =>
	Func(Store(ty), ...repeatN(2 * N, ty)).def(function* ($, pMD, ...arr) {
		if (arr.length !== 2 * N) throw new TypeError("TInitZMids arity mismatch");
		yield arrayInit(pMD, ...arr);
	})
);
