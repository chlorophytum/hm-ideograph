import { TtLibrary } from "@chlorophytum/hltt";

export const ProgramLib = new TtLibrary(`Chlorophytum::EmBox::HlttSupportPrograms`);

export namespace Twilights {
	const Lib = new TtLibrary(`Chlorophytum::EmBox::HlttSupportTwilights`);
	export const StrokeBottom = Lib.TwilightTemplate<[string]>();
	export const StrokeTop = Lib.TwilightTemplate<[string]>();
	export const ArchBottom = Lib.TwilightTemplate<[string]>();
	export const ArchTop = Lib.TwilightTemplate<[string]>();
	export const SpurBottom = Lib.TwilightTemplate<[string]>();
	export const SpurTop = Lib.TwilightTemplate<[string]>();
	export const StrokeBottomOrig = Lib.TwilightTemplate<[string]>();
	export const StrokeTopOrig = Lib.TwilightTemplate<[string]>();
	export const ArchBottomOrig = Lib.TwilightTemplate<[string]>();
	export const ArchTopOrig = Lib.TwilightTemplate<[string]>();
	export const SpurBottomOrig = Lib.TwilightTemplate<[string]>();
	export const SpurTopOrig = Lib.TwilightTemplate<[string]>();
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
