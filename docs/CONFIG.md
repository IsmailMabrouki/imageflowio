# ImageFlowIO Configuration (`config.json`)

The `config.json` file is the central control panel for ImageFlowIO. It declaratively defines the entire image-to-image inference pipeline—from model loading and runtime settings to preprocessing, tiling, postprocessing, and output saving—so developers can configure behavior without writing procedural code.

Typical workflow:

1. Obtain a pretrained model
2. Write or modify `config.json`
3. Run your program using this configuration

---

## Example `config.json`

This example demonstrates the full flexibility of the configuration for image-to-image models (all switches and sections shown for completeness).

```json
{
  "$schema": "./config.schema.json",
  "model": {
    "name": "unet",
    "path": "./assets/models/unet.onnx"
  },
  "execution": {
    "backend": "auto",
    "threads": { "apply": true, "count": "auto" },
    "warmupRuns": 2,
    "useCaching": true
  },
  "input": {
    "type": "image",
    "source": "./images/sample.png",
    "batchSize": 1
  },
  "preprocessing": {
    "resize": {
      "apply": true,
      "imageSize": [512, 512],
      "keepAspectRatio": true,
      "resizeMode": "fit"
    },
    "centerCrop": { "apply": false, "size": [512, 512] },
    "normalize": {
      "apply": true,
      "mean": [0.5, 0.5, 0.5],
      "std": [0.5, 0.5, 0.5]
    },
    "format": { "dataType": "float32", "channels": 3, "channelOrder": "rgb" },
    "grayscale": { "apply": false }
  },
  "inference": {
    "batchSize": 1,
    "tiling": {
      "apply": false,
      "tileSize": [256, 256],
      "overlap": 32,
      "padMode": "reflect",
      "blend": "feather"
    }
  },
  "postprocessing": {
    "activation": { "apply": false, "type": "sigmoid" },
    "clamp": { "apply": true, "min": 0, "max": 1 },
    "denormalize": { "apply": true, "scale": 255, "dtype": "uint8" },
    "resizeTo": "input",
    "colorMap": { "apply": false, "mode": "viridis", "channel": 0 },
    "toneMap": {
      "apply": false,
      "method": "aces",
      "exposure": 0.0,
      "gamma": 2.2
    },
    "paletteMap": {
      "apply": false,
      "source": "argmax",
      "channel": 0,
      "palette": { "mode": "preset", "preset": "pascal_voc" },
      "outline": { "apply": false, "color": [255, 0, 0], "thickness": 1 }
    },
    "blendOverlay": { "apply": false, "alpha": 0.5 }
  },
  "output": {
    "save": {
      "apply": true,
      "path": "./outputs",
      "format": "tiff",
      "bitDepth": 16,
      "colorSpace": "linear",
      "linearToSRGB": false,
      "splitChannels": false,
      "channelNames": ["C0", "C1", "C2"],
      "filename": "{model}_{timestamp}.tiff",
      "quality": 95
    },
    "saveRaw": { "apply": true, "format": "npy", "path": "./outputs/raw" },
    "writeMeta": { "apply": true, "jsonPath": "./outputs/meta.json" }
  },
  "custom": {
    "preprocessingFn": "path/to/preprocess.js",
    "postprocessingFn": "path/to/postprocess.js"
  },
  "logging": {
    "level": "info",
    "saveLogs": true,
    "logPath": "./logs/inference.log"
  },
  "visualization": {
    "apply": true,
    "type": "sideBySide",
    "outputPath": "./outputs"
  }
}
```

---

## Configuration Breakdown

### model

- **name**: string — Human-readable identifier for the model (e.g., `"unet"`).
- **path**: string — Local or remote path/URL to the model artifact (e.g., ONNX/TFJS).

### execution

- **backend**: "auto" | "cpu" | "gpu" — Execution backend selection. `"auto"` chooses the best available.
- **threads**: Object — CPU threading controls.
  - **apply**: boolean — Enable or disable multithreading.
  - **count**: number | "auto" — Thread count; `"auto"` uses available cores.
- **warmupRuns**: number — Number of warmup inferences before timed runs (stabilizes performance).
- **useCaching**: boolean — Cache preprocessed inputs to accelerate repeated inferences.

### input

- **type**: "image" — Current supported input type.
- **source**: string — Path/URL/identifier for the image input.
- **batchSize**: number — Number of images to process per batch.

### preprocessing

All steps are optional and controlled via `apply` where applicable.

- **resize**:
  - **apply**: boolean — Enable resizing.
  - **imageSize**: [width: number, height: number] — Target spatial size.
  - **keepAspectRatio**: boolean — Maintain aspect ratio and pad as needed.
  - **resizeMode**: "fit" | "fill" | "crop" — Strategy when preserving aspect ratio.
- **centerCrop**:
  - **apply**: boolean — Enable center crop.
  - **size**: [width: number, height: number] — Crop size.
- **normalize**:
  - **apply**: boolean — Enable normalization.
  - **mean**: [number, number, number] — Per-channel mean.
  - **std**: [number, number, number] — Per-channel standard deviation.
- **format**:
  - **dataType**: "float32" | "float16" | "int8" | "uint8" — Input tensor value type.
  - **channels**: number — Number of channels (e.g., 3 for RGB, 1 for grayscale).
  - **channelOrder**: "rgb" | "bgr" — Channel ordering.
- **grayscale**:
  - **apply**: boolean — Convert to grayscale.
