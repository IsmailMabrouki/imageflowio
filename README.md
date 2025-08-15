## ImageFlowIO

[![CI](https://github.com/IsmailMabrouki/imageflowio/actions/workflows/ci.yml/badge.svg)](https://github.com/IsmailMabrouki/imageflowio/actions/workflows/ci.yml)

Config-driven ML inference pipeline for images.

Define your entire pipeline in a `config.json` — model loading, runtime settings, preprocessing, tiling, postprocessing, and output saving — and run. No procedural glue required. Supports image-to-image, classification, detection, and segmentation models.

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
  - [x] ONNX Runtime backend (autodetected; optional dep required)
  - [x] TensorFlow.js backend (optional, preview)
- Postprocessing
  - [x] Resize-to-input/fixed size
  - [x] Activation (sigmoid/tanh), clamp, denormalize
  - [x] Color maps (grayscale, viridis, magma, plasma)
  - [x] Tone mapping
  - [x] Palette mapping + overlay blending
- Output
  - [x] Save PNG/JPEG/WebP/TIFF
  - [x] Bit depth and color space handling (linear↔sRGB)
  - [x] Save raw tensors (NPY) and metadata
  - [x] Split channels with optional channel names
- Docs & DX
  - [x] docs/CONFIG.md & docs/CLI.md
  - [x] Examples/recipes and sample assets
  - [x] Enhanced JSON Schema with descriptions and examples
  - [x] Structured validation error output
- CI/Release
  - [x] Publish workflow
  - [x] CI matrix (Node 18/20, ubuntu/windows/macos)
  - [ ] Tag-based publishing and versioning policy
  - [ ] Hosted schema `$id` and governance files

### Documentation

- **Library Analysis**: [docs/ANALYSIS.md](docs/ANALYSIS.md) - Comprehensive overview of what ImageFlowIO does, benefits, target users, and improvement areas
- **JavaScript API**: [docs/API.md](docs/API.md) - Developer-friendly JavaScript/TypeScript API for ML inference
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

### Use Cases

ImageFlowIO supports various ML model types:

- **Image-to-Image Models** (segmentation, style transfer, denoising)

  - Use `output.save` for image outputs
  - Example: UNet for segmentation, style transfer models

- **Classification Models** (image classification, object detection)

  - Use `output.saveRaw` for tensor outputs (NPY/NPZ/BIN)
  - Use `output.writeMeta` for metadata and predictions
  - Example: ResNet, EfficientNet, YOLO

- **Detection Models** (object detection, keypoint detection)

  - Use `output.saveRaw` + `output.writeMeta`
  - Example: YOLO, SSD, Faster R-CNN

- **Segmentation Models** (semantic, instance segmentation)
  - Use `output.save` for mask images
  - Use `output.paletteMap` for colored segmentation
  - Example: DeepLab, Mask R-CNN

### Advanced Features

- **JavaScript API** - Developer-friendly programmatic interface

  ```javascript
  import { ImageFlowIO } from "imageflowio";

  const flow = new ImageFlowIO();
  const result = await flow.classify({
    modelPath: "./model.onnx",
    imagePath: "./image.jpg",
    outputPath: "./results.json",
  });
  ```

- **Custom Functions** - Inject custom JavaScript for preprocessing/postprocessing

  - Use `custom.preprocessingFn` for custom image transformations
  - Use `custom.postprocessingFn` for custom output adjustments
  - Example: Custom filters, color corrections, watermarking

- **Batch Processing** - Process multiple images in parallel
  - Use `--concurrency` flag for parallel processing
  - Automatic batch summary generation
  - Progress reporting for large datasets
  - Process entire directories of images
  - Automatic `summary.json` generation with statistics

### Example Configurations

**Image-to-Image (Segmentation):**

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

**Classification Model:**

```json
{
  "$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
  "model": { "name": "resnet50", "path": "./assets/models/resnet50.onnx" },
  "input": { "type": "image", "source": "./images/sample.png" },
  "preprocessing": {
    "resize": {
      "apply": true,
      "imageSize": [224, 224],
      "keepAspectRatio": true
    },
    "normalize": {
      "apply": true,
      "mean": [0.485, 0.456, 0.406],
      "std": [0.229, 0.224, 0.225]
    },
    "format": { "dataType": "float32", "channels": 3, "channelOrder": "rgb" }
  },
  "output": {
    "saveRaw": {
      "apply": true,
      "format": "npy",
      "path": "./outputs/raw"
    },
    "writeMeta": {
      "apply": true,
      "jsonPath": "./outputs/predictions.json"
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

ImageFlowIO supports multiple inference backends optimized for different use cases:

#### ONNX Runtime (Recommended)

- **Best for**: Production deployments, high-performance inference
- **Install**: `npm install onnxruntime-node`
- **Config**: `execution.backend: "onnx"`
- **CLI**: `--backend onnx`
- **Features**: Session caching, layout conversion, optimized C++ runtime

#### TensorFlow.js (Preview)

- **Best for**: TFJS models, web deployment, prototyping
- **Install**: `npm install @tensorflow/tfjs-node` (preferred) or `@tensorflow/tfjs`
- **Config**: `execution.backend: "tfjs"`
- **CLI**: `--backend tfjs`
- **Features**: Graph/Layers models, JavaScript runtime

#### Noop (Testing)

- **Best for**: Testing, validation, preprocessing verification
- **Install**: No additional installation required
- **Config**: `execution.backend: "noop"`
- **CLI**: `--backend noop`
- **Features**: Identity transform, perfect for pipeline validation

**Auto-detection**: When `model.path` ends with `.onnx`, `backend: "auto"` selects ONNX.

**Performance**: ONNX Runtime > TensorFlow.js > Noop

See [Backend Comparison Guide](docs/BACKENDS.md) for detailed capabilities, performance benchmarks, and selection criteria.

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

### What's new in 0.0.6

- Enhanced backend interface with layout hints and input/output names
- Comprehensive integration tests for both ONNX and TFJS backends
- Enhanced JSON Schema with descriptions, examples, and default values
- Structured validation error output with detailed error paths
- CLI progress updates for batch processing
- Improved error handling and diagnostics
- Comprehensive documentation updates

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

### Ecosystem Integrations (Coming Soon)

ImageFlowIO is designed to integrate seamlessly with popular frameworks and build tools. We're working on the following integrations:

#### **Phase 1: Framework Integrations**

- **Express Middleware** (`@imageflowio/express`) - File upload handling, automatic model loading
- **Next.js Plugin** (`@imageflowio/next`) - API route helpers, image optimization integration
- **Fastify Plugin** (`@imageflowio/fastify`) - Plugin architecture, schema validation
- **Koa Middleware** (`@imageflowio/koa`) - Middleware pattern, context extension

#### **Phase 2: Build Tool Integrations**

- **Vite Plugin** (`@imageflowio/vite`) - Asset optimization, HMR support
- **Webpack Loader** (`@imageflowio/webpack`) - Image processing during build
- **Rollup Plugin** (`@imageflowio/rollup`) - Tree-shaking, bundle analysis

#### **Phase 3: Advanced Integrations**

- **Nuxt Module** (`@imageflowio/nuxt`) - Server-side and client-side support
- **Remix Integration** (`@imageflowio/remix`) - Loader and action helpers
- **GraphQL Integration** (`@imageflowio/graphql`) - Custom scalars, resolver helpers

See [Ecosystem Integration Plan](docs/ECOSYSTEM_INTEGRATION.md) for detailed roadmap and implementation strategy.

### Feature support matrix (selected)

| Area           | Feature                                           | Status |
| -------------- | ------------------------------------------------- | ------ |
| Preprocessing  | Resize, center-crop, grayscale                    | Done   |
| Preprocessing  | Normalize (mean/std)                              | Done   |
| Inference      | Noop, ONNX (optional), TFJS (optional, preview)   | Done   |
| Runtime        | Threads auto (cores), explicit threads            | Done   |
| Caching        | Preprocess caching (memory/disk)                  | Done   |
| Batch          | Multi-image processing (CLI) with progress        | Done   |
| Output         | NPZ writer                                        | Done   |
| Inference      | Tiled inference (overlap, blend modes, padding)   | Done   |
| Postprocessing | Activation, clamp, denormalize                    | Done   |
| Postprocessing | Colormaps, palette mapping, overlay, tone mapping | Done   |
| Output         | PNG/JPEG/WebP/TIFF save                           | Done   |
| Output         | Split channels, raw NPY/BIN, metadata, logs       | Done   |
| CLI/DX         | Validate/run, Ajv 2020-12, JSON errors, progress  | Done   |
| Packaging/CI   | Dual build (CJS/ESM), CI matrix                   | Done   |
| Visualization  | sideBySide, difference, overlay, heatmap          | Done   |
| Backend API    | Enhanced interface (layout, input/output names)   | Done   |
| Testing        | ONNX integration test (guarded)                   | Done   |
| Testing        | TFJS integration test (guarded)                   | Done   |
| Schema         | Enhanced descriptions, examples, defaults         | Done   |
| Error Handling | Structured validation with detailed error paths   | Done   |

### Troubleshooting

Common issues and solutions:

**Configuration Errors**

- Use `--validate-only` to check config before running
- Add `$schema` reference for IDE autocompletion
- Check required fields: `model.path`, `input.source`

**Backend Issues**

- ONNX: Install `npm install onnxruntime-node`
- TFJS: Install `npm install @tensorflow/tfjs-node`
- Use `--backend noop` to test preprocessing/postprocessing

**Performance Issues**

- Enable tiling for large images
- Use `--concurrency` for batch processing
- Enable caching with `execution.useCaching`
- Use memory caching for repeated runs, disk caching for persistence

**Debugging**

- Use `--log-level debug --log-file debug.log`
- Check `examples/error-handling.md` for detailed troubleshooting
- Validate with `--errors json` for structured error output

### License

MIT — see [LICENSE](LICENSE).
