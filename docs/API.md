# ImageFlowIO JavaScript API

The ImageFlowIO JavaScript API provides a developer-friendly interface for ML inference pipelines, making it easy to run classification, segmentation, detection, and enhancement tasks with minimal configuration.

## Quick Start

```javascript
import { ImageFlowIO } from "imageflowio";

// Initialize the API
const flow = new ImageFlowIO();

// Simple classification
const result = await flow.classify({
  modelPath: "./models/mobilenetv2.onnx",
  imagePath: "./images/sample.jpg",
  outputPath: "./results/predictions.json",
});

console.log(`Top prediction: ${result.topPrediction}`);
console.log(`Confidence: ${result.confidence.toFixed(2)}`);
```

## API Overview

### Core Methods

- **`classify(options)`** - Run classification models
- **`segment(options)`** - Run segmentation models
- **`detect(options)`** - Run object detection models
- **`enhance(options)`** - Run image-to-image models
- **`run(options)`** - Run with custom configuration
- **`autoGenerateConfig(options)`** - Auto-generate configuration

### Configuration Methods

- **`setPreprocessing(config)`** - Set default preprocessing
- **`setOutput(config)`** - Set default output settings

## Classification

Classify images using classification models like ResNet, MobileNet, etc.

```javascript
const result = await flow.classify({
  modelPath: "./models/resnet50.onnx",
  imagePath: "./images/sample.jpg",
  outputPath: "./results/classification.json",
  topK: 5,
  resize: [224, 224],
  normalize: [0.485, 0.456, 0.406], // ImageNet mean
  std: [0.229, 0.224, 0.225], // ImageNet std
  backend: "onnx",
  useCaching: "memory",
});

// Result structure
console.log(result.topPrediction); // "golden retriever"
console.log(result.confidence); // 0.95
console.log(result.topK); // Array of top predictions
```

### Classification Options

| Option       | Type                                   | Default                      | Description               |
| ------------ | -------------------------------------- | ---------------------------- | ------------------------- |
| `modelPath`  | string                                 | **required**                 | Path to ONNX/TFJS model   |
| `imagePath`  | string                                 | **required**                 | Path to input image       |
| `outputPath` | string                                 | `./outputs/predictions.json` | JSON output path          |
| `topK`       | number                                 | 1                            | Number of top predictions |
| `resize`     | `[number, number]`                     | `[224, 224]`                 | Input resize dimensions   |
| `normalize`  | `[number, number, number]`             | ImageNet mean                | Normalization mean        |
| `std`        | `[number, number, number]`             | ImageNet std                 | Normalization std         |
| `backend`    | `'auto' \| 'onnx' \| 'tfjs' \| 'noop'` | `'auto'`                     | Inference backend         |
| `useCaching` | `boolean \| 'memory' \| 'disk'`        | `false`                      | Enable caching            |

## Segmentation

Segment images using models like UNet, DeepLab, etc.

```javascript
const result = await flow.segment({
  modelPath: "./models/unet.onnx",
  imagePath: "./images/sample.jpg",
  outputDir: "./results/segmentation",
  resize: [512, 512],
  overlay: true,
  colormap: "viridis",
  normalize: [0.5, 0.5, 0.5],
  std: [0.5, 0.5, 0.5],
});

// Result structure
console.log(result.maskPath); // "./results/segmentation/segmentation_mask.png"
console.log(result.overlayPath); // "./results/segmentation/overlay.png" (if overlay: true)
```

### Segmentation Options

| Option      | Type                                              | Default           | Description                    |
| ----------- | ------------------------------------------------- | ----------------- | ------------------------------ |
| `modelPath` | string                                            | **required**      | Path to segmentation model     |
| `imagePath` | string                                            | **required**      | Path to input image            |
| `outputDir` | string                                            | `./outputs`       | Output directory               |
| `resize`    | `[number, number]`                                | `[512, 512]`      | Input resize dimensions        |
| `overlay`   | boolean                                           | `false`           | Generate overlay visualization |
| `colormap`  | `'viridis' \| 'magma' \| 'plasma' \| 'grayscale'` | -                 | Colormap for visualization     |
| `normalize` | `[number, number, number]`                        | `[0.5, 0.5, 0.5]` | Normalization mean             |
| `std`       | `[number, number, number]`                        | `[0.5, 0.5, 0.5]` | Normalization std              |

