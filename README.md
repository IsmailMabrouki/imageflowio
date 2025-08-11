## ImageFlowIO

[![CI](https://github.com/IsmailMabrouki/imageflowio/actions/workflows/ci.yml/badge.svg)](https://github.com/IsmailMabrouki/imageflowio/actions/workflows/ci.yml)

Config-driven image-to-image inference pipeline.

Define your entire pipeline in a `config.json` — model loading, runtime settings, preprocessing, tiling, postprocessing, and output saving — and run. No procedural glue required.

## npm

https://www.npmjs.com/package/imageflowio

### Status

Early stage. Configuration spec is documented; implementation is evolving. Expect breaking changes.

### Progress

- Core
  - [x] Configuration spec and JSON Schema
  - [x] Minimal CLI (validate + run)
  - [x] Basic pipeline scaffold + backend interface (noop, ONNX autodetect)
- Preprocessing
  - [x] Resize, center-crop, grayscale
  - [x] Normalize (mean/std) on float path
  - [~] Channel order conversion (RGB/BGR) (uint8 path)
  - [ ] Augmentations (flip, rotate, jitter)
- Inference
  - [x] Backend adapter interface
  - [~] ONNX Runtime backend (autodetected; optional dep required)
  - [ ] TensorFlow.js backend
- Postprocessing
  - [x] Resize-to-input/fixed size
  - [~] Activation (sigmoid/tanh), clamp, denormalize (preview on 8-bit)
  - [x] Color maps (grayscale, viridis, magma, plasma)
  - [~] Tone mapping (preview)
  - [x] Palette mapping + overlay blending
- Output
  - [x] Save PNG/JPEG/WebP/TIFF
  - [ ] Bit depth and color space handling (linear↔sRGB)
  - [x] Save raw tensors (NPY) and metadata
  - [x] Split channels with optional channel names
- Docs & DX
  - [x] docs/CONFIG.md & docs/CLI.md
  - [ ] Examples/recipes and sample assets
- CI/Release
  - [x] Publish workflow
  - [ ] Tag-based publishing and versioning policy

### Documentation

- Configuration reference and example: see `docs/CONFIG.md`
- JSON Schema for validation/IDE autocompletion: `config.schema.json`
- CLI usage: `docs/CLI.md`
- Roadmap: `docs/ROADMAP.md`
- Progress: `docs/PROGRESS.md`
- Examples: `examples/README.md`

### Example config

```json
{
  "$schema": "./config.schema.json",
  "model": { "name": "unet", "path": "./assets/models/unet.onnx" },
  "execution": {
    "backend": "auto",
    "threads": { "apply": true, "count": "auto" }
  },
  "input": { "type": "image", "source": "./images/sample.png" },
  "preprocessing": {
    "resize": {
      "apply": true,
      "imageSize": [512, 512],
      "keepAspectRatio": true
    },
    "normalize": {
      "apply": true,
      "mean": [0.5, 0.5, 0.5],
      "std": [0.5, 0.5, 0.5]
    },
    "format": { "dataType": "float32", "channels": 3, "channelOrder": "rgb" }
  },
  "inference": { "batchSize": 1 },
  "postprocessing": {
    "denormalize": { "apply": true, "scale": 255, "dtype": "uint8" },
    "resizeTo": "input"
  },
  "output": {
    "save": {
      "apply": true,
      "path": "./outputs",
      "format": "png",
      "filename": "{model}_{timestamp}.png"
    }
  }
}
```

### Getting started

1. Place your model and assets locally (e.g., `./assets/models/unet.onnx`).
2. Create a `config.json` like the example above.
3. Validate your config and run via the CLI.

### Try it (no model)

1. Add a small test image at `examples/images/sample.png`.
2. Run the preview pipeline (noop backend):

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs
```

### CLI

- Local dev:

  - Build: `npm run build`
  - Help: `node dist/cli.js --help`
  - Validate: `node dist/cli.js --config config.json --validate-only`
  - ESM: `node dist/cli.mjs --help`

- After install/publish:
  - Help: `imageflowio --help`
  - Validate: `imageflowio --config config.json --validate-only`

### Feature support matrix (selected)

| Area           | Feature                                  | Status  |
| -------------- | ---------------------------------------- | ------- |
| Preprocessing  | Resize, center-crop, grayscale           | Done    |
| Preprocessing  | Normalize (mean/std)                     | Done    |
| Inference      | Noop backend, ONNX (optional)            | Done    |
| Inference      | Tiled inference (overlap averaging)      | Done    |
| Postprocessing | Activation, clamp, denormalize (preview) | Partial |
| Postprocessing | Colormaps, palette mapping, overlay      | Done    |
| Output         | PNG/JPEG/WebP/TIFF save                  | Done    |
| Output         | Split channels, raw NPY, metadata        | Done    |
| CLI/DX         | Validate/run, Ajv 2020-12, JSON errors   | Done    |
| Packaging/CI   | Dual build (CJS/ESM), CI matrix          | Done    |

### License

MIT — see `LICENSE`.
