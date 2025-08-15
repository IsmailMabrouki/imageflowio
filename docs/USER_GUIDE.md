# ImageFlowIO User Guide

This guide explains how to install, configure, and run ImageFlowIO in server or CLI environments.

## Requirements

- Node.js >= 18
- Optional: `onnxruntime-node` (only if you want ONNX inference)

## Install

```
npm install imageflowio
# optional ONNX backend
npm install onnxruntime-node
```

## Quick start

### CLI (preview runner)

1. Create a config (see `docs/CONFIG.md`).
2. Run with your image:

```
imageflowio --config config.json --input ./path/to/image.png --output ./outputs
```

Common flags:

- `--backend auto|onnx|noop|tfjs`
- `--threads <number|auto>`
- `--validate-only` (schema check only)
- `--dry-run` (print execution plan)
- `--print-schema` (show packaged schema path)

Environment overrides:

- `IMAGEFLOWIO_BACKEND=onnx|auto|noop`
- `IMAGEFLOWIO_THREADS=auto|<number>`

### Node API (server usage)

```ts
import { ImageFlowPipeline } from "imageflowio";
import config from "./config.json" assert { type: "json" };

const pipeline = new ImageFlowPipeline(config);
// Per request/job
const { outputPath } = await pipeline.run({ backend: "auto", threads: "auto" });
```

- Override paths at runtime by modifying `config.input.source` / `config.output.save.path` or using CLI flags.
- For ONNX, install `onnxruntime-node`; it is loaded dynamically at runtime.

## Configuration

- Full spec: `docs/CONFIG.md`
- JSON Schema: `config.schema.json` — use `$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json"` for online autocompletion, or a relative `./config.schema.json` if working locally.
- Tensor layouts: `docs/TENSOR_LAYOUT.md` (NHWC/NCHW behavior)

Key sections:

- `model`: `path` to model (e.g., `./assets/models/model.onnx`)
- `execution`: `backend: auto|onnx|noop` (auto chooses based on model path), `threads`
- `preprocessing`: `resize`, `normalize` (mean/std), `format` (dtype, channels, channelOrder)
- `inference`: `tiling` (implemented)
  - Tiling options: `tileSize`, `overlap`, `blend` (average | feather | max), and `padMode` (reflect | edge | zero)
- `postprocessing`: `resizeTo`, `activation`, `clamp`, `denormalize`, `colorMap` (grayscale, viridis, magma, plasma), `paletteMap` (preset/inline/file + optional outline), `toneMap` (luminance-based)
- `output`: `save` (png/jpeg/webp/tiff), `writeMeta` (timings and sizes), `saveRaw` (NPY/BIN/NPZ; NPY can be float32 normalized [0,1])

## Backends

- Noop (default when no float tensor required or `backend: noop`)
- ONNX Runtime Node (optional): `npm install onnxruntime-node`
  - TFJS (optional, preview): `npm install @tensorflow/tfjs-node` (or `@tensorflow/tfjs` as fallback)
  - Auto-selected when model path ends with `.onnx` or choose with `--backend onnx`
  - Loaded with `require` at runtime (no install -> clear error message)

### TFJS model layout

- Expect a directory containing `model.json` and one or more weight files (e.g., `group1-shard1of1.bin`).
- Point `model.path` at that directory when using `execution.backend: "tfjs"` or CLI `--backend tfjs`.
- If your model expects NCHW, set `model.layout: "nchw"` to enable layout conversion when possible.

## Performance tips

- Threads: set `execution.threads.count` or `run({ threads })`
- Float path: enable `format.dataType: "float32"` and `normalize` if your model expects it
- Denormalize scale: set `postprocessing.denormalize.scale` (applied to backend float outputs)
- Warmup: `execution.warmupRuns` warms the backend before timed runs
- Layout: `model.layout` can hint NCHW vs NHWC for ONNX models (conversion handled internally when possible)
- Persistent sessions: MVP loads per run; pooling/warm sessions can be added later

## Logging & diagnostics

- In `config.json`:

```json
{
  "logging": {
    "saveLogs": true,
    "logPath": "./logs/inference.log",
    "level": "debug"
  }
}
```

- At the CLI, you can override without editing the config:
  - `--log-file ./logs/run.log` writes logs
  - `--log-level debug|info|error` controls verbosity

Debug logs include tiling markers (tile positions and settings), visualization output paths, per-phase timings, and memory usage (rss/heap) at checkpoints.

Batch runs (directory input) also write `summary.json` to `output.save.path` with counts, duration, and per-file outputs.

## Examples

- See `examples/README.md`
  - `examples/palette-file.json`: palette from JSON + raw BIN
  - `examples/float32-raw.json`: save NPY as float32
  - `examples/basic-noop.json`: end-to-end preview without a model
  - `examples/viz-overlay.json` and `examples/viz-heatmap.json`: visualization outputs
  - `examples/tiling.json`: tiled inference (overlap/padding)
  - `examples/grayscale-float.json`: grayscale float input
  - `examples/tfjs.json`: TensorFlow.js backend usage (requires optional install)
- Try without a model:

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## Troubleshooting

- "Failed to load onnxruntime-node": install it with `npm install onnxruntime-node` and retry
- Schema errors: ensure `"$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json"` (or local `./config.schema.json`) and fields match `docs/CONFIG.md`
  - If you use `saveRaw.dtype: "float32"`, NPY will be normalized to [0,1]; BIN always writes raw bytes.
- Visualization files are created alongside output by default (or in `visualization.outputPath`). Modes: sideBySide, difference, overlay, heatmap.
  - CLI overrides: `--viz`, `--viz-alpha`, `--viz-out`.
- Windows: if `sharp` install fails, ensure build tools are present or use prebuilt binaries (Node >= 18)
- Node engine: ensure `node -v` is >= 18

## FAQ

- Does it work on a server? Yes. Instantiate a pipeline once and call `run()` per job; override only what changes.
- Is it browser-ready? No; current MVP targets Node. Browser builds may come later.
- Which model formats? ONNX (optional backend) now; TFJS/TFLite planned.

## License

MIT — see `LICENSE`.
