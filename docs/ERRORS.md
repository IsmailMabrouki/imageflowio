# Errors and diagnostics

This project uses a few structured error types to make failures easier to understand and handle. Use CLI flags like `--errors json`, `--log-file`, and `--log-level` to get actionable diagnostics.

## Error classes

- ConfigValidationError

  - Thrown when `config.json` fails schema validation.
  - CLI: `--errors json` (or `--json-errors`) prints a payload with `instancePath`, `schemaPath`, `keyword`, and `message` for each issue.

- PipelineError

  - Thrown for invalid runtime conditions in the pipeline, e.g., missing input image.

- BackendLoadError

  - Wraps errors when loading an inference backend fails (e.g., optional dependency missing).
  - Typical messages:
    - ONNX: `Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend.`
    - TFJS: `Failed to load TensorFlow.js backend. Install '@tensorflow/tfjs-node' (preferred) or '@tensorflow/tfjs'.`

- InferenceError

  - Wraps exceptions thrown during model execution.

- SaveError
  - Wraps exceptions when saving output images or raw tensors fails.

## Getting diagnostics

- Logs

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
  - CLI overrides: `--log-file ./logs/run.log --log-level debug`
  - Debug logs include tiling markers (tile positions/settings), visualization output paths, timings, and memory usage (rss/heap) at checkpoints.

- CLI errors
  - JSON output: `imageflowio --config config.json --validate-only --errors json`
  - Pretty output (default): `imageflowio --config config.json --validate-only`

## Tips

- For ONNX: install `onnxruntime-node` and check `model.layout` hints if needed.
- For TFJS: prefer `@tensorflow/tfjs-node` for better performance; point `model.path` to a directory with `model.json`.
- Warmup runs: set `execution.warmupRuns` to stabilize backend timing before processing.
