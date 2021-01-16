export function splitNArgs<A>(a: A[], qty: number[]) {
	const ans: A[][] = [];
	let start = 0;
	for (const q of qty) {
		ans.push(a.slice(start, start + q));
		start += q;
	}
	if (a.length < start) throw new Error("Insufficient items");
	return ans;
}
