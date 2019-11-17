import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import { StretchProps, THintBottomStroke, THintTopStroke } from "./programs/boundary";
import { THintStrokeFreeAuto } from "./programs/free";
import { Twilights } from "./programs/twilight";
import { UseEmBox } from "./use-em-box";

export namespace EmBoxStroke {
	const TAG = "Chlorophytum::EmBox::Stroke";
	export type Stretch = StretchProps;

	export interface Props {
		readonly atTop?: boolean;
		readonly spur?: boolean;
		readonly zsBot: number;
		readonly zsTop: number;
	}
	export class Hint implements IHint {
		constructor(private readonly boxName: string, readonly props: Props) {}
		public toJSON() {
			return {
				type: TAG,
				boxName: this.boxName,
				...this.props
			};
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			const ready = bag.get(UseEmBox.ReadyPropT(this.boxName));

			if (!ready) throw new Error(`Em box ${this.boxName} is not initialized.`);
			const hlttSink = sink.dynamicCast(HlttProgramSink);
			if (hlttSink) {
				return new HlttCompiler(hlttSink, this.boxName, this.props, ready);
			}

			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		public readJson(json: any) {
			if (json && json.type === TAG) {
				return new Hint(json.boxName, json);
			}
			return null;
		}
	}

	export class HlttCompiler implements IHintCompiler {
		constructor(
			private readonly sink: HlttProgramSink,
			private readonly boxName: string,
			private readonly props: Props,
			private readonly stretch: StretchProps
		) {}
		public doCompile() {
			const { boxName, stretch } = this;
			const { atTop: top, spur, zsBot, zsTop } = this.props;
			this.sink.addSegment(function*($) {
				const spurBottom = $.symbol(Twilights.SpurBottom(boxName));
				const spurTop = $.symbol(Twilights.SpurTop(boxName));
				const strokeBottom = $.symbol(Twilights.StrokeBottom(boxName));
				const strokeTop = $.symbol(Twilights.StrokeTop(boxName));

				const spurBottomOrig = $.symbol(Twilights.SpurBottomOrig(boxName));
				const spurTopOrig = $.symbol(Twilights.SpurTopOrig(boxName));
				const strokeBottomOrig = $.symbol(Twilights.StrokeBottomOrig(boxName));
				const strokeTopOrig = $.symbol(Twilights.StrokeTopOrig(boxName));

				if (spur) {
					yield $.call(
						THintStrokeFreeAuto,
						spurBottom,
						spurTop,
						spurBottomOrig,
						spurTopOrig,
						zsBot,
						zsTop
					);
				} else if (top) {
					yield $.call(
						THintTopStroke(stretch),
						strokeBottom,
						strokeTop,
						strokeBottomOrig,
						strokeTopOrig,
						zsBot,
						zsTop
					);
				} else {
					yield $.call(
						THintBottomStroke(stretch),
						strokeBottom,
						strokeTop,
						strokeBottomOrig,
						strokeTopOrig,
						zsBot,
						zsTop
					);
				}
			});
		}
	}
}
