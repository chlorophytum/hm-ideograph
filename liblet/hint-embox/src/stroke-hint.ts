import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import {
	StretchProps,
	THintBottomStroke,
	THintStrokeFreeAuto,
	THintTopStroke
} from "./programs/program";
import { Twilights } from "./programs/twilight";
import { UseEmBox } from "./use-em-box";

export namespace EmBoxStroke {
	const TAG = "Chlorophytum::EmBox::Stroke";
	export type Stretch = StretchProps;
	export class Hint implements IHint {
		constructor(
			private readonly boxName: string,
			private readonly top: boolean,
			private readonly spur: boolean,
			private readonly zSBot: number,
			private readonly zsTop: number,
			private readonly stretch: StretchProps
		) {}
		public toJSON() {
			return {
				type: TAG,
				boxName: this.boxName,
				top: this.top,
				spur: this.spur,
				zsBot: this.zSBot,
				zsTop: this.zsTop,
				stretch: this.stretch
			};
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			const ready = UseEmBox.ReadyPropT.suffix(this.boxName);
			if (!bag.get(ready)) throw new Error(`Em box ${this.boxName} is not initialized.`);
			if (sink instanceof HlttProgramSink) {
				return new HlttCompiler(
					sink,
					this.boxName,
					this.top,
					this.spur,
					this.zSBot,
					this.zsTop,
					this.stretch
				);
			}
			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		public readJson(json: any) {
			if (json && json.type === TAG) {
				return new Hint(
					json.boxName,
					json.top,
					json.spur,
					json.zsBot,
					json.zsTop,
					json.stretch || null
				);
			}
			return null;
		}
	}

	export class HlttCompiler implements IHintCompiler {
		constructor(
			private readonly sink: HlttProgramSink,
			private readonly boxName: string,
			private readonly top: boolean,
			private readonly spur: boolean,
			private readonly zsBot: number,
			private readonly zsTop: number,
			private readonly stretch: StretchProps
		) {}
		public doCompile() {
			const { boxName, top, spur, zsBot, zsTop, stretch } = this;
			this.sink.addSegment(function*($) {
				const spurBottom = $.symbol(Twilights.SpurBottom(boxName));
				const spurTop = $.symbol(Twilights.SpurTop(boxName));
				const strokeBottom = $.symbol(Twilights.StrokeBottom(boxName));
				const strokeTop = $.symbol(Twilights.StrokeTop(boxName));
				const archBottom = $.symbol(Twilights.ArchBottom(boxName));
				const archTop = $.symbol(Twilights.ArchTop(boxName));

				const spurBottomOrig = $.symbol(Twilights.SpurBottomOrig(boxName));
				const spurTopOrig = $.symbol(Twilights.SpurTopOrig(boxName));
				const strokeBottomOrig = $.symbol(Twilights.StrokeBottomOrig(boxName));
				const strokeTopOrig = $.symbol(Twilights.StrokeTopOrig(boxName));
				const archBottomOrig = $.symbol(Twilights.ArchBottomOrig(boxName));
				const archTopOrig = $.symbol(Twilights.ArchTopOrig(boxName));

				if (spur) {
					if (top) {
						yield $.call(
							THintStrokeFreeAuto,
							spurBottom,
							spurTop,
							spurBottomOrig,
							spurTopOrig,
							zsBot,
							zsTop
						);
					} else {
						yield $.call(
							THintStrokeFreeAuto,
							spurBottom,
							spurTop,
							spurBottomOrig,
							spurTopOrig,
							zsBot,
							zsTop
						);
					}
				} else {
					if (top) {
						yield $.call(
							THintTopStroke(stretch),
							strokeBottom,
							strokeTop,
							archBottom,
							archTop,
							strokeBottomOrig,
							strokeTopOrig,
							archBottomOrig,
							archTopOrig,
							zsBot,
							zsTop
						);
					} else {
						yield $.call(
							THintBottomStroke(stretch),
							strokeBottom,
							strokeTop,
							archBottom,
							archTop,
							strokeBottomOrig,
							strokeTopOrig,
							archBottomOrig,
							archTopOrig,
							zsBot,
							zsTop
						);
					}
				}
			});
		}
	}
}
