# Progress: Implemented vs Planned

Version: 0.0.4
Last updated: today

## Summary

- Implemented a preview end-to-end path (image → preprocess → backend → postprocess → save) with a clean backend interface and an optional ONNX adapter.
- Robust CLI with validation and execution controls; JSON Schema (2020-12) and tests are in place.

## Details

### Core

- Implemented: config schema (2020-12), CLI validate/run, basic pipeline scaffold, backend interface, tests (CLI + pipeline + tiling + viz + logging + raw), CI build+test, publish workflow with provenance.
- Partial: ONNX backend (autodetect; optional dependency required at runtime).
- Planned: richer error classes, more examples, feature support matrix in README.

### CLI & DX

- Implemented:
  - Flags: `--version`, `--validate-only`, `--input`, `--output`, `--dry-run`, `--print-schema`, `--backend`, `--threads`.
  - Env overrides: `IMAGEFLOWIO_BACKEND`, `IMAGEFLOWIO_THREADS`.
- Planned:
  - Structured validation errors (dataPath/schemaPath), potential separate CLI package.

### Schema

- Implemented:
  - Root `$schema` allowed; tuple defs via `prefixItems`; Ajv 2020 integration.
- Planned:
  - Add titles/descriptions for richer IDE hints; host schema at stable `$id` URL.

### Preprocessing

- Implemented:
  - Resize (fit/fill/keepAspect), center-crop, grayscale.
  - Float path + normalize (mean/std) when requested; BGR swap on float & tiled paths.
  - Channel order conversion (RGB↔BGR) for uint8 path.
  - Augmentations: flip, rotate (0/90/180/270), colorJitter (brightness/saturation/hue).
- Planned:
  - Channel order/dtype conversions generalized for float/uint8 paths; augmentations.

### Inference

- Implemented:
  - Backend interface; Noop backend; ONNX backend loader (optional `onnxruntime-node`, dynamic require); model layout hint (nhwc/nchw) documented.
  - Backend selection: auto by extension or overrides (`--backend`).
  - Warmup runs.
  - Tiled inference with overlap averaging.
- Planned:
  - Full ONNX execution examples/tests; TFJS/TFLite backend (optional WASM).

### Postprocessing

- Implemented:
  - Resize-to-input/fixed size.
  - Activation (sigmoid/tanh), clamp, denormalize (preview on 8-bit data).
  - Tone mapping (ACES/Reinhard/Filmic), color maps (grayscale/viridis/magma/plasma).
  - Palette mapping (preset/file/inline) with optional outline; blend overlay with alpha.
- Planned:
  - Tone mapping improvements; class overlays/outline.

### Output

- Implemented:
  - Save PNG/JPEG/WebP/TIFF; `quality` and bit depth where supported (PNG 8/16, TIFF 1/2/4/8).
  - Metadata JSON with timings and sizes; per-run logs when enabled.
  - Raw tensor export: NPY (uint8/float32 normalized) and BIN.
  - Split channels with optional names.
- Planned:
  - Split channels, color space handling (linear↔sRGB), NPZ/BIN writers.

### Packaging/Release

- Implemented:
  - Optional peer dep: `onnxruntime-node`.
- Planned:
  - Dual ESM/CJS build with `exports` map and source maps; tag-based publishing; engines field already set (>=18).

### Testing/CI

- Implemented: CLI, colormaps, pipeline, tiling, visualization, logging, raw export, augmentations tests; Windows dev confirmed; test outputs under `testoutput/`.
- Planned: matrix CI (Node 18/20; ubuntu/windows/macos), ONNX integration test behind env guard.

## Next up (shortlist)

1. Dual ESM/CJS build with `exports` map and source maps.
2. Complete ONNX backend integration path and add a guarded integration test.
3. Stabilize type surface and error classes; host schema at stable `$id`.
