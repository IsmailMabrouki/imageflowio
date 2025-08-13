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

## palette-file.json

- Demonstrates palette mapping from a JSON file and saving raw BIN output.

Run:

```
imageflowio --config examples/palette-file.json --backend noop --input examples/images/sample.png --output examples/outputs
```

Create `examples/palette.json` containing an array of RGB triplets, e.g.:

```json
[
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255]
]
```

## float32-raw.json

## tiling.json

- Demonstrates tiled inference with overlap averaging.

Run:

```
imageflowio --config examples/tiling.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## grayscale-float.json

- Demonstrates requesting a grayscale float input (format.channels: 1) for backends.

Run:

```
imageflowio --config examples/grayscale-float.json --backend noop --input examples/images/sample.png --output examples/outputs
```

- Demonstrates saving raw NPY with `dtype: "float32"`.

Run:

```
imageflowio --config examples/float32-raw.json --backend noop --input examples/images/sample.png --output examples/outputs
```

Notes:

- You can override input/output at runtime with `--input` and `--output`.
- Environment overrides also work: `IMAGEFLOWIO_BACKEND`, `IMAGEFLOWIO_THREADS`.

## viz-overlay.json

- Demonstrates visualization overlay with adjustable alpha.

Run:

```
imageflowio --config examples/viz-overlay.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## viz-heatmap.json

- Demonstrates visualization heatmap (difference) between input and output.

Run:

```
imageflowio --config examples/viz-heatmap.json --backend noop --input examples/images/sample.png --output examples/outputs
```
