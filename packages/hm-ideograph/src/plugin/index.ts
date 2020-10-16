import {
	IFontSource,
	IHintingModel,
	IHintingModelExecEnv,
	IHintingModelPreEnv,
	IHintingPass,
	Plugins
} from "@chlorophytum/arch";
import { IdeographHintGenerator1 } from "@chlorophytum/ideograph-hint-generator-1";
import { IdeographShapeAnalyzer1 } from "@chlorophytum/ideograph-shape-analyzer-1";
import { IdeographHintingParams } from "@chlorophytum/ideograph-shape-analyzer-shared";
import { IdeographHintingTask } from "../model";
import { HintModelPrefix, ParallelTaskType } from "../model/constants";
import { DummyTask } from "../model/dummy";
import { GlyphHintParallelArgRep, ParallelGlyphHintTask } from "../model/glyph-hint";

export class IdeographHintingModel1<GID> implements IHintingModel {
	constructor(
		private readonly font: IFontSource<GID>,
		private readonly ptParams: Partial<IdeographHintingParams>
	) {}
	public readonly type = HintModelPrefix;
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
	public getPreTask(ee: IHintingModelPreEnv) {
		return new DummyTask();
	}
}

export class CIdeographHintingPass1 implements IHintingPass {
	constructor(private readonly parameters: Partial<IdeographHintingParams>) {}
	public readonly requirePreHintRounds = 0; // No pre-analysis is needed
	public adopt<GID>(font: IFontSource<GID>) {
		return new IdeographHintingModel1<GID>(font, this.parameters);
	}
	public readonly factoriesOfUsedHints = IdeographHintGenerator1.factoriesOfUsedHints;
	public createParallelTask(type: string, _rep: any) {
		if (type === ParallelTaskType) {
			const rep = _rep as GlyphHintParallelArgRep<IdeographHintingParams>;
			return new ParallelGlyphHintTask(
				rep.gn,
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

export class CIdeographHintingPlugin1 implements Plugins.IHintingModelPlugin {
	public async load(loader: Plugins.IAsyncModuleLoader, parameters: any) {
		return new CIdeographHintingPass1(parameters);
	}
}

const IdeographHintingModelFactory1: Plugins.IHintingModelPlugin = new CIdeographHintingPlugin1();

export default IdeographHintingModelFactory1;
