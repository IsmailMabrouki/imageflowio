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
  "$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
  "model": {
    "name": "unet",
    "path": "./assets/models/unet.onnx"
  },
  "execution": {
    "backend": "auto",
    "threads": { "apply": true, "count": "auto" },
    "warmupRuns": 2,
    "useCaching": "disk",
    "cacheDir": ".imageflowio-cache"
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
      "format": "png",
      "bitDepth": 16,
      "colorSpace": "linear",
      "linearToSRGB": false,
      "splitChannels": false,
      "channelNames": ["C0", "C1", "C2"],
      "filename": "{model}_{timestamp}.png",
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
- **layout**: "nhwc" | "nchw" — Optional model tensor layout hint (currently informational).
- **inputName**: string — Optional backend-specific input tensor name (ONNX/TFJS).
- **outputName**: string — Optional backend-specific output tensor name (ONNX/TFJS).

### execution

- **backend**: "auto" | "onnx" | "noop" | "tfjs" — Execution backend selection. `"auto"` chooses based on model path or defaults.
- **threads**: Object — CPU threading controls.
  - **apply**: boolean — Enable or disable multithreading.
  - **count**: number | "auto" — Thread count; `"auto"` uses available cores.
- **warmupRuns**: number — Number of warmup inferences before timed runs (stabilizes performance).
- **useCaching**: boolean | "memory" | "disk" — Cache preprocessed inputs to accelerate repeated inferences. When set to "disk", preprocessed tiles are stored under `cacheDir`.
- **cacheDir**: string — Directory to store disk cache when `useCaching: "disk"` (default: `.imageflowio-cache`).

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

- Overlaps support multiple blend modes:
  - `average` (default): uniform averaging across overlaps
  - `feather`: distance-weighted averaging to reduce seams further
  - `max`: per-pixel maximum across overlapping tiles
- Partial tiles at image edges can be padded to full tile size using `padMode`:
  - `reflect` (mirror), `edge` (copy), or `zero` (black)
- Tiling respects preprocessing settings per tile and uses `postprocessing.denormalize.scale` for converting backend float outputs back to displayable `uint8`.

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

The output section controls how results are saved. Different model types use different output strategies:

**For Image-to-Image Models (segmentation, style transfer):**

- **save**: Save processed images (PNG, JPEG, WebP, TIFF)

**For Classification/Detection Models:**

- **saveRaw**: Save raw prediction tensors (NPY, NPZ, BIN)
- **writeMeta**: Save metadata and predictions (JSON)

**For All Models:**

- **writeMeta**: Save run metadata (timings, config snapshot)

#### save

- **apply**: boolean — Enable saving the output image.
- **path**: string — Directory to write files to.
- **format**: "png" | "jpeg" | "webp" | "tiff" — File format.
- **bitDepth**: 1 | 2 | 4 | 8 | 16 — Bit depth for output where supported (PNG: 8/16, TIFF: 1/2/4/8; 16 for PNG only in current pipeline).
- **colorSpace**: "srgb" | "linear" — Output color space metadata.
- **linearToSRGB**: boolean — Convert linear output to sRGB (gamma 2.4, sRGB companding) before save.
- **splitChannels**: boolean — Save each channel to a separate file in addition to the combined image.
- **channelNames**: string[] — Names to use when splitting channels (defaults to `C0`, `C1`, ...).
- **filename**: string — Pattern supporting tokens like `{model}`, `{timestamp}`, `{index}`.
- **quality**: number — Quality for lossy formats.

#### saveRaw

- **apply**: boolean — Persist raw tensor output (useful for classification/detection models).
- **format**: "npy" | "npz" | "bin" — Raw tensor file format.
  - **npy**: NumPy array format (single tensor)
  - **npz**: Compressed NumPy format (multiple tensors)
  - **bin**: Raw binary bytes
- **dtype**: "uint8" | "float32" — Data type when writing NPY (BIN is always raw bytes).
- **path**: string — Directory to store raw outputs.

#### writeMeta

- **apply**: boolean — Persist run metadata (timings, config snapshot, predictions).
- **jsonPath**: string — Destination path for metadata JSON.

### custom

- **preprocessingFn**: string — Path to a JS module exporting a custom preprocessing function.
- **postprocessingFn**: string — Path to a JS module exporting a custom postprocessing function.

### logging

- **level**: "debug" | "info" | "error" — Log verbosity (debug: all; info: phase done + totals; error: totals only).
- **saveLogs**: boolean — Persist logs to disk.
- **logPath**: string — Destination path for log file when `saveLogs` is true.

### visualization

- **apply**: boolean — Enable visualization output artifacts.
- **type**: "sideBySide" | "overlay" | "heatmap" | "difference" — Visualization mode (all listed implemented).
- **outputPath**: string — Directory to write visualization outputs.
- **alpha**: number — Overlay transparency for `overlay` mode in [0,1].

---

## Notes and Conventions

- All `apply` toggles default to `false` unless explicitly set.
- Where a numeric value or `"auto"` is accepted, `"auto"` defers to environment/implementation defaults.
- Channel order and data type must match the model’s training configuration for correct results.
- Outputs are typically normalized to [0,1]; use `denormalize` to convert to `uint8` images when saving.
- This spec currently targets image inputs and image outputs; additional input/output types can be added in future revisions.
