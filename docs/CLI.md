# ImageFlowIO CLI

Minimal command-line interface to validate and run ImageFlowIO configurations.

Status: preview runner — validates config and runs an image-to-image pipeline (resize/crop/grayscale/augmentations, normalize/format to float, optional ONNX inference, postprocess: activation/clamp/denormalize/toneMap/colorMap/paletteMap/overlay, output save/split/raw/meta, visualization modes).

## Install

- Local dev:

  - Build: `npm run build`
  - Run (CJS): `node dist/cli.js --help`
  - Run (ESM): `node dist/cli.mjs --help`

- After publishing (or linking):
  - `imageflowio --help`

## Usage

```
imageflowio --config <path/to/config.json> [--validate-only] [--verbose]

Options:
  -c, --config         Path to config.json (default: ./config.json)
  -V, --version        Print version and exit
      --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
      --input <path>   Override input.source
      --output <path>  Override output.save.path
      --backend <b>    Backend override: auto|onnx|noop
      --threads <n>    Threads override: number|auto
      --json-errors    Print validation errors as JSON
      --log-file <p>   Write errors/logs to file
      --dry-run        Validate and print plan only
      --print-schema   Print packaged schema path
  -h, --help           Show help

Notes:
- Use `--input` and `--output` to override `config.input.source` and `output.save.path` at runtime.
- `--print-schema` prints the packaged config schema path for editor integration.
```

## Examples

Validate a config file:

```
imageflowio -c config.json -V
```

Validate with schema reference in your config:

```json
{
  "$schema": "./config.schema.json",
  "model": { "path": "./assets/models/unet.onnx" }
}
```

Then run (uses model path under `assets/models/`):

```
imageflowio --config config.json
```

### Tiled inference

Enable tiling in your config to process large images without exhausting memory:

```json
{
  "inference": {
    "tiling": { "apply": true, "tileSize": [256, 256], "overlap": 32 }
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

The current implementation blends overlaps by averaging.
