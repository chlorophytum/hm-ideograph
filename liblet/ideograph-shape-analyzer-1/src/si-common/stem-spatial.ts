import { HintingStrategy } from "../strategy";
import Stem from "../types/stem";

export function atRadicalBottom(s: Stem, strategy: HintingStrategy) {
	return (
		!s.hasSameRadicalStemBelow &&
		!(
			s.hasRadicalPointBelow &&
			s.radicalCenterDescent > strategy.STEM_CENTER_MIN_DESCENT * strategy.UPM
		) &&
		!(
			s.hasRadicalLeftAdjacentPointBelow &&
			s.radicalLeftAdjacentDescent > strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM
		) &&
		!(
			s.hasRadicalRightAdjacentPointBelow &&
			s.radicalRightAdjacentDescent > strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM
		)
	);
}

export function atGlyphBottom(stem: Stem, strategy: HintingStrategy) {
	return (
		atRadicalBottom(stem, strategy) &&
		!stem.hasGlyphStemBelow &&
		!(
			stem.hasGlyphPointBelow &&
			stem.glyphCenterDescent > strategy.STEM_CENTER_MIN_DESCENT * strategy.UPM
		) &&
		!(
			stem.hasGlyphLeftAdjacentPointBelow &&
			stem.glyphLeftAdjacentDescent > strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM
		) &&
		!(
			stem.hasGlyphRightAdjacentPointBelow &&
			stem.glyphRightAdjacentDescent > strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM
		)
	);
}

export function atRadicalBottomMost(stem: Stem, strategy: HintingStrategy) {
	return (
		atRadicalBottom(stem, strategy) &&
		!(
			stem.hasRadicalLeftDistancedPointBelow &&
			stem.radicalLeftDistancedDescent > strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM
		) &&
		!(
			stem.hasRadicalRightDistancedPointBelow &&
			stem.radicalRightDistancedDescent > strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM
		)
	);
}
export function isHangingHookShape(stem: Stem, strategy: HintingStrategy) {
	return (
		stem.xMaxExP - stem.xMinExP < strategy.UPM / 4 &&
		((stem.hasRadicalLeftDistancedPointBelow &&
			stem.radicalLeftDistancedDescent > strategy.CANONICAL_STEM_WIDTH * strategy.UPM) ||
			(stem.hasRadicalRightDistancedPointBelow &&
				stem.radicalRightDistancedDescent > strategy.CANONICAL_STEM_WIDTH * strategy.UPM))
	);
}
export function isCapShape(stem: Stem, strategy: HintingStrategy) {
	return (
		atRadicalBottom(stem, strategy) &&
		((stem.hasRadicalLeftDistancedPointBelow &&
			stem.radicalLeftDistancedDescent >
				strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM) ||
			(stem.hasRadicalRightDistancedPointBelow &&
				stem.radicalRightDistancedDescent >
					strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM))
	);
}
export function atGlyphBottomMost(stem: Stem, strategy: HintingStrategy) {
	return (
		atGlyphBottom(stem, strategy) &&
		!(
			stem.hasGlyphLeftDistancedPointBelow &&
			stem.glyphLeftDistancedDescent > strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM
		) &&
		!(
			stem.hasGlyphRightDistancedPointBelow &&
			stem.glyphRightDistancedDescent > strategy.STEM_SIDE_MIN_DIST_DESCENT * strategy.UPM
		) &&
		!(
			stem.hasRadicalLeftAdjacentPointBelow &&
			stem.radicalLeftAdjacentDescent > (strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM) / 3
		) &&
		!(
			stem.hasRadicalRightAdjacentPointBelow &&
			stem.radicalRightAdjacentDescent > (strategy.STEM_SIDE_MIN_DESCENT * strategy.UPM) / 3
		)
	);
}

export function atStrictRadicalBottom(stem: Stem, strategy: HintingStrategy) {
	return (
		atRadicalBottom(stem, strategy) &&
		!stem.hasRadicalLeftAdjacentPointBelow &&
		!stem.hasRadicalRightAdjacentPointBelow &&
		!stem.hasRadicalLeftDistancedPointBelow &&
		!stem.hasRadicalRightDistancedPointBelow
	);
}

export function atRadicalTop(stem: Stem, strategy: HintingStrategy) {
	return (
		!stem.hasSameRadicalStemAbove &&
		!(
			stem.hasRadicalPointAbove &&
			stem.radicalCenterRise > strategy.STEM_CENTER_MIN_RISE * strategy.UPM
		) &&
		!(
			stem.hasRadicalLeftAdjacentPointAbove &&
			stem.radicalLeftAdjacentRise > strategy.STEM_SIDE_MIN_RISE * strategy.UPM
		) &&
		!(
			stem.hasRadicalRightAdjacentPointAbove &&
			stem.radicalRightAdjacentRise > strategy.STEM_SIDE_MIN_RISE * strategy.UPM
		) &&
		!(
			stem.hasRadicalLeftDistancedPointAbove &&
			stem.radicalLeftDistancedRise > strategy.STEM_SIDE_MIN_DIST_RISE * strategy.UPM
		) &&
		!(
			stem.hasRadicalRightDistancedPointAbove &&
			stem.radicalRightDistancedRise > strategy.STEM_SIDE_MIN_DIST_RISE * strategy.UPM
		)
	);
}

export function atGlyphTop(stem: Stem, strategy: HintingStrategy) {
	return (
		atRadicalTop(stem, strategy) &&
		!stem.hasGlyphStemAbove &&
		!(
			stem.hasGlyphPointAbove &&
			stem.glyphCenterRise > strategy.STEM_CENTER_MIN_RISE * strategy.UPM
		) &&
		!(
			stem.hasGlyphLeftAdjacentPointAbove &&
			stem.glyphLeftAdjacentRise > strategy.STEM_SIDE_MIN_RISE * strategy.UPM
		) &&
		!(
			stem.hasGlyphRightAdjacentPointAbove &&
			stem.glyphRightAdjacentRise > strategy.STEM_SIDE_MIN_RISE * strategy.UPM
		)
	);
}
