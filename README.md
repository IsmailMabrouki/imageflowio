## ImageFlowIO

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
  - [x] Basic pipeline scaffold
- Preprocessing
  - [x] Resize, center-crop, grayscale
  - [ ] Normalize (mean/std)
  - [ ] Channel order conversion (RGB/BGR), dtype conversions
  - [ ] Augmentations (flip, rotate, jitter)
- Inference
  - [ ] Backend adapter interface
  - [ ] ONNX Runtime backend
  - [ ] TensorFlow.js backend
- Postprocessing
  - [x] Resize-to-input/fixed size
  - [ ] Activation (sigmoid/tanh), clamp, denormalize
  - [ ] Color maps, tone mapping
  - [ ] Palette mapping + overlay blending
- Output
  - [x] Save PNG/JPEG/WebP/TIFF
  - [ ] Bit depth and color space handling (linear↔sRGB)
  - [ ] Save raw tensors (NPY/NPZ/BIN), metadata, split channels
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

### Example config

```json
{
  "$schema": "./config.schema.json",
  "model": { "name": "unet", "path": "./assets/unet.onnx" },
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

1. Place your model and assets locally (e.g., `./assets/unet.onnx`).
2. Create a `config.json` like the example above.
3. Validate your config and run via the CLI.

### CLI

- Local dev:

  - Build: `npm run build`
  - Help: `node dist/cli.js --help`
  - Validate: `node dist/cli.js --config config.json --validate-only`

- After install/publish:
  - Help: `imageflowio --help`
  - Validate: `imageflowio --config config.json --validate-only`

### License

MIT — see `LICENSE`.