- **augmentations**:
  - **apply**: boolean — Enable augmentations (for training-like scenarios).
  - **methods**: string[] — E.g., `"flip"`, `"rotate"`, `"colorJitter"`.
  - **params**: object — Method-specific parameters (e.g., `{ rotate: { maxDegrees: 15 } }`).

### inference

- **batchSize**: number — Number of tiles/images to process per batch.
- **tiling**:
  - **apply**: boolean — Enable tiled inference for large images.
  - **tileSize**: [width: number, height: number] — Tile dimensions.
  - **overlap**: number — Overlap (in pixels) between tiles to avoid seams.
  - **padMode**: "reflect" | "edge" | "zero" — How to pad edges.
  - **blend**: "feather" | "average" | "max" — Tile blending strategy.

Notes:

- The current implementation performs simple averaging in overlap regions. This removes seams for identity-like models and many smooth outputs.
- Padding modes and advanced blending are reserved for future versions; out-of-bounds areas are clipped to image bounds.
- Tiling respects preprocessing normalization settings per tile and uses `postprocessing.denormalize.scale` for scaling float outputs back to `uint8`.

### postprocessing

- **activation**:
  - **apply**: boolean — Apply output activation.
  - **type**: "sigmoid" | "tanh" | "none" — Activation to apply.
- **clamp**:
  - **apply**: boolean — Clamp output range.
  - **min**: number — Minimum value after clamping.
  - **max**: number — Maximum value after clamping.
- **denormalize**:
  - **apply**: boolean — Convert normalized output to displayable range.
  - **scale**: number — Multiply by this factor (e.g., 255 for `uint8`).
  - **dtype**: "uint8" | "float32" — Output pixel data type.
- **resizeTo**: "input" | [width: number, height: number] | "none" — Resize output back to input size or a fixed size.
- **colorMap**:
  - **apply**: boolean — Map single-channel outputs to colors for visualization.
  - **mode**: "grayscale" | "magma" | "viridis" | "plasma" — Colormap to use.
  - **channel**: number — Channel index to visualize.
- **toneMap**:
  - **apply**: boolean — Apply tone mapping for HDR/linear outputs.
  - **method**: "aces" | "reinhard" | "filmic" — Tone mapping operator.
  - **exposure**: number — Exposure compensation in EV.
  - **gamma**: number — Gamma correction to apply after tone mapping.
- **blendOverlay**:
  - **apply**: boolean — Alpha-blend output over the input image (useful for masks/heatmaps).
  - **alpha**: number — Blend strength in [0,1].
- **paletteMap**:
  - **apply**: boolean — Convert class/mask outputs to RGB using a palette.
  - **source**: "argmax" | "channel" — Whether to argmax across channels or use a specific channel.
  - **channel**: number — Channel index used when `source` is `"channel"`.
  - **palette**:
    - **mode**: "preset" | "file" | "inline" — Palette source.
    - **preset**: string — Named palette (e.g., `"pascal_voc"`, `"cityscapes"`).
    - **file**: string — Path to JSON palette definition.
    - **inline**: Array<[r, g, b]> — Inline palette values.
  - **outline**:
    - **apply**: boolean — Draw boundaries of regions.
    - **color**: [r, g, b] — Outline RGB color.
    - **thickness**: number — Outline thickness in pixels.

### output

- **save**:
  - **apply**: boolean — Enable saving the output image.
  - **path**: string — Directory to write files to.
  - **format**: "png" | "jpeg" | "webp" | "tiff" — File format.
  - **bitDepth**: 8 | 16 | 32 — Bit depth for output where supported (e.g., TIFF/PNG).
  - **colorSpace**: "srgb" | "linear" — Output color space metadata.
  - **linearToSRGB**: boolean — Convert linear output to sRGB (gamma 2.4, sRGB companding) before save.
  - **splitChannels**: boolean — Save each channel to a separate file in addition to the combined image.
  - **channelNames**: string[] — Names to use when splitting channels (defaults to `C0`, `C1`, ...).
  - **filename**: string — Pattern supporting tokens like `{model}`, `{timestamp}`, `{index}`.
  - **quality**: number — Quality for lossy formats.
- **writeMeta**:
  - **apply**: boolean — Persist run metadata (timings, config snapshot).
  - **jsonPath**: string — Destination path for metadata JSON.
- **saveRaw**:
  - **apply**: boolean — Persist raw tensor output.
  - **format**: "npy" | "bin" — Raw tensor file format (NPZ planned).
  - **dtype**: "uint8" | "float32" — Data type when writing NPY (BIN is always raw bytes of the saved image).
  - **path**: string — Directory to store raw outputs.

### custom

- **preprocessingFn**: string — Path to a JS module exporting a custom preprocessing function.
- **postprocessingFn**: string — Path to a JS module exporting a custom postprocessing function.

### logging

- **level**: "debug" | "info" | "error" — Log verbosity.
- **saveLogs**: boolean — Persist logs to disk.
- **logPath**: string — Destination path for log file when `saveLogs` is true.

### visualization

- **apply**: boolean — Enable visualization output artifacts.
- **type**: "sideBySide" | "overlay" | "heatmap" | "difference" — Visualization mode (sideBySide and difference implemented).
- **outputPath**: string — Directory to write visualization outputs.

---

## Notes and Conventions

- All `apply` toggles default to `false` unless explicitly set.
- Where a numeric value or `"auto"` is accepted, `"auto"` defers to environment/implementation defaults.
- Channel order and data type must match the model’s training configuration for correct results.
- Outputs are typically normalized to [0,1]; use `denormalize` to convert to `uint8` images when saving.
- This spec currently targets image inputs and image outputs; additional input/output types can be added in future revisions.
