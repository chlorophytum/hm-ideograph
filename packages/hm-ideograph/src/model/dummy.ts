import { IArbitratorProxy, ITask } from "@chlorophytum/arch";

export class DummyTask implements ITask<void> {
	constructor() {}
	public async execute(arb: IArbitratorProxy) {}
}
