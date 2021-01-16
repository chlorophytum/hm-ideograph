export class DisjointSet {
	private readonly store: number[] = [];
	constructor(readonly size: number) {
		for (let j = 0; j < size; j++) this.store[j] = j;
	}

	public find(x: number) {
		let root = x;
		while (root != this.store[root]) root = this.store[root];
		while (this.store[x] !== root) {
			const parent = this.store[x];
			this.store[x] = root;
			x = parent;
		}
		return root;
	}

	public *sameSet(x: number) {
		const root = this.find(x);
		for (let t = 0; t < this.size; t++) if (this.find(t) === root) yield t;
	}

	public union(j: number, k: number) {
		this.store[j] = k;
	}
}
