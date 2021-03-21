import { add, Expr, mul } from "@chlorophytum/hltt-next-expr";
import { Int, Store, TT } from "@chlorophytum/hltt-next-type-system";

export const ConsideredDark = 3 / 4;

export function midBot<T extends TT>(zMids: Expr<Store<T>>, index: number | Expr<Int>): Expr<T> {
	return zMids.part(mul(index, 2));
}
export function midTop<T extends TT>(zMids: Expr<Store<T>>, index: number | Expr<Int>): Expr<T> {
	return zMids.part(add(mul(index, 2), 1));
}
