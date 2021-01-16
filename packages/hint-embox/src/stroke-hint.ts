import {
	Geometry,
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import { PREFIX } from "./constants";
import { THintBottomStroke, THintTopStroke } from "./programs/boundary";
import { THintStrokeFreeAuto } from "./programs/free";
import { Twilights } from "./programs/twilight";
import { UseEmBox } from "./use-em-box";

export namespace EmBoxStroke {
	const TAG = `${PREFIX}::Hints::Stroke`;
	const DistinguishDist = 3 / 5;

	export interface Props {
		readonly atTop?: boolean;
		readonly spur?: boolean;
		readonly zsBot: Geometry.PointReference;
		readonly zsTop: Geometry.PointReference;
		readonly leavePixelsBelow: number;
		readonly leavePixelsAbove: number;
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
				return new HlttCompiler(hlttSink, this.boxName, this.props);
			}

			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			private readonly props: Props
		) {}
		public doCompile() {
			const { boxName, props } = this;
			const zsBot = this.sink.resolveGlyphPoint(this.props.zsBot);
			const zsTop = this.sink.resolveGlyphPoint(this.props.zsTop);
			this.sink.addSegment(function* ($) {
				const spurBottom = $.Linkable(Twilights.SpurBottom(boxName));
				const spurTop = $.Linkable(Twilights.SpurTop(boxName));
				const strokeBottom = $.Linkable(Twilights.StrokeBottom(boxName));
				const strokeTop = $.Linkable(Twilights.StrokeTop(boxName));

				const spurBottomOrig = $.Linkable(Twilights.SpurBottomOrig(boxName));
				const spurTopOrig = $.Linkable(Twilights.SpurTopOrig(boxName));
				const strokeBottomOrig = $.Linkable(Twilights.StrokeBottomOrig(boxName));
				const strokeTopOrig = $.Linkable(Twilights.StrokeTopOrig(boxName));

				if (props.spur) {
					yield $.call(
						THintStrokeFreeAuto,
						$.coerce.toF26D6(DistinguishDist + Math.max(0, props.leavePixelsBelow)),
						$.coerce.toF26D6(DistinguishDist + Math.max(0, props.leavePixelsAbove)),
						spurBottom,
						spurTop,
						spurBottomOrig,
						spurTopOrig,
						zsBot,
						zsTop
					);
				} else if (props.atTop) {
					yield $.call(
						THintTopStroke,
						strokeBottom,
						strokeTop,
						strokeBottomOrig,
						strokeTopOrig,
						zsBot,
						zsTop
					);
				} else {
					yield $.call(
						THintBottomStroke,
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
