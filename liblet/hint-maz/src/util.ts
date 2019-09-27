export function splitNArgs<A>(a: A[], qty: number[]) {
	let ans: A[][] = [],
		start = 0;
	for (let q of qty) {
		ans.push(a.slice(start, start + q));
		start += q;
	}
	if (a.length < start) throw new Error("Insufficient items");
	return ans;
}
