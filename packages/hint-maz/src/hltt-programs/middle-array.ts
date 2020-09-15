import { Lib } from "./commons";

export const TInitMD = Lib.Template(function* (e, N: number, md: number[]) {
	const [vpMD] = e.args(1);
	const pMD = e.coerce.fromIndex.variable(vpMD, N);
	yield e.setArr(pMD, md.map(e.coerce.toF26D6));
});

export const TInitArr = Lib.Template(function* (e, N: number) {
	const [vpMD, ...arr] = e.args(1 + N);
	const pMD = e.coerce.fromIndex.variable(vpMD, N);
	yield e.setArr(pMD, arr);
});

export const MapArrIntToPx = Lib.Func(function* ($) {
	const [vpA, N] = $.args(2);
	const pA = $.coerce.fromIndex.variable(vpA);
	const j = $.local();
	yield $.set(j, 0);
	yield $.while($.lt(j, N), function* () {
		yield $.set($.part(pA, j), $.toFloat($.part(pA, j)));
		yield $.addSet(j, 1);
	});
});

export const TInitZMids = Lib.Template(function* (e, N: number) {
	const [vpMD, ...zMids] = e.args(1 + 2 * N);
	const pMD = e.coerce.fromIndex.variable(vpMD, 2 * N);
	yield e.setArr(pMD, zMids);
});

export const TInitRecPath = Lib.Template(function* (e, N: number, recPath: number[]) {
	const [vpMD] = e.args(1);
	const pMD = e.coerce.fromIndex.variable(vpMD, N);
	const recPath1: number[] = [];
	for (let j = 0; j < N; j++) recPath1[j] = recPath[j] || 0;
	yield e.setArr(pMD, recPath1);
});
