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

- `--backend auto|onnx|noop`
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
- JSON Schema: `config.schema.json` (editors can use `$schema": "./config.schema.json"` for autocompletion)

Key sections:

- `model`: `path` to model (e.g., `./assets/models/model.onnx`)
- `execution`: `backend: auto|cpu|gpu` (auto uses best available), `threads`
- `preprocessing`: `resize`, `normalize` (mean/std), `format` (dtype, channels, channelOrder)
- `inference`: `tiling` (planned)
- `postprocessing`: `resizeTo`, `activation`, `clamp`, `denormalize`, `colorMap` (grayscale, viridis, magma, plasma), `paletteMap` (preset/inline/file + optional outline), `toneMap` (luminance-based)
- `output`: `save` (png/jpeg/webp/tiff), `writeMeta` (timings and sizes), `saveRaw` (NPY)

## Backends

- Noop (default when no float tensor required or `backend: noop`)
- ONNX Runtime Node (optional): `npm install onnxruntime-node`
  - Auto-selected when model path ends with `.onnx` or choose with `--backend onnx`
  - Loaded with `require` at runtime (no install -> clear error message)

## Performance tips

- Threads: set `execution.threads.count` or `run({ threads })`
- Float path: enable `format.dataType: "float32"` and `normalize` if your model expects it
- Denormalize scale: set `postprocessing.denormalize.scale` (applied to backend float outputs)
- Warmup: `execution.warmupRuns` (declared, implementation may vary per backend)
- Persistent sessions: MVP loads per run; pooling/warm sessions can be added later

## Examples

- See `examples/README.md`
  - `examples/palette-file.json`: palette from JSON + raw BIN
  - `examples/float32-raw.json`: save NPY as float32
- Try without a model:

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## Troubleshooting

- "Failed to load onnxruntime-node": install it with `npm install onnxruntime-node` and retry
- Schema errors: ensure `"$schema": "./config.schema.json"` and fields match `docs/CONFIG.md`
  - If you use `saveRaw.dtype: "float32"`, NPY will be normalized to [0,1]; BIN always writes raw bytes.
- Windows: if `sharp` install fails, ensure build tools are present or use prebuilt binaries (Node >= 18)
- Node engine: ensure `node -v` is >= 18

## FAQ

- Does it work on a server? Yes. Instantiate a pipeline once and call `run()` per job; override only what changes.
- Is it browser-ready? No; current MVP targets Node. Browser builds may come later.
- Which model formats? ONNX (optional backend) now; TFJS/TFLite planned.

## License

MIT — see `LICENSE`.
