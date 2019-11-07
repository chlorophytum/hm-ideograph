import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";

import { THintBottomEdge, THintTopEdge } from "./programs/program";
import { Twilights } from "./programs/twilight";
import { UseEmBox } from "./use-em-box";

export namespace EmBoxEdge {
	const TAG = "Chlorophytum::EmBox::Edge";
	export class Hint implements IHint {
		constructor(
			private readonly boxName: string,
			private readonly top: boolean,
			private readonly zEdge: number
		) {}
		public toJSON() {
			return {
				type: TAG,
				boxName: this.boxName,
				top: this.top,
				zEdge: this.zEdge
			};
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			const ready = UseEmBox.ReadyPropT.suffix(this.boxName);
			if (!bag.get(ready)) throw new Error(`Em box ${this.boxName} is not initialized.`);
			if (sink instanceof HlttProgramSink) {
				return new HlttCompiler(sink, this.boxName, this.top, this.zEdge);
			}
			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		public readJson(json: any) {
			if (json && json.type === TAG) {
				return new Hint(json.boxName, json.top, json.zEdge);
			}
			return null;
		}
	}

	export class HlttCompiler implements IHintCompiler {
		constructor(
			private readonly sink: HlttProgramSink,
			private readonly boxName: string,
			private readonly top: boolean,
			private readonly zEdge: number
		) {}
		public doCompile() {
			const { boxName, top, zEdge } = this;
			this.sink.addSegment(function*($) {
				if (top) {
					yield $.call(
						THintTopEdge,
						$.symbol(Twilights.SpurTop(boxName)),
						$.symbol(Twilights.SpurTopOrig(boxName)),
						zEdge
					);
				} else {
					yield $.call(
						THintBottomEdge,
						$.symbol(Twilights.SpurBottom(boxName)),
						$.symbol(Twilights.SpurBottomOrig(boxName)),
						zEdge
					);
				}
			});
		}
	}
}
