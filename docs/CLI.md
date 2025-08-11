# ImageFlowIO CLI

Minimal command-line interface to validate and run ImageFlowIO configurations.

Status: preview runner — validates config and runs a basic image-to-image pipeline (resize/crop/grayscale + save). More features coming.

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
  -V, --version        Print version and exit
      --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
      --input <path>   Override input.source
      --output <path>  Override output.save.path
      --dry-run        Validate and print plan only
      --print-schema   Print packaged schema path
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
