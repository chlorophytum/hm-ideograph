import { IFontSource, IHintingModelPlugin } from "@chlorophytum/arch";
import { Interpolate, LinkChain, Sequence, Smooth, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxEdge, EmBoxShared, EmBoxStroke, UseEmBox } from "@chlorophytum/hint-embox";
import { MultipleAlignZone } from "@chlorophytum/hint-maz";

import { IdeographHintingModel1 } from "./hinting-model";
import {
	GlyphHintParallelArgRep,
	ParallelGlyphHintTask,
	ParallelTaskType
} from "./hinting-model/glyph-hint";

class CIdeographHintingModelFactory1 implements IHintingModelPlugin {
	public readonly type = "Chlorophytum::IdeographHintingModel1";
	public adopt<GID>(font: IFontSource<GID>, parameters: any) {
		return new IdeographHintingModel1<GID>(font, parameters);
	}
	public readonly factoriesOfUsedHints = [
		new Sequence.Factory(),
		new WithDirection.HintFactory(),
		new MultipleAlignZone.HintFactory(),
		new LinkChain.HintFactory(),
		new Interpolate.HintFactory(),
		new EmBoxStroke.HintFactory(),
		new EmBoxEdge.HintFactory(),
		new UseEmBox.HintFactory(),
		new EmBoxShared.HintFactory(),
		new Smooth.HintFactory()
	];
	public createParallelTask(type: string, _rep: any) {
		if (type === ParallelTaskType) {
			const rep = _rep as GlyphHintParallelArgRep;
			return new ParallelGlyphHintTask(rep.fmd, rep.params, rep.glyphRep);
		}
		return null;
	}
}

const IdeographHintingModelFactory1: IHintingModelPlugin = new CIdeographHintingModelFactory1();

export default IdeographHintingModelFactory1;
