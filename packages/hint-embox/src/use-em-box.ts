import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	IHintTraveller,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";
import { TypeRep } from "typable";

import { PREFIX } from "./constants";

export namespace UseEmBox {
	export const ReadyPropT = (name: string) =>
		new TypeRep<boolean>(`${PREFIX}::Init::Ready::` + name);

	const TAG = `${PREFIX}::Hints::UseEmBox`;
	export class Hint implements IHint {
		constructor(private readonly name: string, private readonly inner: IHint) {}
		public toJSON() {
			return {
				type: TAG,
				name: this.name,
				inner: this.inner.toJSON()
			};
		}

		private createInnerBag(bag: PropertyBag) {
			const ready = ReadyPropT(this.name);
			const bag1 = bag.extend();
			bag1.set(ready, true);
			return bag1;
		}
		public createCompiler(bag: PropertyBag, sink: IFinalHintProgramSink): IHintCompiler | null {
			const inner = this.inner.createCompiler(this.createInnerBag(bag), sink);
			if (!inner) return null;
			const hlttSink = sink.dynamicCast(HlttProgramSink);
			if (hlttSink) return new HlttCompiler(hlttSink, this.name, inner);
			return null;
		}
		public traverse(bag: PropertyBag, traveller: IHintTraveller) {
			traveller.traverse(this.createInnerBag(bag), this.inner);
		}
	}

	export class HintFactory implements IHintFactory {
		public readonly type = TAG;
		public readJson(json: any, general: IHintFactory) {
			if (json && json.type === TAG && json.inner) {
				const inner = general.readJson(json.inner, general);
				if (inner) return new Hint(json.name, inner);
			}
			return null;
		}
	}

	export class HlttCompiler implements IHintCompiler {
		constructor(
			private readonly sink: HlttProgramSink,
			private readonly name: string,
			private readonly inner: IHintCompiler
		) {}
		public doCompile() {
			this.inner.doCompile();
		}
	}
}
