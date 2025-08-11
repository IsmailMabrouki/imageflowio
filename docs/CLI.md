# ImageFlowIO CLI

Minimal command-line interface to validate and run ImageFlowIO configurations.

Status: validation only — pipeline execution to be implemented.

## Install

- Local dev:

  - Build: `npm run build`
  - Run: `node dist/cli.js --help`

- After publishing (or linking):
  - `imageflowio --help`

## Usage

```
imageflowio --config <path/to/config.json> [--validate-only] [--verbose]

Options:
  -c, --config         Path to config.json (default: ./config.json)
  -V, --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
  -h, --help           Show help
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
  "model": { "path": "./assets/unet.onnx" }
}
```

Then run:

```
imageflowio --config config.json
```
