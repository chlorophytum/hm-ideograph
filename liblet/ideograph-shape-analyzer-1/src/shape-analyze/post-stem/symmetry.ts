import { atGlyphBottom, atGlyphTop } from "../../si-common/stem-spatial";
import { HintingStrategy } from "../../strategy";
import Stem from "../../types/stem";

export default function analyzeSymmetry(
	stems: Stem[],
	directOverlaps: boolean[][],
	strategy: HintingStrategy
) {
	let sym: boolean[][] = [];
	const limitX = strategy.UPM / strategy.SYMMETRY_TEST_PPEM;
	const limitY = strategy.UPM / (strategy.SYMMETRY_TEST_PPEM * 2);
	for (let j = 0; j < stems.length; j++) {
		sym[j] = [];
		for (let k = 0; k < j; k++) {
			const yTopDiff = Math.abs(stems[j].y - stems[k].y);
			const yBotDiff = Math.abs(stems[j].y - stems[j].width - stems[k].y + stems[k].width);
			const lengthDiff = Math.abs(
				stems[j].xMaxExP - stems[j].xMinExP - (stems[k].xMaxExP - stems[k].xMinExP)
			);

			const topologicalSimilar =
				!directOverlaps[j][k] && !stems[j].diagHigh && !stems[k].diagHigh;
			const positionalSimilar =
				yTopDiff < limitY &&
				yBotDiff < limitY &&
				Math.max(limitY / 4, yTopDiff, yBotDiff) * lengthDiff < limitY * limitX;
			const spatialRelationshipSimilar =
				(stems[j].hasSameRadicalStemAbove === stems[k].hasSameRadicalStemAbove ||
					stems[j].hasSameRadicalStemBelow === stems[k].hasSameRadicalStemBelow) &&
				(stems[j].hasGlyphStemAbove === stems[k].hasGlyphStemAbove ||
					stems[j].hasGlyphStemBelow === stems[k].hasGlyphStemBelow) &&
				(atGlyphTop(stems[j], strategy) === atGlyphTop(stems[k], strategy) ||
					atGlyphBottom(stems[j], strategy) === atGlyphBottom(stems[k], strategy));

			sym[j][k] = topologicalSimilar && positionalSimilar && spatialRelationshipSimilar;
		}
	}
	return sym;
}
