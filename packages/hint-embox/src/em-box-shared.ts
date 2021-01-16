import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import { PREFIX } from "./constants";
import { TInitEmBoxTwilightPoints } from "./programs/init";
import { ControlValues, Twilights } from "./programs/twilight";

export namespace EmBoxShared {
	export interface EmBoxProps {
		name: string;
		strokeBottom: number;
		strokeTop: number;
		spurBottom: number;
		spurTop: number;
		smallSizeExpansionRate: number;
	}
	const TAG = `${PREFIX}::Hints::Shared`;
	export class Hint implements IHint {
		constructor(private readonly props: EmBoxProps) {}
		public toJSON() {
			return {
				type: TAG,
				props: this.props
			};
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			const hlttSink = sink.dynamicCast(HlttProgramSink);
			if (hlttSink) return new HlttCompiler(hlttSink, this.props);
			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

			this.sink.setDefaultControlValue(cvSpurBottom, props.spurBottom);
			this.sink.setDefaultControlValue(cvSpurTop, props.spurTop);
			this.sink.setDefaultControlValue(cvStrokeBottom, props.strokeBottom);
			this.sink.setDefaultControlValue(cvStrokeTop, props.strokeTop);

			this.sink.addSegment(function* ($) {
				const spurBottom = $.Linkable(Twilights.SpurBottom(props.name));
				const spurTop = $.Linkable(Twilights.SpurTop(props.name));
				const strokeBottom = $.Linkable(Twilights.StrokeBottom(props.name));
				const strokeTop = $.Linkable(Twilights.StrokeTop(props.name));

				const spurBottomOrig = $.Linkable(Twilights.SpurBottomOrig(props.name));
				const spurTopOrig = $.Linkable(Twilights.SpurTopOrig(props.name));
				const strokeBottomOrig = $.Linkable(Twilights.StrokeBottomOrig(props.name));
				const strokeTopOrig = $.Linkable(Twilights.StrokeTopOrig(props.name));

				yield $.miap($.Linkable(strokeBottom), $.Linkable(cvStrokeBottom).ptr);
				yield $.miap($.Linkable(strokeTop), $.Linkable(cvStrokeTop).ptr);
				yield $.miap($.Linkable(spurBottom), $.Linkable(cvSpurBottom).ptr);
				yield $.miap($.Linkable(spurTop), $.Linkable(cvSpurTop).ptr);

				yield $.miap($.Linkable(strokeBottomOrig), $.Linkable(cvStrokeBottom).ptr);
				yield $.miap($.Linkable(strokeTopOrig), $.Linkable(cvStrokeTop).ptr);
				yield $.miap($.Linkable(spurBottomOrig), $.Linkable(cvSpurBottom).ptr);
				yield $.miap($.Linkable(spurTopOrig), $.Linkable(cvSpurTop).ptr);

				yield $.call(
					TInitEmBoxTwilightPoints(props.smallSizeExpansionRate),
					$.Linkable(strokeBottom),
					$.Linkable(strokeTop),
					$.Linkable(spurBottom),
					$.Linkable(spurTop),
					$.Linkable(strokeBottomOrig),
					$.Linkable(strokeTopOrig),
					$.Linkable(spurBottomOrig),
					$.Linkable(spurTopOrig)
				);
			});
		}
	}
}
