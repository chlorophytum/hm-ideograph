import { atGlyphBottom, atGlyphTop } from "../../si-common/stem-spatial";
import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

export default function analyzeSymmetry(
	stems: Stem[],
	directOverlaps: boolean[][],
	strategy: HintingStrategy
) {
	let sym: boolean[][] = [];
	const limit = strategy.UPM / (strategy.SYMMETRY_TEST_PPEM * 2);
	const limitX = strategy.UPM / strategy.SYMMETRY_TEST_PPEM;
	for (let j = 0; j < stems.length; j++) {
		sym[j] = [];
		for (let k = 0; k < j; k++) {
			sym[j][k] =
				!directOverlaps[j][k] &&
				!stems[j].diagHigh &&
				!stems[k].diagHigh &&
				Math.abs(stems[j].y - stems[k].y) < limit &&
				Math.abs(stems[j].y - stems[j].width - stems[k].y + stems[k].width) < limit &&
				Math.abs(stems[j].xMax - stems[j].xMin - (stems[k].xMax - stems[k].xMin)) <
					limitX &&
				(stems[j].hasSameRadicalStemAbove === stems[k].hasSameRadicalStemAbove ||
					stems[j].hasSameRadicalStemBelow === stems[k].hasSameRadicalStemBelow) &&
				(stems[j].hasGlyphStemAbove === stems[k].hasGlyphStemAbove ||
					stems[j].hasGlyphStemBelow === stems[k].hasGlyphStemBelow) &&
				(atGlyphTop(stems[j], strategy) === atGlyphTop(stems[k], strategy) ||
					atGlyphBottom(stems[j], strategy) === atGlyphBottom(stems[k], strategy));
		}
	}
	return sym;
}
