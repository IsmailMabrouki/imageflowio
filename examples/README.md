# Examples

This folder contains example `config.json` files to get started quickly. Add a small PNG or JPEG at `examples/images/sample.png` to run them.

## basic-noop.json

- Runs the preview pipeline without a real model (noop backend). Useful to verify preprocessing/postprocessing/output behavior.

Run:

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## onnx-unet.json

- Example for ONNX models. Requires installing the optional backend:

```
npm install onnxruntime-node
```

- Set the `model.path` to your `.onnx` file (or export env var `IMAGEFLOWIO_ONNX_MODEL`) and run:

```
imageflowio --config examples/onnx-unet.json --backend onnx --input examples/images/sample.png --output examples/outputs
```

Notes:

- You can override input/output at runtime with `--input` and `--output`.
- Environment overrides also work: `IMAGEFLOWIO_BACKEND`, `IMAGEFLOWIO_THREADS`.
