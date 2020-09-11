import { Edsl } from "@chlorophytum/hltt";

export function midBot(
	e: Edsl.ProgramDsl,
	zMids: Edsl.Variable<Edsl.VkStorage>,
	index: Edsl.Expression
) {
	return e.part(zMids, e.mul(e.coerce.toF26D6(2), index));
}
export function midTop(
	e: Edsl.ProgramDsl,
	zMids: Edsl.Variable<Edsl.VkStorage>,
	index: Edsl.Expression
) {
	return e.part(zMids, e.add(1, e.mul(e.coerce.toF26D6(2), index)));
}
