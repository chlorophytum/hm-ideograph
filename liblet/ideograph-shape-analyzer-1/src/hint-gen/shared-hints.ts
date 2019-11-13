import { Sequence, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxShared } from "@chlorophytum/hint-embox";

import { HintingStrategy } from "../strategy";

export function createSharedHints(params: HintingStrategy) {
	return new Sequence.Hint([
		WithDirection.Y(
			new EmBoxShared.Hint({
				name: params.emboxSystemName,
				strokeBottom: params.UPM * params.EmBox.StrokeBottom,
				strokeTop: params.UPM * params.EmBox.StrokeTop,
				spurBottom: params.UPM * params.EmBox.SpurBottom,
				spurTop: params.UPM * params.EmBox.SpurTop
			})
		)
	]);
}
