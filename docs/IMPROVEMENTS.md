### IMPROVEMENTS.md

This document captures issues observed while using `imageflowio@0.0.1` and proposes concise, actionable improvements. Reference: [imageflowio on npm](https://www.npmjs.com/package/imageflowio).

### Critical correctness

- Ajv metaschema error

  - Symptom: “no schema with key or ref https://json-schema.org/draft/2020-12/schema”.
  - Cause: Ajv 8 doesn’t bundle 2020-12 metaschema by default.
  - Fix options:
    - Add metaschema before compile:
      ```ts
      import Ajv from "ajv";
      import meta2020 from "ajv/dist/refs/json-schema-2020-12.json";
      const ajv = new Ajv({ allErrors: true, strict: false });
      ajv.addMetaSchema(meta2020);
      ```
    - Or change packaged `config.schema.json` to draft-07 (`"$schema": "http://json-schema.org/draft-07/schema#"`).
  - Prefer keeping 2020-12 + add metaschema.

- Root $schema in config vs schema restrictions
  - Symptom: “data must NOT have additional properties” when user includes `$schema` in `config.json`.
  - Cause: `config.schema.json` has `additionalProperties: false` at root and doesn’t list `$schema`.
  - Fix: Allow `$schema` at root to improve IDE DX:
    ```json
    "properties": {
      "$schema": { "type": "string" },
      ...
    }
    ```
  - Also update docs to reflect that `$schema` is accepted.

### CLI/UX

- Missing `--version`

  - `--version` should print package version and exit before any validation.
  - Add `-V, --version` for version; use `--validate-only` with no short flag to avoid the common `-V` conflict.

- Validation shouldn’t run for help/version

  - Ensure `--help` and `--version` short-circuit before reading config or compiling schema.

- Friendlier errors

  - Print path to failing schema path and instance path from Ajv (already available via `ajv.errorsText`, but structured output would help in verbose mode).
  - Suggest remediation, e.g., “Remove `$schema` or upgrade to vX.Y where `$schema` at root is supported.”

- Add common flags

  - `--input` and `--output` to override parts of the config at runtime.
  - `--dry-run` to validate and show an execution plan without writing files.

- Logging
  - Respect `logging.level` at runtime (currently only a verbose boolean is used).
  - Add `--log-file` override to force logs to file regardless of config.

### Docs consistency

- CLI status mismatch

  - `docs/CLI.md` says “validation only”, but pipeline performs basic resize/save. Align status (either explicitly call it a preview pipeline or mark execution as partial).

- Examples include `$schema`

  - With root `additionalProperties: false`, examples using `$schema` fail. Update the schema (preferred) or remove `$schema` from examples.

- Surface implementation matrix
  - Add a “feature support” table indicating which config fields are implemented in the pipeline (resize, centerCrop, grayscale, resizeTo, save png/jpeg/webp/tiff) vs. planned (normalize, format dtype, activation, clamp, toneMap, colorMap, paletteMap, saveRaw, writeMeta, visualization, tiling, custom hooks).

### Pipeline gaps vs. schema

- Missing core features declared in schema

  - Preprocessing: `normalize`, `format`, `augmentations`.
  - Inference: no model loading/execution; `execution.backend/threads` unused.
  - Postprocessing: `activation`, `clamp`, `denormalize`, `colorMap`, `toneMap`, `paletteMap`, `blendOverlay`.
  - Output: `saveRaw`, `writeMeta`.
  - Custom hooks: `custom.preprocessingFn` / `custom.postprocessingFn`.
  - Visualization: none.

- Suggested near-term milestones
  - Implement `normalize` and `format` (map to `sharp` + typed array conversion).
  - Apply `execution.threads` by setting `sharp.concurrency()`.
  - Implement `denormalize` (invert normalize) in post.
  - Implement `saveRaw` (write NPY/NPZ/BIN via a small writer).
  - Implement `writeMeta` (timings + effective config to JSON).

### DeepLabV3 TFLite support

- Backend adapter

  - Add a simple backend interface and a TFLite implementation (e.g., `@tensorflow/tfjs-tflite` WASM path in Node).
  - Minimal config additions:
    - `model.type: "tflite"`
    - Optional `model.inputShape`/`outputShape` hints.
    - `postprocessing.paletteMap` with `source: "argmax"` and a preset palette (e.g., Pascal VOC).
  - Preprocessing defaults for DeepLabV3:
    - Resize to 513×513, scale to [0,1] or mean/std normalization per model variant.
  - Postprocessing:
    - Argmax channel to class map.
    - Palette mapping to RGB.
    - Optional overlay over input.

- Packaging
  - Add TFLite dependencies as optional peer or optional dependency; provide clear install instructions for Node/Windows.
  - Document WASM assets location for tfjs-wasm and how to set it if needed.

### JSON Schema/DX

- Enrich schema with titles/descriptions

  - Improve IDE hover/auto-complete by adding `title`/`description` per property and enumerations.

- Provide `schemas/config.schema.json` online

  - Host a stable `$id` URL serving the schema for `$schema` resolution in editors.

- Add examples directory
  - `examples/basic/`, `examples/segmentation-deeplabv3/` with ready-to-run configs and assets structure.

### Packaging/build

- Dual build (CJS + ESM) and sourcemaps

  - Publish both formats with `"exports"` map; include source maps for better debugging.

- Engines and OS notes

  - Specify Node engine in `package.json` and document Windows-specific notes (e.g., long paths, OneDrive sync paths, Sharp install guidance).

- Tests/CI
  - Add unit tests for CLI argument parsing and config validation.
  - Add integration tests for a tiny sample image pipeline run without external models.

### Small polish

- Respect `output.save.quality` for all lossy formats (already used for jpeg/webp; ensure png doesn’t accept this field in schema or clarify).
- Fail clearly when input file is missing (friendly message before `sharp` throws).
- Print final output location without line breaks on Windows terminals.
- Add `imageflowio --print-schema` to output the packaged JSON Schema path or contents.

### Summary of observed issues resolved locally (for reference)

- Fixed config validation by removing `$schema` (workaround).
- Avoided Ajv metaschema error by switching schema to draft-07 locally (workaround only; publish-side fix recommended as above).

### References

- Package page and docs: [imageflowio on npm](https://www.npmjs.com/package/imageflowio)

- End state
  - Addressing the Ajv metaschema and `$schema` handling will eliminate first-run friction.
  - Aligning docs with implementation and adding a basic TFLite backend will unlock the DeepLabV3 use case.
  - Schema/CLI polish will improve developer experience significantly.
