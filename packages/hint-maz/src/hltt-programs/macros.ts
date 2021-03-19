import { add, Expr, Int, mul, Store, TT } from "@chlorophytum/hltt-next";

export const ConsideredDark = 3 / 4;

export function midBot<T extends TT>(zMids: Expr<Store<T>>, index: number | Expr<Int>) {
	return zMids.part(mul(index, 2));
}
export function midTop<T extends TT>(zMids: Expr<Store<T>>, index: number | Expr<Int>) {
	return zMids.part(add(mul(index, 2), 1));
}