## Object Detection

Detect objects using models like YOLO, SSD, etc.

```javascript
const result = await flow.detect({
  modelPath: "./models/yolo.onnx",
  imagePath: "./images/sample.jpg",
  outputPath: "./results/detections.json",
  confidence: 0.5,
  resize: [416, 416],
  nms: true,
  labels: ["person", "car", "dog", "cat"],
});

// Result structure
console.log(result.detections.length); // Number of detected objects
result.detections.forEach((detection) => {
  console.log(`${detection.label}: ${detection.confidence.toFixed(2)}`);
  console.log(`Bounding box: [${detection.bbox.join(", ")}]`);
});
```

### Detection Options

| Option       | Type               | Default                     | Description                    |
| ------------ | ------------------ | --------------------------- | ------------------------------ |
| `modelPath`  | string             | **required**                | Path to detection model        |
| `imagePath`  | string             | **required**                | Path to input image            |
| `outputPath` | string             | `./outputs/detections.json` | JSON output path               |
| `confidence` | number             | `0.5`                       | Confidence threshold           |
| `resize`     | `[number, number]` | `[416, 416]`                | Input resize dimensions        |
| `nms`        | boolean            | `false`                     | Enable non-maximum suppression |
| `labels`     | string[]           | -                           | Custom label names             |

## Image Enhancement

Enhance images using super-resolution, denoising, etc. models.

```javascript
const result = await flow.enhance({
  modelPath: "./models/super-resolution.onnx",
  imagePath: "./images/sample.jpg",
  outputDir: "./results/enhanced",
  scale: 2,
  quality: 95,
  format: "png",
  resize: [512, 512],
});

// Result structure
console.log(result.outputPath); // "./results/enhanced/enhanced_image.png"
```

### Enhancement Options

| Option      | Type                                  | Default      | Description                |
| ----------- | ------------------------------------- | ------------ | -------------------------- |
| `modelPath` | string                                | **required** | Path to enhancement model  |
| `imagePath` | string                                | **required** | Path to input image        |
| `outputDir` | string                                | `./outputs`  | Output directory           |
| `scale`     | number                                | `1`          | Output scale factor        |
| `quality`   | number                                | `95`         | Output quality (JPEG/WebP) |
| `format`    | `'png' \| 'jpeg' \| 'webp' \| 'tiff'` | `'png'`      | Output format              |
| `resize`    | `[number, number]`                    | `[512, 512]` | Input resize dimensions    |

## Advanced Configuration

### Custom Configuration

Use the `run()` method for custom configurations:

```javascript
const result = await flow.run({
  modelPath: "./models/custom-model.onnx",
  imagePath: "./images/sample.jpg",
  backend: "onnx",
  useCaching: "memory",
  warmupRuns: 3,
  threads: "auto",
  logLevel: "debug",
  configOverrides: {
    "inference.batchSize": 4,
    "execution.threads.count": 8,
    "preprocessing.resize.imageSize": [256, 256],
  },
});
```

### Default Configuration

Set default preprocessing and output settings:

```javascript
// Set default preprocessing
flow.setPreprocessing({
  resize: {
    apply: true,
    imageSize: [224, 224],
    keepAspectRatio: false,
  },
  normalize: {
    apply: true,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
});

// Set default output
flow.setOutput({
  saveRaw: true,
  saveImage: true,
  saveMetadata: true,
  outputDir: "./results",
});
```

### Auto-Configuration

Generate configuration automatically based on model analysis:

```javascript
const generated = await flow.autoGenerateConfig({
  modelPath: "./models/unknown-model.onnx",
  imagePath: "./images/sample.jpg",
  modelType: "classification",
  outputFormats: ["raw", "json"],
  outputDir: "./results/auto",
});

console.log(`Model type: ${generated.modelInfo.type}`);
console.log(`Input shape: [${generated.modelInfo.inputShape.join(", ")}]`);
console.log(`Suggestions: ${generated.suggestions.join(", ")}`);

// Use the generated config
const result = await flow.run({
  ...generated.config,
  imagePath: "./images/sample.jpg",
});
```

