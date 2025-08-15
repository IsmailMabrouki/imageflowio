# Examples

This folder contains example `config.json` files to get started quickly. Add a small PNG or JPEG at `examples/images/sample.png` to run them.

## Model Type Examples

### basic-noop.json

- Runs the preview pipeline without a real model (noop backend). Useful to verify preprocessing/postprocessing/output behavior.

Run:

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs
```

### classification.json

- Example for classification models (ResNet, EfficientNet, etc.)
- Uses `saveRaw` to output prediction tensors (NPY format)
- Uses `writeMeta` to save metadata and predictions

Run:

```
imageflowio --config examples/classification.json --backend onnx --input examples/images/sample.png --output examples/outputs
```

### detection.json

- Example for object detection models (YOLO, SSD, etc.)
- Uses `saveRaw` to output detection tensors (NPZ format)
- Uses `writeMeta` to save detection metadata

Run:

```
imageflowio --config examples/detection.json --backend onnx --input examples/images/sample.png --output examples/outputs
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

## onnx-advanced.json

- Demonstrates advanced ONNX backend features including layout hints, input/output tensor names, and enhanced configuration.

Run:

```
imageflowio --config examples/onnx-advanced.json --backend onnx --input examples/images/sample.png --output examples/outputs
```

Features demonstrated:

- `model.layout: "nchw"` - hints tensor layout for automatic conversion
- `model.inputName` and `model.outputName` - explicit tensor names
- `execution.warmupRuns: 3` - performance stabilization
- `execution.useCaching: "memory"` - preprocessing cache
- `logging.level: "debug"` - detailed logging

## onnx-io-names.json

- Demonstrates providing explicit input/output tensor names for ONNX models.

Run:

```
imageflowio --config examples/onnx-io-names.json --backend onnx --input examples/images/sample.png --output examples/outputs
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

- Demonstrates saving raw NPY with `dtype: "float32"`.

Run:

```
imageflowio --config examples/float32-raw.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## npz-raw.json

- Demonstrates saving raw output as NPZ (zip containing a single NPY array named `output`).

Run:

```
imageflowio --config examples/npz-raw.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## tiling.json

- Demonstrates tiled inference with overlap, padding and blend modes.

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

- Demonstrates visualization heatmap between input and output.
  - You can override at runtime: `--viz heatmap --viz-out examples/outputs/viz`

Run:

```
imageflowio --config examples/viz-heatmap.json --backend noop --input examples/images/sample.png --output examples/outputs
```

## tfjs.json

- Demonstrates running with the TensorFlow.js backend (requires optional install).

Setup:

```
npm install @tensorflow/tfjs-node
# or (slower)
npm install @tensorflow/tfjs
```

Then export or place a TFJS model under `examples/tfjs-model` (directory with `model.json` and weights), and run:

```
imageflowio --config examples/tfjs.json --backend tfjs --input examples/images/sample.png --output examples/outputs
```

## caching (memory/disk)

- You can enable disk caching of preprocessing to speed up repeated runs on the same inputs:

Run:

```
imageflowio --config examples/basic-noop.json --backend noop --input examples/images/sample.png --output examples/outputs --cache disk --cache-dir .imageflowio-cache
```

- Or set in config under `execution`: `{ "useCaching": "disk", "cacheDir": ".imageflowio-cache" }`.
