import { TtLibrary } from "@chlorophytum/hltt";

export namespace Twilights {
	const Lib = new TtLibrary(`Chlorophytum::EmBox::HlttSupportTwilights`);
	export const StrokeBottom = Lib.TwilightTemplate<[string]>();
	export const StrokeTop = Lib.TwilightTemplate<[string]>();
	export const ArchBottom = Lib.TwilightTemplate<[string]>();
	export const ArchTop = Lib.TwilightTemplate<[string]>();
	export const SpurBottom = Lib.TwilightTemplate<[string]>();
	export const SpurTop = Lib.TwilightTemplate<[string]>();
}

export namespace ControlValues {
	const Lib = new TtLibrary(`Chlorophytum::EmBox::HlttSupportControlValues`);
	export const StrokeBottom = Lib.ControlValueTemplate<[string]>();
	export const StrokeTop = Lib.ControlValueTemplate<[string]>();
	export const ArchBottom = Lib.ControlValueTemplate<[string]>();
	export const ArchTop = Lib.ControlValueTemplate<[string]>();
	export const SpurBottom = Lib.ControlValueTemplate<[string]>();
	export const SpurTop = Lib.ControlValueTemplate<[string]>();
}
