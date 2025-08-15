# ImageFlowIO CLI

Minimal command-line interface to validate and run ImageFlowIO configurations.

Status: preview runner — validates config and runs an image-to-image pipeline (resize/crop/grayscale/augmentations, normalize/format to float, optional ONNX/TFJS inference, postprocess: activation/clamp/denormalize/toneMap/colorMap/paletteMap/overlay, output save/split/raw/meta, visualization modes).

## Install

- Local dev:

  - Build: `npm run build`
  - Run (CJS): `node dist/cli.js --help`
  - Run (ESM): `node dist/cli.mjs --help`

- After publishing (or linking):
  - `imageflowio --help`

## Usage

````
imageflowio --config <path/to/config.json> [--validate-only] [--verbose]

Options:
  -c, --config         Path to config.json (default: ./config.json)
  -V, --version        Print version and exit
      --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
      --input <path>   Override input.source
      --output <path>  Override output.save.path
      --backend <b>    Backend override: auto|onnx|noop|tfjs
      --threads <n>    Threads override: number|auto
      --json-errors    Print validation errors as JSON
      --errors <m>     Error output mode: json|pretty (default: pretty)
      --log-file <p>   Write errors/logs to file
      --log-level <l>  Override logging.level: debug|info|error
      --concurrency <n>  Max parallel workers for directory inputs (default: 1)
      --progress       Print progress updates for directory inputs
      --cache <m>      Preprocess cache mode: memory|disk
      --cache-dir <p>  Directory for disk cache (default: .imageflowio-cache)
      --viz <t>        Visualization: sideBySide|overlay|heatmap|difference
      --viz-alpha <a>  Visualization overlay alpha (0..1)
      --viz-out <dir>  Visualization output directory
      --dry-run        Validate and print plan only
      --print-schema   Print packaged schema path
  -h, --help           Show help

Notes:
- Use `--input` and `--output` to override `config.input.source` and `output.save.path` at runtime.
- `--print-schema` prints the packaged config schema path for editor integration.
 - `--json-errors` is equivalent to `--errors json`.
- Backend auto-detect when `execution.backend: auto`:
  - ONNX if `model.path` ends with `.onnx`
  - TFJS if `model.path` is a directory containing `model.json` (Graph/Layers model)

Logging & diagnostics:
- Use `--log-file <path>` to write logs and `--log-level debug|info|error` to control verbosity (see `docs/USER_GUIDE.md#logging--diagnostics`).

Warmup runs:
- Set `execution.warmupRuns` in config to stabilize backend performance before timing runs.

Performance:
- `--threads auto` now sets concurrency to number of CPU cores; explicit numbers are also supported

## Batch Processing

ImageFlowIO supports processing multiple images in parallel when the input source points to a directory.

### How it works

- **Directory Input**: Set `input.source` to a directory path (e.g., `"./images/"`)
- **Automatic Detection**: CLI automatically detects directory inputs and switches to batch mode
- **File Filtering**: Processes all supported image files (PNG, JPG, JPEG, WebP, TIFF)
- **Parallel Processing**: Uses `--concurrency` flag to control parallel workers
- **Progress Reporting**: Use `--progress` flag for real-time progress updates

### Batch Processing Options

- `--concurrency <n>` - Number of parallel workers (default: 1)
- `--progress` - Show progress updates every 10 files

### Batch Summary

After processing, a `summary.json` file is automatically generated containing:

```json
{
  "ok": true,
  "processed": 150,
  "saved": 148,
  "durationMs": 45000,
  "items": [
    {
      "input": "./images/photo1.jpg",
      "output": "./outputs/photo1_processed.png"
    },
    {
      "input": "./images/photo2.jpg",
      "output": null
    }
  ]
}
````

**Fields:**

- `ok` - Overall success status
- `processed` - Total number of files processed
- `saved` - Number of files successfully saved
- `durationMs` - Total processing time in milliseconds
- `items` - Array of input/output file pairs

### Batch Processing Examples

**Basic batch processing:**

```bash
imageflowio --config batch-config.json --input ./images/ --output ./results/
```

**Parallel processing with progress:**

```bash
imageflowio --config batch-config.json --input ./images/ --output ./results/ --concurrency 4 --progress
```

**Using directory in config:**

```json
{
  "input": {
    "type": "image",
    "source": "./images/"
  },
  "output": {
    "save": {
      "apply": true,
      "path": "./results/",
      "filename": "{model}_{timestamp}_{index}.png"
    }
  }
}
```

### Performance Tips

- **Concurrency**: Set `--concurrency` to number of CPU cores for optimal performance
- **Memory**: Monitor memory usage with large batches
- **Caching**: Enable disk caching for repeated runs on same images
- **Progress**: Use `--progress` for long-running batches to monitor status

```

## Examples

Validate a config file:

```

imageflowio -c config.json --validate-only

````

Validate with schema reference in your config:

```json
{
  "$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
  "model": { "path": "./assets/models/unet.onnx" }
}
````

Then run (uses model path under `assets/models/`):

```
imageflowio --config config.json
```

### Visualization overrides at runtime

You can force visualization without editing the config:

```
imageflowio --config config.json --viz overlay --viz-alpha 0.6 --viz-out ./viz
```

### Tiled inference

Enable tiling in your config to process large images without exhausting memory:

```json
{
  "inference": {
    "tiling": {
      "apply": true,
      "tileSize": [256, 256],
      "overlap": 32,
      "padMode": "reflect",
      "blend": "average"
    }
  },
  "preprocessing": {
    "format": { "dataType": "float32", "channels": 3 },
    "normalize": {
      "apply": true,
      "mean": [0.5, 0.5, 0.5],
      "std": [0.5, 0.5, 0.5]
    }
  },
  "postprocessing": { "denormalize": { "apply": true, "scale": 255 } }
}
```

Supported blends: average, feather, max. Pad modes: reflect, edge, zero.
