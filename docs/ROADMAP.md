# ImageFlowIO Roadmap

A concise, actionable plan to evolve ImageFlowIO following library best practices.

## 0) Current baseline

- [x] CLI with config validation and preview runner
- [x] JSON Schema (2020-12) + Ajv integration
- [x] Basic pipeline (preprocess → backend → postprocess → save)
- [x] Backend interface + noop backend; ONNX autodetect stub
- [x] Tests (CLI, pipeline) writing to `testoutput/`
- [x] CI: build + test before publish

## 1) API & architecture

- [x] Finalize public surface: export backends and types via `src/index.ts`
- [x] Stabilize backend adapter interface (`InferenceBackend`)
- [x] Document tensor layout (NHWC/NCHW): see `docs/TENSOR_LAYOUT.md`
- [x] Introduce typed error classes (`ConfigValidationError`, `BackendLoadError`, `InferenceError`, `SaveError`) — see `docs/ERRORS.md`

## 2) Preprocessing & postprocessing

- [x] Normalize (mean/std) for float path; basic denormalize parity
- [x] Channel order (RGB/BGR)
- [x] Color maps (grayscale, viridis, magma, plasma) and tone mapping (preview)
- [x] Tiling: split/overlap/blend for large images
- [x] Disk/memory preprocess caching

## 3) Inference backends

- [ ] ONNX Runtime Node backend (optional dependency)
  - Dynamic import; clear error if missing
  - Config: model layout hints, input/output names (optional)
- [x] TFJS backend (optional, preview)
- [ ] Backend selection: `execution.backend: auto|cpu|gpu` + model extension heuristics

## 4) Packaging

- [x] Dual build (CJS + ESM) with exports map and source maps (tsup)
- [x] Mark `sideEffects: false` and whitelist `files`
- [x] Optional peer deps for heavy backends (onnxruntime-node optional)
- [x] `engines: { node: ">=18" }`

## 5) CLI & DX

- [x] `--backend` and `--threads` overrides
- [x] `--errors` json|pretty; `--log-file`; `--log-level`
- [x] Batch processing with `--concurrency` and `summary.json`
- [x] `--cache` and `--cache-dir` for preprocess caching
- [ ] Consider separate `@imageflowio/cli` package when API stabilizes

## 6) Testing

- [x] Unit/integration: CLI, pipeline, tiling, visualization, logging, raw export, augmentations
- [x] Integration: ONNX backend (guard via env + conditional install)
- [x] Integration: TFJS backend (guard via env + conditional install)
- [x] CI matrix: Node 18, 20; OS: ubuntu, windows, macos

## 7) Docs

- [x] Feature support matrix (selected) in README
- [x] Host schema at stable `$id` (raw.githubusercontent)
- [x] Windows notes and CLI tips (`docs/USER_GUIDE.md`)
- [x] Errors and diagnostics (`docs/ERRORS.md`)
- [x] Enhanced JSON Schema with descriptions and examples
- [x] Structured validation error output with detailed error paths

## 8) Release & governance

- [ ] Tag-based publishing in CI (`on.push.tags: ["v*"]`)
- [ ] Semantic versioning + changelog automation
- [ ] Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

## 9) Security & quality

- [ ] Path/input validation; clear errors on missing assets
- [ ] Linting (ESLint) + formatting (Prettier)
- [ ] Source maps in published bundle

## Snippets (for later steps)

- package.json (dual build skeleton)

```jsonc
{
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,
  "files": ["dist", "docs", "config.schema.json", "README.md", "LICENSE"],
  "peerDependencies": {
    "onnxruntime-node": "*"
  },
  "peerDependenciesMeta": {
    "onnxruntime-node": { "optional": true }
  }
}
```

- GitHub Actions (tags-only publish trigger)

```yaml
on:
  push:
    tags:
      - "v*"
```
