import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import { TInitEmBoxTwilightPoints } from "./programs/init";
import { ControlValues, Twilights } from "./programs/twilight";

export namespace EmBoxShared {
	export interface EmBoxProps {
		name: string;
		strokeBottom: number;
		strokeTop: number;
		archBottom: number;
		archTop: number;
		spurBottom: number;
		spurTop: number;
	}
	const TAG = "Chlorophytum::EmBox::Shared";
	export class Hint implements IHint {
		constructor(private readonly props: EmBoxProps) {}
		public toJSON() {
			return {
				type: TAG,
				props: this.props
			};
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			if (sink instanceof HlttProgramSink) {
				return new HlttCompiler(sink, this.props);
			}
			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		public readJson(json: any) {
			if (json && json.type === TAG) {
				return new Hint(json.props);
			}
			return null;
		}
	}

	export class HlttCompiler implements IHintCompiler {
		constructor(private readonly sink: HlttProgramSink, private readonly props: EmBoxProps) {}
		public doCompile() {
			const props = this.props;
			const cvSpurBottom = ControlValues.SpurBottom(props.name);
			const cvSpurTop = ControlValues.SpurTop(props.name);
			const cvStrokeBottom = ControlValues.StrokeBottom(props.name);
			const cvStrokeTop = ControlValues.StrokeTop(props.name);
			const cvArchBottom = ControlValues.ArchBottom(props.name);
			const cvArchTop = ControlValues.ArchTop(props.name);

			this.sink.setDefaultControlValue(cvSpurBottom, props.spurBottom);
			this.sink.setDefaultControlValue(cvSpurTop, props.spurTop);
			this.sink.setDefaultControlValue(cvStrokeBottom, props.strokeBottom);
			this.sink.setDefaultControlValue(cvStrokeTop, props.strokeTop);
			this.sink.setDefaultControlValue(cvArchBottom, props.archBottom);
			this.sink.setDefaultControlValue(cvArchTop, props.archTop);

			this.sink.addSegment(function*($) {
				const spurBottom = $.symbol(Twilights.SpurBottom(props.name));
				const spurTop = $.symbol(Twilights.SpurTop(props.name));
				const strokeBottom = $.symbol(Twilights.StrokeBottom(props.name));
				const strokeTop = $.symbol(Twilights.StrokeTop(props.name));
				const archBottom = $.symbol(Twilights.ArchBottom(props.name));
				const archTop = $.symbol(Twilights.ArchTop(props.name));

				const spurBottomOrig = $.symbol(Twilights.SpurBottomOrig(props.name));
				const spurTopOrig = $.symbol(Twilights.SpurTopOrig(props.name));
				const strokeBottomOrig = $.symbol(Twilights.StrokeBottomOrig(props.name));
				const strokeTopOrig = $.symbol(Twilights.StrokeTopOrig(props.name));
				const archBottomOrig = $.symbol(Twilights.ArchBottomOrig(props.name));
				const archTopOrig = $.symbol(Twilights.ArchTopOrig(props.name));

				yield $.miap($.symbol(strokeBottom), $.symbol(cvStrokeBottom).ptr);
				yield $.miap($.symbol(strokeTop), $.symbol(cvStrokeTop).ptr);
				yield $.miap($.symbol(archBottom), $.symbol(cvArchBottom).ptr);
				yield $.miap($.symbol(archTop), $.symbol(cvArchTop).ptr);
				yield $.miap($.symbol(spurBottom), $.symbol(cvSpurBottom).ptr);
				yield $.miap($.symbol(spurTop), $.symbol(cvSpurTop).ptr);

				yield $.miap($.symbol(strokeBottomOrig), $.symbol(cvStrokeBottom).ptr);
				yield $.miap($.symbol(strokeTopOrig), $.symbol(cvStrokeTop).ptr);
				yield $.miap($.symbol(archBottomOrig), $.symbol(cvArchBottom).ptr);
				yield $.miap($.symbol(archTopOrig), $.symbol(cvArchTop).ptr);
				yield $.miap($.symbol(spurBottomOrig), $.symbol(cvSpurBottom).ptr);
				yield $.miap($.symbol(spurTopOrig), $.symbol(cvSpurTop).ptr);

				yield $.call(
					TInitEmBoxTwilightPoints,
					$.symbol(strokeBottom),
					$.symbol(strokeTop),
					$.symbol(archBottom),
					$.symbol(archTop),
					$.symbol(spurBottom),
					$.symbol(spurTop),
					$.symbol(strokeBottomOrig),
					$.symbol(strokeTopOrig),
					$.symbol(archBottomOrig),
					$.symbol(archTopOrig),
					$.symbol(spurBottomOrig),
					$.symbol(spurTopOrig)
				);
			});
		}
	}
}
