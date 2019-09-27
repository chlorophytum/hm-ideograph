import { IHintingModelExecEnv, ITask } from "@chlorophytum/arch";

import { createSharedHints } from "../hint-gen/shared-hints";
import { HintingStrategy } from "../strategy";

export class SharedHintTask implements ITask<void> {
	constructor(
		private readonly params: HintingStrategy,
		private readonly ee: IHintingModelExecEnv
	) {}

	public async execute() {
		await this.ee.modelLocalHintStore.setSharedHints(
			this.ee.passUniqueID,
			createSharedHints(this.params)
		);
	}
}
