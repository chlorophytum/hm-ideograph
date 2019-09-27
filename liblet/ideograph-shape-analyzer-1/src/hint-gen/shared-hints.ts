import { Sequence, WithDirection } from "@chlorophytum/hint-common";
import { EmBoxShared } from "@chlorophytum/hint-embox";

import { HintingStrategy } from "../strategy";

export function createSharedHints(params: HintingStrategy) {
	return new Sequence.Hint([
		WithDirection.Y(
			new EmBoxShared.Hint({
				name: params.groupName,
				strokeBottom: params.UPM * params.EMBOX_BOTTOM_STROKE,
				strokeTop: params.UPM * params.EMBOX_TOP_STROKE,
				archBottom: params.UPM * params.EMBOX_BOTTOM_ARCH,
				archTop: params.UPM * params.EMBOX_TOP_ARCH,
				spurBottom: params.UPM * params.EMBOX_BOTTOM_SPUR,
				spurTop: params.UPM * params.EMBOX_TOP_SPUR
			})
		)
	]);
}
