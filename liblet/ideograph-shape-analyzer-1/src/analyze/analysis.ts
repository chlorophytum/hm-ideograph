import { AdjPoint } from "@chlorophytum/ideograph-shape-analyzer-shared";

import Radical from "../types/radical";
import Stem from "../types/stem";

export class Interpolation {
	constructor(
		public rp1: AdjPoint,
		public rp2: AdjPoint,
		public z: AdjPoint,
		public priority: number
	) {}
}
export class ShortAbsorption {
	constructor(public rp0: AdjPoint, public z: AdjPoint, public priority: number) {}
}

export class BlueZone {
	public topZs: AdjPoint[] = [];
	public bottomZs: AdjPoint[] = [];
}

export class ColMats {
	public annexation: number[][] = [];
	public darkness: number[][] = [];
	public flips: number[][] = [];
	public proximity: number[][] = [];
	public spatialProximity: number[][] = [];
}

export class GlyphAnalysis {
	public radicals: Radical[] = [];
	public stems: Stem[] = [];
	public stemOverlaps: number[][] = [];
	public stemOverlapLengths: number[][] = [];
	public directOverlaps: boolean[][] = [];
	public symmetry: boolean[][] = [];
	public collisionMatrices = new ColMats();
	public blueZone = new BlueZone();
	public nonBlueTopBottom = new BlueZone();
	public interpolations: Interpolation[] = [];
	public shortAbsorptions: ShortAbsorption[] = [];
}
