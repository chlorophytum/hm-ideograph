import {
	IFontSource,
	IHintingModel,
	IHintingModelExecEnv,
	IHintingModelPlugin
} from "@chlorophytum/arch";
import { IdeographHintGenerator1 } from "@chlorophytum/ideograph-hint-generator-1";
import { IdeographShapeAnalyzer1 } from "@chlorophytum/ideograph-shape-analyzer-1";
import { IdeographHintingParams } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { IdeographHintingTask } from "../model";
import {
	GlyphHintParallelArgRep,
	ParallelGlyphHintTask,
	ParallelTaskType
} from "../model/glyph-hint";

export class IdeographHintingModel1<GID> implements IHintingModel {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ptParams: Partial<IdeographHintingParams>
	) {}
	public readonly type = "Chlorophytum::IdeographHintingModel1";
	public readonly allowParallel = false;

	public getHintingTask(ee: IHintingModelExecEnv) {
		return new IdeographHintingTask(
			this.font,
			IdeographShapeAnalyzer1,
			IdeographHintGenerator1,
			this.ptParams,
			ee
		);
	}
}

class CIdeographHintingModelFactory1 implements IHintingModelPlugin {
	public readonly type = "Chlorophytum::IdeographHintingModel1";
	public adopt<GID>(font: IFontSource<GID>, parameters: any) {
		return new IdeographHintingModel1<GID>(font, parameters);
	}
	public readonly factoriesOfUsedHints = IdeographHintGenerator1.factoriesOfUsedHints;
	public createParallelTask(type: string, _rep: any) {
		if (type === ParallelTaskType) {
			const rep = _rep as GlyphHintParallelArgRep<IdeographHintingParams>;
			return new ParallelGlyphHintTask(
				rep.fmd,
				IdeographShapeAnalyzer1,
				IdeographHintGenerator1,
				rep.params,
				rep.glyphRep
			);
		}
		return null;
	}
}

const IdeographHintingModelFactory1: IHintingModelPlugin = new CIdeographHintingModelFactory1();

export default IdeographHintingModelFactory1;
