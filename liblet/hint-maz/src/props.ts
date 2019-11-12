export interface MultipleAlignZoneMetaPropShared {
	gapMinDist: number[]; // N+1 args
	inkMinDist: number[]; // N args
	bottomBalanceForbidden?: boolean; // 1 arg
	topBalanceForbidden?: boolean; // 1 arg
}
export interface MultipleAlignZoneMeta extends MultipleAlignZoneMetaPropShared {
	recPath: number[]; // N args
	recPathCollide: number[]; // N args
}

export interface MultipleAlignZoneProps extends MultipleAlignZoneMetaPropShared {
	emBoxName: string;
	bottomPoint: number; // 1 arg
	topPoint: number; // 1 arg
	middleStrokes: [number, number][]; // 2N args
	mergePriority: number[]; // N+1 items. Not an argument!
	allowCollide: boolean[]; // N+1 items. Not an argument!
}

function drop<A>(a: A[], index: number) {
	let a1: A[] = [];
	for (let j = 0; j < a.length; j++) if (j !== index) a1.push(a[j]);
	return a1;
}

function decideMerge(allowMerge: number[], N: number) {
	let mergeIndex = -1;
	let mergePri = 0;
	for (let j = 0; j <= N; j++) {
		const a = allowMerge[j] || 0;
		if (Math.abs(a) > Math.abs(mergePri)) {
			mergeIndex = j;
			mergePri = a;
		}
	}
	let mergeDown = mergePri < 0 ? 1 : 0;
	return { mergeIndex, mergeDown };
}

function getRecPathImpl(a: number[], b: number[], N: number): number[] {
	const ma = decideMerge(a, N);
	const mb = decideMerge(b, N);
	const pri = (1 + mb.mergeIndex) * (mb.mergeDown ? -1 : 1);
	if (ma.mergeIndex < 0) {
		return [];
	} else if (ma.mergeIndex === 0) {
		return [pri, ...getRecPathImpl(drop(a, 0), drop(b, 0), N - 1)];
	} else if (ma.mergeIndex === N) {
		return [pri, ...getRecPathImpl(drop(a, N), drop(b, N), N - 1)];
	} else {
		return [pri, ...getRecPathImpl(drop(a, ma.mergeIndex), drop(b, ma.mergeIndex), N - 1)];
	}
}

export function getRecPath(a: number[], b: number[], N: number) {
	let path = getRecPathImpl(a, b, N);
	while (path.length < N) path.push(0);
	path.length = N;
	return path;
}
