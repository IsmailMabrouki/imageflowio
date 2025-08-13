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
- [ ] Stabilize backend adapter interface (`InferenceBackend`) and document tensor layout (NHWC/NCHW)
- [ ] Introduce typed error classes (e.g., `ConfigError`, `InferenceError`)

## 2) Preprocessing & postprocessing

- [x] Normalize (mean/std) for float path; basic denormalize parity
- [~] Channel order (RGB/BGR) (uint8 path today)
- [x] Color maps (grayscale, viridis, magma, plasma) and tone mapping (preview)
- [ ] Tiling: split/overlap/blend for large images

## 3) Inference backends

- [ ] ONNX Runtime Node backend (optional dependency)
  - Dynamic import; clear error if missing
  - Config: model layout hints, input/output names (optional)
- [ ] TFJS/TFLite backend (optional) – WASM guidance in docs
- [ ] Backend selection: `execution.backend: auto|cpu|gpu` + model extension heuristics

## 4) Packaging

- [x] Dual build (CJS + ESM) with exports map and source maps (tsup)
- [x] Mark `sideEffects: false` and whitelist `files`
- [x] Optional peer deps for heavy backends (onnxruntime-node optional)
- [x] `engines: { node: ">=18" }`

## 5) CLI & DX

- [x] `--backend` and `--threads` overrides
- [ ] Structured validation error output (dataPath, schemaPath)
- [ ] Consider separate `@imageflowio/cli` package when API stabilizes

## 6) Testing

- [ ] Unit: normalize/denormalize math, channel order, colorMap/blendOverlay
- [ ] Integration: ONNX backend (guard via env + conditional install)
- [ ] CI matrix: Node 18, 20; OS: ubuntu, windows, macos

## 7) Docs

- [ ] Feature support matrix (implemented vs planned)
- [ ] Examples: `examples/basic/`, `examples/segmentation/deeplabv3/`
- [ ] Host schema at a stable `$id` URL (e.g., GitHub Pages `schemas/config.schema.json`)
- [ ] Windows notes for `sharp` and `onnxruntime-node`

## 8) Release & governance

- [ ] Tag-based publishing in CI (`on.push.tags: ["v*"]`)
- [ ] Semantic versioning + changelog (Changesets or Release Please)
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
