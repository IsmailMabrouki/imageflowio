## Changelog

### 0.0.6

Highlights:

- Enhanced backend interface with layout hints and input/output names
- Comprehensive integration tests for both ONNX and TFJS backends
- Enhanced JSON Schema with descriptions, examples, and default values
- Structured validation error output with detailed error paths
- CLI progress updates for batch processing
- Improved error handling and diagnostics
- Comprehensive documentation updates

### 0.0.4

Highlights:

- Visualization: `overlay`, `heatmap`; CLI flags `--viz`, `--viz-alpha`, `--viz-out`
- Tiling: overlap blending (`average`, `feather`, `max`) and padding (`reflect`, `edge`, `zero`)
- Preprocessing: augmentations (`flip`, `rotate`, `colorJitter`); RGB/BGR on uint8 and float paths (incl. tiling)
- Postprocessing: activation/clamp/denormalize; tone mapping (ACES/Reinhard/Filmic)
- Output: PNG/JPEG/WebP/TIFF; PNG 8/16-bit, TIFF 1/2/4/8-bit; raw NPY/BIN; metadata + logs
- CLI/DX: Ajv 2020-12 metaschema; `--print-schema`; env overrides; Windows-friendly tests; `--progress` flag for batch processing
- Backends: optional ONNX Runtime Node; basic NHWC/NCHW handling; tensor utils exported
- Packaging: dual CJS/ESM via tsup; exports map
- Docs/Examples/Tests: expanded docs; added viz/tiling examples; broadened test suite (62 tests)

Notes:

- ONNX execution requires `onnxruntime-node` (optional peer); guarded in CLI
- Future: add ONNX integration test under env guard; richer error types; hosted schema `$id`

Additions after initial 0.0.4 draft:

- Optional TensorFlow.js backend (`--backend tfjs`), with auto-detect when `model.json` present
- CLI `--log-level` flag to override `logging.level`
- Guarded tests for missing ONNX/TFJS dependencies
- Enhanced backend interface with layout hints and input/output names
- Comprehensive integration tests for both ONNX and TFJS backends
- Enhanced JSON Schema with descriptions, examples, and default values
- Structured validation error output with detailed error paths
- CI matrix supporting Node 18/20 on ubuntu/windows/macos
