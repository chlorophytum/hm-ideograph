import { IHintingModelExecEnv, ITask } from "@chlorophytum/arch";
import { IdeographHintingParams, IHintGen } from "@chlorophytum/ideograph-shape-analyzer-shared";

import { HintModelPrefix } from "./constants";

export class SharedHintTask<S extends IdeographHintingParams, G, A> implements ITask<void> {
	constructor(
		private readonly codeGen: IHintGen<S, G, A>,
		private readonly params: S,
		private readonly ee: IHintingModelExecEnv
	) {}

	public async execute() {
		await this.ee.hintStore.setSharedHints(
			`${HintModelPrefix}::SharedHint{${this.params.groupName || ""}}`,
			this.codeGen.generateSharedHints(this.params)
		);
	}
}
