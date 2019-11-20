import { IHintingModelExecEnv, ITask } from "@chlorophytum/arch";
import { IHintGen } from "@chlorophytum/ideograph-shape-analyzer-shared";

export class SharedHintTask<S, G, A> implements ITask<void> {
	constructor(
		private readonly codeGen: IHintGen<S, G, A>,
		private readonly params: S,
		private readonly ee: IHintingModelExecEnv
	) {}

	public async execute() {
		await this.ee.modelLocalHintStore.setSharedHints(
			this.ee.passUniqueID,
			this.codeGen.generateSharedHints(this.params)
		);
	}
}
