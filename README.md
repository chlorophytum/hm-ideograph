# HM-Ideograph

This is a hint model plugin for ideographs, supporting all [HlTT](https://github.com/chlorophytum/Chlorophytum/tree/master/liblet/hltt)-based instruction formats.

## How it works

The hint model’s shape analyzer will analyze all the Ideograph and Hangul glyphs in the input font, and generate a series of Y-axis stem hints. The major of these hints are [MAZ](https://github.com/chlorophytum/hm-ideograph/tree/master/liblet/hint-maz), which tries its best to arrange multiple stems *at once* to fit inside a certain space. For each stem gap, a priority can be assigned so when the space is not enough, MAZ hints would try to merge the stems around certain gaps to improve readability.

## Usage

To use this hint model you need to introduce it as a hint pass in the configuration file:

```json
{
	......,
	"hintPasses": [
		{
			"plugin": "@chlorophytum/hm-ideograph",
			"options": { ...... }
		}
	]
}
```

The options include:

- `emboxSystemName`: String. Name of the Em-box system the glyphs follow. Defaults to “Ideograph”.

- `acceptAllGlyphs`: Boolean. Whether apply to all glyphs in the font. When set to `false`, the hinting pass would use a Unicode-based tracking process.

- `unicodeRanges`: Unicode ranges to track. Defaults to

  ```typescript
   [
  	[0x2e80, 0x2fff], // Radicals
  	[0x31c0, 0x31e3], // Strokes
  	[0x3400, 0x4dbf], // ExtA
  	[0x4e00, 0x9fff], // URO
  	[0xf900, 0xfa6f], // Compatibility
  	[0x20000, 0x2ffff], // SIP
  	[0xac00, 0xd7af] // Hangul
  ];
  ```

- `trackScripts`: Scripts to track OpenType variants of Unicode glyphs. Defaults to

  ```json
  ["hani", "hang"]
  ```
  
- `trackFeatures`: Features to track OpenType variants of Unicode glyphs. Defaults to

  ```json
  ["locl", "smpl", "trad", "tnam", "jp78", "jp83", "jp90", "jp04", "hojo", "nlck", "expt"]
  ```

- `EmBox`: Vertical position of the Em-box. Defaults to

  ```json
  {
  	"Bottom": -0.12,
  	"Top": 0.88,
  	"StrokeBottom": -0.06,
  	"StrokeTop": 0.82,
  	"SpurBottom": -0.095,
	"SpurTop": 0.855,
	"SmallSizeExpansionRate": 1
  }
  ```

- Stem identification options:

  - `CANONICAL_STEM_WIDTH`: Canonical width of stems in `em`. Defaults to `0.067`.
  - `MAX_STEM_WDTH_X`: The proportion of the max possible stem width to the canonical stem width. Defaults to `1.5`.
  - `ABSORPTION_LIMIT`: The length limit (in `em`) when a horizontal extremum being linked to a point aligned to the top or bottom blue zone. Useful when preserving diagonal strokes’ width. Preferred value: slightly larger than `CANONICAL_STEM_WIDTH`. Defaults to `0.12`.
  - `STEM_SIDE_MIN_RISE` : The maximum height (in `em`) of decorative shapes placed aside a horizontal stem's upper edge. Defaults to `0.036`.
  - `STEM_SIDE_MIN_DESCENT` : The maximum depth (in `em`) of close decorative shapes placed aside a horizontal stem's lower edge. Defaults to `0.053`.
  - `STEM_CENTER_MIN_RISE` : The maximum height (in `em`) of close decorative shapes placed above a horizontal stem's upper edge. Defaults to `0.036`.
  - `STEM_CENTER_MIN_DESCENT` : The maximum depth (in `em`) of decorative shapes placed below a horizontal stem's lower edge. Defaults to `0.050`.
  - `STEM_SIDE_MIN_DIST_RISE` : The maximum height (in `em`) of distanced decorative shapes placed aside a horizontal stem's upper edge. Defaults to `0.075`.
  - `STEM_SIDE_MIN_DIST_DESCENT` : The maximum depth (in `em`) of distanced decorative shapes placed aside a horizontal stem's lower edge. Defaults to `0.075`.

