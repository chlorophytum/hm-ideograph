import {
	IFinalHintProgramSink,
	IHint,
	IHintCompiler,
	IHintFactory,
	PropertyBag
} from "@chlorophytum/arch";
import { HlttProgramSink } from "@chlorophytum/final-hint-format-hltt";
import * as EmBox from "@chlorophytum/hint-embox";
import * as _ from "lodash";

import { THintMultipleStrokesExplicit } from "./hltt-programs";
import { getRecPath, MultipleAlignZoneProps } from "./props";

export namespace MultipleAlignZone {
	const TAG = "Chlorophytum::MultipleAlignZone::MultipleAlignZone";
	export class Hint implements IHint {
		private readonly N: number;
		constructor(private readonly props: MultipleAlignZoneProps) {
			const N = props.middleStrokes.length;
			this.N = N;

			if (props.mergePriority.length !== N + 1) {
				throw new TypeError("mergePriority length mismatch");
			}
			if (props.allowCollide.length !== N + 1) {
				throw new TypeError("allowCollide length mismatch");
			}
			if (props.gapMinDist.length !== N + 1) {
				throw new TypeError("gapMinDist length mismatch");
			}
			if (props.inkMinDist.length !== N) {
				throw new TypeError("inkMinDist length mismatch");
			}
		}
		public toJSON() {
			return { type: TAG, props: this.props };
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
			if (json && json.type === TAG) return new Hint(json.props);
			return null;
		}
	}
	export class HlttCompiler implements IHintCompiler {
		constructor(
			private readonly sink: HlttProgramSink,
			private readonly props: MultipleAlignZoneProps
		) {}
		public doCompile() {
			const { props } = this;
			const N = props.middleStrokes.length;
			const recPath = getRecPath(props.mergePriority, props.mergePriority, N);
			let collidePriority: number[] = props.mergePriority.map(
				(c, j) => c * (props.allowCollide[j] ? 1 : 0)
			);
			const recPathCollide = getRecPath(props.mergePriority, collidePriority, N);

			this.sink.addSegment(function*($) {
				const spurBottom = $.symbol(EmBox.Twilights.SpurBottom(props.emBoxName));
				const spurTop = $.symbol(EmBox.Twilights.SpurTop(props.emBoxName));

				const bottomPoint = props.bottomPoint < 0 ? spurBottom : props.bottomPoint;
				const topPoint = props.topPoint < 0 ? spurTop : props.topPoint;

				yield $.call(
					THintMultipleStrokesExplicit(N),
					...props.gapMinDist,
					...props.inkMinDist,
					...recPath,
					...recPathCollide,
					props.bottomFree ? 2 : 1,
					props.topFree ? 2 : 1,
					bottomPoint,
					topPoint,
					..._.flatten(props.middleStrokes)
				);

				// Currently we turn off stubbing to reduce size of FPGM as well as loading speed
				/*
				let simple = true;
				for (let md of props.gapMinDist) if (md !== 1) simple = false;
				for (let md of props.inkMinDist) if (md !== 1) simple = false;
				
				// We'll generate stub functions for the cases that the stroke quantity are small
				// to prevent producing too many functions and the consequent overflow.
				if (simple && N <= 3) {
					yield $.call(
						THintMultipleStrokesStub(N, { ...props, recPath, recPathCollide }),
						bottomPoint,
						topPoint,
						..._.flatten(props.middleStrokes)
					);
				} else {
					yield $.call(
						THintMultipleStrokesExplicit(N),
						...props.gapMinDist,
						...props.inkMinDist,
						...recPath,
						...recPathCollide,
						props.bottomFree ? 2 : 1,
						props.topFree ? 2 : 1,
						bottomPoint,
						topPoint,
						..._.flatten(props.middleStrokes)
					);
				}

				*/
			});
		}
	}
}
