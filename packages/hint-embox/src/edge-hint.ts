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
import { THintBottomEdge, THintTopEdge } from "./programs/edge";
import { Twilights } from "./programs/twilight";
import { UseEmBox } from "./use-em-box";

export namespace EmBoxEdge {
	const TAG = `${PREFIX}::Hints::Edge`;
	export class Hint implements IHint {
		constructor(
			private readonly boxName: string,
			private readonly top: boolean,
			private readonly zEdge: Geometry.PointReference
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
			const ready = UseEmBox.ReadyPropT(this.boxName);
			if (!bag.get(ready)) throw new Error(`Em box ${this.boxName} is not initialized.`);
			const hlttSink = sink.dynamicCast(HlttProgramSink);
			if (hlttSink) return new HlttCompiler(hlttSink, this.boxName, this.top, this.zEdge);
			return null;
		}
		public traverse() {}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			private readonly zEdge: Geometry.PointReference
		) {}
		public doCompile() {
			const { boxName, top, zEdge } = this;
			const zidEdge = this.sink.resolveGlyphPoint(zEdge);
			this.sink.addSegment(function* ($) {
				if (top) {
					yield THintTopEdge(
						Twilights.SpurTop(boxName),
						Twilights.SpurTopOrig(boxName),
						zidEdge
					);
				} else {
					yield THintBottomEdge(
						Twilights.SpurBottom(boxName),
						Twilights.SpurBottomOrig(boxName),
						zidEdge
					);
				}
			});
		}
	}
}
