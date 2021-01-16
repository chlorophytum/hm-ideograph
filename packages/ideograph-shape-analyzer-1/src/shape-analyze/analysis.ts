import * as util from "util";

import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintAnalysis } from "../hint-analyze/type";
import Radical from "../types/radical";
import Stem from "../types/stem";

export class Interpolation implements HintAnalysis.InterpolationOrLink {
	constructor(
		public ref1: AdjPoint,
		public ref2: AdjPoint,
		public subject: AdjPoint,
		public priority: number
	) {
		if (!ref1.queryReference() || !ref2.queryReference() || !subject.queryReference())
			throw new Error(
				`UNREF! ${util.inspect(ref1)} -- ${util.inspect(subject)} -- ${util.inspect(ref2)}`
			);
	}
}
export class ShortAbsorption implements HintAnalysis.InterpolationOrLink {
	public ref2 = null;
	constructor(public ref1: AdjPoint, public subject: AdjPoint, public priority: number) {
		if (!ref1.queryReference() || !subject.queryReference())
			throw new Error(`UNREF! ${util.inspect(ref1)} -- ${util.inspect(subject)}`);
	}
}

export class BlueZone {
	public topZs: AdjPoint[] = [];
	public bottomZs: AdjPoint[] = [];
}

export class ColMats {
	public annexation: number[][] = [];
	public darkness: number[][] = [];
	public flips: number[][] = [];
	public flipsSig: number[][] = [];
	public proximity: number[][] = [];
	public spatialProximity: number[][] = [];
}

export class ShapeAnalysisResult {
	public radicals: Radical[] = [];
	public stems: Stem[] = [];
	public stemOverlaps: number[][] = [];
	public stemOverlapLengths: number[][] = [];
	public slopeDifference: number[][] = [];
	public directOverlaps: boolean[][] = [];
	public symmetry: boolean[][] = [];
	public collisionMatrices = new ColMats();
	public blueZone = new BlueZone();
	public nonBlueTopBottom = new BlueZone();
	public interpolations: Interpolation[] = [];
	public shortAbsorptions: ShortAbsorption[] = [];
}
