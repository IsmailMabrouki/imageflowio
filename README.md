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
  - [x] Channel order conversion (RGB/BGR) on uint8 & float paths (incl. tiling)
  - [x] Augmentations (flip, rotate, jitter)
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
  - [~] Bit depth and color space handling (linear↔sRGB)
  - [x] Save raw tensors (NPY) and metadata
  - [x] Split channels with optional channel names
- Docs & DX
  - [x] docs/CONFIG.md & docs/CLI.md
  - [x] Examples/recipes and sample assets
- CI/Release
  - [x] Publish workflow
  - [ ] Tag-based publishing and versioning policy
  - [ ] Hosted schema `$id` and governance files

### Documentation

- **Library Analysis**: [docs/ANALYSIS.md](docs/ANALYSIS.md) - Comprehensive overview of what ImageFlowIO does, benefits, target users, and improvement areas
- Configuration reference and example: [docs/CONFIG.md](docs/CONFIG.md)
- JSON Schema for validation/IDE autocompletion: [config.schema.json](config.schema.json)
- CLI usage: [docs/CLI.md](docs/CLI.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Progress: [docs/PROGRESS.md](docs/PROGRESS.md)
- Examples: [examples/README.md](examples/README.md)
- Developer Guide: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Improvements: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md)
- Advanced Features (experimental): [docs/Advanced-Features.md](docs/Advanced-Features.md)
- Tensor Layouts: [docs/TENSOR_LAYOUT.md](docs/TENSOR_LAYOUT.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Errors and diagnostics: [docs/ERRORS.md](docs/ERRORS.md)

### Example config

```json
{
  "$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
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

### Backends

- ONNX Runtime Node (recommended for ONNX models)

  - Install: `npm install onnxruntime-node`
  - Use in config: `execution.backend: "onnx"`
  - CLI: `--backend onnx`
  - Auto-detection: when `model.path` ends with `.onnx`, `backend: "auto"` selects ONNX

- TensorFlow.js (optional, preview)

  - Install: `npm install @tensorflow/tfjs-node` (preferred) or `@tensorflow/tfjs`
  - Use in config: `execution.backend: "tfjs"`
  - CLI: `--backend tfjs`
  - Expects TFJS Graph or Layers models saved to disk (e.g., directory containing `model.json` and weights)

- Noop (preview pipeline without ML)
  - Use in config: `execution.backend: "noop"`
  - CLI: `--backend noop`

Notes:

- Set `model.layout` to `"nhwc" | "nchw"` to hint tensor layout; conversions are handled internally when possible. See `docs/TENSOR_LAYOUT.md`.

### CLI

- Local dev:

  - Build: `npm run build`
  - Help: `node dist/cli.js --help`
  - Validate: `node dist/cli.js --config config.json --validate-only`
  - ESM: `node dist/cli.mjs --help`

- After install/publish:
  - Help: `imageflowio --help`
  - Validate: `imageflowio --config config.json --validate-only`

### Releasing

- Patch: `npm version patch -m "chore: release v%s"; git push origin main --follow-tags`
- Minor: `npm version minor -m "chore: release v%s"; git push origin main --follow-tags`
- Major: `npm version major -m "chore: release v%s"; git push origin main --follow-tags`

Pushing a tag starting with `v` triggers the publish workflow. Set `NPM_TOKEN` secret. See `docs/DEVELOPMENT.md`.

### What's new in 0.0.4

- Visualization: added `overlay` and `heatmap` modes; `--viz`, `--viz-alpha`, `--viz-out` CLI flags
- Tiling: overlap blending (`average`, `feather`, `max`) and padding (`reflect`, `edge`, `zero`)
- Preprocessing: augmentations (`flip`, `rotate`, `colorJitter`); robust RGB/BGR on uint8 and float paths (incl. tiling)
- Postprocessing: tone mapping (ACES/Reinhard/Filmic), activation/clamp/denormalize improvements
- Output: PNG/JPEG/WebP/TIFF; PNG (8/16-bit), TIFF (1/2/4/8-bit); raw tensor export (NPY/BIN/NPZ); metadata and logs
- CLI/DX: Ajv 2020-12 metaschema support; `--print-schema`; environment overrides; Windows-friendly tests; `--progress` flag for batch processing
- Backends: optional ONNX Runtime Node backend and preview TensorFlow.js backend, with enhanced interface supporting layout hints and input/output names
- Utilities: `nhwcToNchw` / `nchwToNhwc` conversions exported
- Packaging: dual CJS/ESM build via tsup; exports map
- Docs/Examples/Tests: updated docs, added viz/tiling examples; expanded test suite (CLI, tiling, viz, logging, raw, ONNX integration)
- New: `--errors json|pretty` for structured validation; batch mode writes `summary.json`; debug logs include tiling/viz markers and memory usage (when enabled)
- Schema: Enhanced JSON Schema with comprehensive descriptions, examples, and default values for better IDE autocompletion
- Docs: added [docs/ERRORS.md](docs/ERRORS.md) with error classes and diagnostics overview

### Feature support matrix (selected)

| Area           | Feature                                           | Status  |
| -------------- | ------------------------------------------------- | ------- |
| Preprocessing  | Resize, center-crop, grayscale                    | Done    |
| Preprocessing  | Normalize (mean/std)                              | Done    |
| Inference      | Noop, ONNX (optional), TFJS (optional, preview)   | Partial |
| Runtime        | Threads auto (cores), explicit threads            | Done    |
| Caching        | Preprocess caching (memory/disk)                  | Done    |
| Batch          | Multi-image processing (CLI) with progress        | Done    |
| Output         | NPZ writer                                        | Done    |
| Inference      | Tiled inference (overlap, blend modes, padding)   | Done    |
| Postprocessing | Activation, clamp, denormalize (preview)          | Partial |
| Postprocessing | Colormaps, palette mapping, overlay, tone mapping | Done    |
| Output         | PNG/JPEG/WebP/TIFF save                           | Done    |
| Output         | Split channels, raw NPY/BIN, metadata, logs       | Done    |
| CLI/DX         | Validate/run, Ajv 2020-12, JSON errors, progress  | Done    |
| Packaging/CI   | Dual build (CJS/ESM), CI matrix                   | Done    |
| Visualization  | sideBySide, difference, overlay, heatmap          | Done    |
| Backend API    | Enhanced interface (layout, input/output names)   | Done    |
| Testing        | ONNX integration test (guarded)                   | Done    |
| Testing        | TFJS integration test (guarded)                   | Done    |
| Schema         | Enhanced descriptions, examples, defaults         | Done    |
| Error Handling | Structured validation with detailed error paths   | Done    |

### License

MIT — see `