## TypeScript Support

The API includes full TypeScript support with type definitions:

```typescript
import {
  ImageFlowIO,
  ClassificationResult,
  SegmentationResult,
  DetectionResult,
  EnhancementResult,
} from "imageflowio";

async function processImage(): Promise<ClassificationResult> {
  const flow = new ImageFlowIO();

  const result: ClassificationResult = await flow.classify({
    modelPath: "./models/mobilenetv2.onnx",
    imagePath: "./images/sample.jpg",
    outputPath: "./results/predictions.json",
    topK: 5,
  });

  return result;
}
```

## Error Handling

The API provides comprehensive error handling:

```javascript
try {
  const result = await flow.classify({
    modelPath: "./models/model.onnx",
    imagePath: "./images/sample.jpg",
  });
} catch (error) {
  if (error.message.includes("Model not found")) {
    console.error("Model file not found. Please check the path.");
  } else if (error.message.includes("Backend not available")) {
    console.error(
      "Required backend not installed. Run: npm install onnxruntime-node"
    );
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

## Performance Optimization

### Caching

Enable caching for repeated operations:

```javascript
// Memory caching (fastest, lost on restart)
const result = await flow.classify({
  modelPath: "./models/model.onnx",
  imagePath: "./images/sample.jpg",
  useCaching: "memory",
});

// Disk caching (persistent across restarts)
const result = await flow.classify({
  modelPath: "./models/model.onnx",
  imagePath: "./images/sample.jpg",
  useCaching: "disk",
  cacheDir: "./cache",
});
```

### Threading

Optimize CPU usage:

```javascript
const result = await flow.classify({
  modelPath: "./models/model.onnx",
  imagePath: "./images/sample.jpg",
  threads: 8, // Use 8 threads
  // or
  threads: "auto", // Use all available cores
});
```

### Warmup Runs

Stabilize performance with warmup runs:

```javascript
const result = await flow.classify({
  modelPath: "./models/model.onnx",
  imagePath: "./images/sample.jpg",
  warmupRuns: 3, // Run 3 warmup inferences
});
```

## Examples

See the complete examples in:

- `examples/api-usage.js` - JavaScript examples
- `examples/api-usage.ts` - TypeScript examples

## Migration from Configuration Files

If you're migrating from configuration files to the API:

### Before (Configuration)

```json
{
  "model": { "path": "./model.onnx" },
  "input": { "source": "./image.jpg" },
  "preprocessing": {
    "resize": { "apply": true, "imageSize": [224, 224] },
    "normalize": { "apply": true, "mean": [0.485, 0.456, 0.406] }
  },
  "output": { "saveRaw": { "apply": true } }
}
```

### After (API)

```javascript
const result = await flow.classify({
  modelPath: "./model.onnx",
  imagePath: "./image.jpg",
  resize: [224, 224],
  normalize: [0.485, 0.456, 0.406],
  saveRaw: true,
});
```

## Best Practices

1. **Use TypeScript** for better development experience
2. **Enable caching** for repeated operations
3. **Set appropriate resize dimensions** for your model
4. **Use correct normalization** values (ImageNet for classification)
5. **Handle errors gracefully** with try-catch blocks
6. **Monitor performance** with debug logging
7. **Use auto-configuration** for unknown models

## Troubleshooting

### Common Issues

**Model loading errors:**

```javascript
// Install required backend
// npm install onnxruntime-node
// npm install @tensorflow/tfjs-node
```

**Memory issues:**

```javascript
// Enable tiling for large images
const result = await flow.run({
  modelPath: "./model.onnx",
  imagePath: "./large-image.jpg",
  configOverrides: {
    "inference.tiling.apply": true,
    "inference.tiling.tileSize": [256, 256],
  },
});
```

**Performance issues:**

```javascript
// Use appropriate backend and caching
const result = await flow.classify({
  modelPath: "./model.onnx",
  imagePath: "./image.jpg",
  backend: "onnx", // Fastest backend
  useCaching: "memory", // Enable caching
  warmupRuns: 2, // Stabilize timing
});
```
