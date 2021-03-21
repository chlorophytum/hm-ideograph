import { ControlValue, Template, Twilight } from "@chlorophytum/hltt-next";
import "@chlorophytum/hltt-next-expr";
import { Frac } from "@chlorophytum/hltt-next-type-system";

export namespace Twilights {
	export const StrokeBottom = Template((group: string) => Twilight());
	export const StrokeTop = Template((group: string) => Twilight());
	export const SpurBottom = Template((group: string) => Twilight());
	export const SpurTop = Template((group: string) => Twilight());
	export const StrokeBottomOrig = Template((group: string) => Twilight());
	export const StrokeTopOrig = Template((group: string) => Twilight());
	export const SpurBottomOrig = Template((group: string) => Twilight());
	export const SpurTopOrig = Template((group: string) => Twilight());
}

export namespace ControlValues {
	export const StrokeBottom = Template((group: string) => ControlValue(Frac));
	export const StrokeTop = Template((group: string) => ControlValue(Frac));
	export const SpurBottom = Template((group: string) => ControlValue(Frac));
	export const SpurTop = Template((group: string) => ControlValue(Frac));
}
