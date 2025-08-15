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

### custom-functions.json

- Example demonstrating custom preprocessing and postprocessing functions
- Uses `custom.preprocessingFn` for custom image transformations
- Uses `custom.postprocessingFn` for custom output adjustments
- Includes example JavaScript functions in `examples/custom/`

Setup:

1. Create the custom function files:

   - `examples/custom/preprocess.js` (custom preprocessing)
   - `examples/custom/postprocess.js` (custom postprocessing)

2. Run the pipeline:

```
imageflowio --config examples/custom-functions.json --backend noop --input examples/images/sample.png --output examples/outputs
```

The custom functions demonstrate:

- Brightness/saturation adjustments in preprocessing
- Color correction in postprocessing
- How to use Sharp.js operations in custom functions

### batch-processing.json

- Example for processing multiple images in parallel (batch processing)
- Uses directory as input source to process all images in a folder
- Demonstrates parallel processing with `--concurrency` flag
- Shows batch summary generation and progress reporting

Setup:

1. Create a directory with images to process:

   ```
   examples/images/batch-inputs/
   ├── image1.jpg
   ├── image2.png
   ├── image3.webp
   └── ...
   ```

2. Run batch processing:

   ```
   # Basic batch processing
   imageflowio --config examples/batch-processing.json --backend noop

   # Parallel processing with progress
   imageflowio --config examples/batch-processing.json --backend noop --concurrency 4 --progress
   ```

Features demonstrated:

- Directory input processing
- Parallel worker management
- Progress reporting
- Automatic summary.json generation
- Batch metadata and logging

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

## Error Handling

### error-handling.md

- Comprehensive guide to common errors and their solutions
- Examples of configuration validation errors
- Backend loading error troubleshooting
- Input/output file error resolution
- Memory and performance optimization
- Debugging techniques and best practices

**Common scenarios covered:**

- Missing required configuration fields
- Backend dependency installation issues
- File path and permission problems
- Memory issues with large images
- Performance optimization tips

**Debugging techniques:**

- Verbose logging with `--log-level debug`
- Configuration validation with `--validate-only`
- Testing with noop backend
- File permission checking
- Error prevention strategies

See `examples/error-handling.md` for detailed examples and solutions.

## Tensor Layout Examples

### layout-nhwc.json

- Example for models expecting NHWC (channels-last) tensor format
- Demonstrates `model.layout: "nhwc"` configuration
- Common for TensorFlow models and many ONNX models
- Default layout - no conversion needed for most image processing pipelines

Run:

```
imageflowio --config examples/layout-nhwc.json --backend onnx --input examples/images/sample.png --output examples/outputs
```

### layout-nchw.json

- Example for models expecting NCHW (channels-first) tensor format
- Demonstrates `model.layout: "nchw"` configuration
- Common for PyTorch models and some ONNX models
- Automatic conversion from NHWC to NCHW before inference

Run:

```
imageflowio --config examples/layout-nchw.json --backend onnx --input examples/images/sample.png --output examples/outputs
```

**Layout Selection Tips:**

- **NHWC**: Use for TensorFlow models, most image processing models
- **NCHW**: Use for PyTorch models, some optimized ONNX models
- **Performance**: Correct layout hint avoids unnecessary conversions
- **Detection**: Backends automatically detect layout from tensor dimensions when not specified

## Backend-Specific Examples

### ONNX Backend Examples

#### onnx-unet.json

- Basic ONNX model example
- Requires `npm install onnxruntime-node`
- Auto-detected when model path ends with `.onnx`

#### onnx-advanced.json

- Advanced ONNX features demonstration
- Layout hints, tensor names, warmup runs
- Performance optimization techniques

#### onnx-io-names.json

- Explicit input/output tensor names
- Useful for complex ONNX models
- Custom tensor name configuration

### TensorFlow.js Backend Examples

#### tfjs.json

- TensorFlow.js model example
- Requires `npm install @tensorflow/tfjs-node`
- Supports Graph and Layers models
- Directory-based model loading

### Backend Selection Guide

**Choose ONNX Runtime when:**

- You have ONNX models
- Performance is critical
- Production deployment
- High-throughput requirements

**Choose TensorFlow.js when:**

- You have TFJS models
- Web deployment planned
- Prototyping with TFJS

**Choose Noop when:**

- Testing preprocessing/postprocessing
- Validating configuration
- CI/CD without models

See [Backend Comparison Guide](../docs/BACKENDS.md) for detailed capabilities and performance benchmarks.

## Caching Examples

### caching-memory.json

- Example for memory-based preprocessing caching
- Uses `execution.useCaching: "memory"` for fastest performance
- Caches preprocessed images in RAM for repeated runs
- Best for: High-performance scenarios, repeated processing of same images

Run:

```
imageflowio --config examples/caching-memory.json --backend noop --input examples/images/sample.png --output examples/outputs
```

### caching-disk.json

- Example for disk-based preprocessing caching
- Uses `execution.useCaching: "disk"` with custom cache directory
- Caches preprocessed images to disk for persistence across runs
- Best for: Long-running processes, shared cache across multiple runs

Run:

```
imageflowio --config examples/caching-disk.json --backend noop --input examples/images/sample.png --output examples/outputs
```

**Caching Performance Tips:**

- **Memory cache**: Fastest, but lost on process restart
- **Disk cache**: Slower, but persistent across runs
- **Cache key**: Based on input file + modification time + preprocessing config
- **Cache invalidation**: Automatic when input or preprocessing changes
- **Cache cleanup**: Manual cleanup required for disk cache
