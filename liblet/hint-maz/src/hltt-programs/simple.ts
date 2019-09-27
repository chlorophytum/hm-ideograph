import { Lib } from "./commons";

const IP2Sh = Lib.Func(function*(e) {
	const [zBot, zTop, zA, zB, sh] = e.args(5);
	yield e.ip(zBot, zTop, zA, zB);
	const y1 = e.local(),
		y2 = e.local(),
		yM = e.local();
	yield e.set(y1, e.gc.cur(zA));
	yield e.set(y2, e.gc.cur(zB));
	yield e.set(yM, e.div(e.add(y1, y2), e.coerce.toF26D6(2)));
	yield e.scfs(zA, e.add(yM, e.mul(sh, e.sub(y1, yM))));
	yield e.scfs(zB, e.add(yM, e.mul(sh, e.sub(y2, yM))));
});

// This function is used at very small PPEM -- We can do almost nothing, just IP
export const HintMultipleStrokesGiveUp = Lib.Func(function*(e) {
	const [N, zBot, zTop, vpZMids] = e.args(4);
	const pZMids = e.coerce.fromIndex.variable(vpZMids);
	yield e.mdap(zBot);
	yield e.mdap(zTop);
	const j = e.local();
	yield e.set(j, 0);
	yield e.while(e.lt(j, N), function*() {
		yield e.call(
			IP2Sh,
			zBot,
			zTop,
			e.part(pZMids, e.mul(e.coerce.toF26D6(2), j)),
			e.part(pZMids, e.add(1, e.mul(e.coerce.toF26D6(2), j))),
			e.min(e.coerce.toF26D6(1), e.mul(e.coerce.toF26D6(4), e.mppem()))
		);
		yield e.set(j, e.add(1, j));
	});
});

// This function is used at very large PPEM -- whether to round is no longer important, just IP
export const HintMultipleStrokesSimple = Lib.Func(function*(e) {
	const [N, zBot, zTop, vpZMids] = e.args(4);
	const pZMids = e.coerce.fromIndex.variable(vpZMids);
	yield e.mdap(zBot);
	yield e.mdap(zTop);

	const j = e.local();
	yield e.set(j, 0);
	yield e.while(e.lt(j, N), function*() {
		yield e.ip(
			zBot,
			zTop,
			e.part(pZMids, e.mul(e.coerce.toF26D6(2), j)),
			e.part(pZMids, e.add(1, e.mul(e.coerce.toF26D6(2), j)))
		);

		yield e.set(j, e.add(1, j));
	});
});
