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

## Common Error Scenarios

### Configuration Validation Errors

**Missing required fields:**

```bash
Error: Config validation failed
/model: should have required property 'path'
```

**Solution:** Add missing required fields to your config:

```json
{
  "model": {
    "name": "test",
    "path": "./assets/models/model.onnx" // Required
  },
  "input": {
    "type": "image",
    "source": "./images/sample.png" // Required
  }
}
```

### Backend Loading Errors

**ONNX Runtime not installed:**

```bash
Error: Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend.
```

**Solution:** Install the required dependency:

```bash
npm install onnxruntime-node
```

**TensorFlow.js not installed:**

```bash
Error: Failed to load TensorFlow.js backend. Install '@tensorflow/tfjs-node' (preferred) or '@tensorflow/tfjs'.
```

**Solution:** Install TensorFlow.js:

```bash
npm install @tensorflow/tfjs-node
```

### Input/Output Errors

**Input file not found:**

```bash
Error: Input file not found: ./nonexistent.png
```

**Solution:** Verify file exists and path is correct:

```bash
ls -la ./images/sample.png
```

**Output directory not writable:**

```bash
Error: Cannot write to output directory: /root/protected/
```

**Solution:** Use writable directory:

```bash
imageflowio --config config.json --output ./outputs/
```

### Memory and Performance Errors

**Out of memory:**

```bash
Error: JavaScript heap out of memory
```

**Solution:** Enable tiling for large images:

```json
{
  "inference": {
    "tiling": {
      "apply": true,
      "tileSize": [256, 256],
      "overlap": 32
    }
  }
}
```

## Debugging Techniques

### 1. Enable Verbose Logging

```bash
imageflowio --config config.json --log-level debug --log-file debug.log
```

### 2. Validate Configuration Only

```bash
imageflowio --config config.json --validate-only --errors json
```

### 3. Test with Noop Backend

```bash
imageflowio --config config.json --backend noop
```

### 4. Check File Permissions

```bash
ls -la ./images/sample.png
ls -la ./outputs/
```

## Tips

- For ONNX: install `onnxruntime-node` and check `model.layout` hints if needed.
- For TFJS: prefer `@tensorflow/tfjs-node` for better performance; point `model.path` to a directory with `model.json`.
- Warmup runs: set `execution.warmupRuns` to stabilize backend timing before processing.
- Use `--validate-only` to check configuration before running the full pipeline.
- Enable tiling for large images to prevent memory issues.
- Use caching for repeated runs on the same images.
- Set `model.layout` to match your model's expected tensor format for optimal performance.
