import { TtLibrary } from "@chlorophytum/hltt";

const Lib = new TtLibrary(`@chlorophytum/hint-programs-stroke-adjust`);

export const AdjustStrokeDistT = Lib.Template(function*($, rate: number) {
	const [d] = $.args(1);
	const One = $.coerce.toF26D6(1);
	yield $.return(
		$.add(
			$.max(One, $.floor(d)),
			$.mul(
				$.sub(d, $.max(One, $.floor(d))),
				$.sub(One, $.div(One, $.max(One, $.mul($.coerce.toF26D6(64 / rate), $.mppem()))))
			)
		)
	);
});

export const VisFloorT = Lib.Template(function*($, ConsideredDark: number) {
	const [x, fillRate] = $.args(2);
	yield $.if(
		$.gteq($.sub(x, $.floor(x)), $.coerce.toF26D6(ConsideredDark)),
		function*() {
			yield $.return($.floor($.add($.coerce.toF26D6(1), $.floor(x))));
		},
		function*() {
			yield $.return($.floor($.floor(x)));
		}
	);
});
export const VisCeilT = Lib.Template(function*($, ConsideredDark: number) {
	const [x, fillRate] = $.args(2);
	yield $.if(
		$.gteq($.sub($.ceiling(x), x), $.coerce.toF26D6(ConsideredDark)),
		function*() {
			yield $.return($.ceiling($.sub($.ceiling(x), $.coerce.toF26D6(1))));
		},
		function*() {
			yield $.return($.ceiling($.ceiling(x)));
		}
	);
});

export const VisDistT = Lib.Template(function*(e, ConsideredDark: number) {
	const [zBot, zTop, frBot, frTop] = e.args(4);
	yield e.return(
		e.sub(
			e.call(VisFloorT(ConsideredDark), e.gc.cur(zTop), frTop),
			e.call(VisCeilT(ConsideredDark), e.gc.cur(zBot), frBot)
		)
	);
});

export const OctDistOrig = Lib.Func(function*(e) {
	const [zBot, zTop] = e.args(2);
	yield e.return(e.sub(e.gc.orig(zTop), e.gc.orig(zBot)));
});
