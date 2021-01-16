import { Edsl } from "@chlorophytum/hltt";

import { PREFIX } from "../constants";

export const ProgramLib = new Edsl.Library(`${PREFIX}::TtLib::HlttSupportPrograms`);

export namespace Twilights {
	const Lib = new Edsl.Library(`${PREFIX}::TtLib::HlttSupportTwilights`);
	export const StrokeBottom = Lib.TwilightTemplate<[string]>();
	export const StrokeTop = Lib.TwilightTemplate<[string]>();
	export const SpurBottom = Lib.TwilightTemplate<[string]>();
	export const SpurTop = Lib.TwilightTemplate<[string]>();
	export const StrokeBottomOrig = Lib.TwilightTemplate<[string]>();
	export const StrokeTopOrig = Lib.TwilightTemplate<[string]>();
	export const SpurBottomOrig = Lib.TwilightTemplate<[string]>();
	export const SpurTopOrig = Lib.TwilightTemplate<[string]>();
}

export namespace ControlValues {
	const Lib = new Edsl.Library(`${PREFIX}::TtLib::HlttSupportControlValues`);
	export const StrokeBottom = Lib.ControlValueTemplate<[string]>();
	export const StrokeTop = Lib.ControlValueTemplate<[string]>();
	export const SpurBottom = Lib.ControlValueTemplate<[string]>();
	export const SpurTop = Lib.ControlValueTemplate<[string]>();
}
