# ImageFlowIO Node.js/TypeScript Improvements

## 🎯 Overview

This document outlines comprehensive improvements to make ImageFlowIO more user-friendly as a **TypeScript/JavaScript library for Node.js environments**. The goal is to transform it from a complex configuration-driven tool into an intuitive, developer-friendly library.

## 🚀 1. Better Default Configurations

### Pre-built Config Templates

```bash
# Create configs for common use cases
npx imageflowio --create-config classification --model ./model.onnx
npx imageflowio --create-config segmentation --model ./model.onnx
npx imageflowio --create-config image-to-image --model ./model.onnx
```

### Model-Specific Templates

```bash
# Auto-generate config for specific models
npx imageflowio --create-config mobilenetv2 --model ./mobilenetv2.onnx
npx imageflowio --create-config resnet50 --model ./resnet50.onnx
npx imageflowio --create-config unet --model ./unet.onnx
```

## 🎯 2. Interactive Config Builder (Node.js CLI)

### Interactive CLI Mode

```bash
npx imageflowio --interactive

? What type of model are you using?
  ○ Classification
  ○ Segmentation
  ○ Image-to-Image
  ○ Detection

? What's your model file path?
  ./model.onnx

? What's your input image?
  ./image.jpg

? What output format do you want?
  ○ Raw tensor (NPY)
  ○ Image file (PNG)
  ○ JSON results
  ○ All of the above

✅ Config created: ./auto-generated-config.json
✅ Ready to run: npx imageflowio --config ./auto-generated-config.json
```

### Guided Setup

```bash
npx imageflowio --setup

Welcome to ImageFlowIO Setup! 🚀

Let's get you started with your first ML pipeline:

1. Model Selection
   ? What type of model do you have?
     ○ ONNX (.onnx)
     ○ TensorFlow.js (model.json)
     ○ TensorFlow Lite (.tflite) - Experimental

2. Model Path
   ? Where is your model file located?
     ./models/mobilenetv2.onnx

3. Input Setup
   ? What type of input do you have?
     ○ Single image
     ○ Directory of images
     ○ Video file

4. Output Preferences
   ? What outputs do you need?
     ○ Classification results (JSON)
     ○ Segmentation masks (PNG)
     ○ Raw tensors (NPY)
     ○ All of the above

✅ Setup complete! Your config is ready at: ./imageflowio-config.json
```

## 🎯 3. JavaScript/TypeScript API (Most Important)

### Simple JavaScript API

```javascript
import { ImageFlowIO } from "imageflowio";

// Initialize with smart defaults
const flow = new ImageFlowIO();

// Classification (auto-detects everything)
const result = await flow.classify({
  modelPath: "./mobilenetv2.onnx",
  imagePath: "./image.jpg",
  outputPath: "./results.json",
});
console.log(`Top prediction: ${result.topPrediction}`);
console.log(`Confidence: ${result.confidence.toFixed(2)}`);

// Segmentation
const mask = await flow.segment({
  modelPath: "./unet.onnx",
  imagePath: "./image.jpg",
  outputPath: "./mask.png",
});

// Image-to-Image
const enhanced = await flow.enhance({
  modelPath: "./super-resolution.onnx",
  imagePath: "./image.jpg",
  outputPath: "./enhanced.png",
});

// With custom preprocessing
const result = await flow.classify({
  modelPath: "./model.onnx",
  imagePath: "./image.jpg",
  resize: [512, 512],
  normalize: [0.485, 0.456, 0.406], // ImageNet
  outputPath: "./results.json",
});
```

### TypeScript API with Full Types

```typescript
import { ImageFlowIO, ModelType, OutputFormat } from "imageflowio";

interface ClassificationResult {
  topPrediction: string;
  confidence: number;
  topK: Array<{ label: string; confidence: number }>;
}

interface SegmentationResult {
  maskPath: string;
  overlayPath?: string;
}

const flow = new ImageFlowIO();

// Type-safe classification
const result: ClassificationResult = await flow.classify({
  modelPath: "./mobilenetv2.onnx",
  imagePath: "./image.jpg",
  outputPath: "./results.json",
  topK: 5,
});

// Type-safe segmentation
const mask: SegmentationResult = await flow.segment({
  modelPath: "./unet.onnx",
  imagePath: "./image.jpg",
  outputPath: "./mask.png",
  overlay: true,
});
```

### Advanced JavaScript API

```javascript
// More control when needed
const flow = new ImageFlowIO();

// Custom preprocessing pipeline
flow.setPreprocessing({
  resize: [224, 224],
  normalize: [0.5, 0.5, 0.5],
  augmentations: ["flip", "rotate"],
});

// Custom output handling
flow.setOutput({
  saveRaw: true,
  saveImage: true,
  saveMetadata: true,
  outputDir: "./results",
});

// Run with custom config
const result = await flow.run({
  modelPath: "./model.onnx",
  imagePath: "./image.jpg",
  configOverrides: {
    "inference.batchSize": 4,
    "execution.threads.count": 8,
  },
});
```

### Batch Processing API

```javascript
// Process multiple images
const results = await flow.batchClassify({
  modelPath: "./model.onnx",
  imageDir: "./images/",
  outputDir: "./results/",
  batchSize: 8,
  onProgress: (processed, total) => {
    console.log(
      `Progress: ${processed}/${total} (${((processed / total) * 100).toFixed(
        1
      )}%)`
    );
  },
});

// Process video
const videoResult = await flow.processVideo({
  modelPath: "./model.onnx",
  videoPath: "./video.mp4",
  outputPath: "./processed.mp4",
  fps: 30,
  onFrame: (frameNumber, totalFrames) => {
    console.log(`Processing frame ${frameNumber}/${totalFrames}`);
  },
});
```

## 🎯 4. Simplified CLI Commands (Node.js)

### High-Level Commands

```bash
# Classification
npx imageflowio classify \
  --model ./mobilenetv2.onnx \
  --input ./image.jpg \
  --output ./results.json \
  --top-k 5

# Segmentation
npx imageflowio segment \
  --model ./unet.onnx \
  --input ./image.jpg \
  --output ./mask.png \
  --overlay

# Image-to-Image
npx imageflowio enhance \
  --model ./super-resolution.onnx \
  --input ./image.jpg \
  --output ./enhanced.png \
  --scale 2x

# Detection
npx imageflowio detect \
  --model ./yolo.onnx \
  --input ./image.jpg \
  --output ./detections.json \
  --confidence 0.5
```

### Batch Processing Commands

```bash
# Process multiple images
npx imageflowio classify \
  --model ./model.onnx \
  --input-dir ./images/ \
  --output-dir ./results/ \
  --batch-size 4

# Process video
npx imageflowio segment \
  --model ./model.onnx \
  --input-video ./video.mp4 \
  --output-video ./segmented.mp4 \
  --fps 30

# Process with progress bar
npx imageflowio classify \
  --model ./model.onnx \
  --input-dir ./images/ \
  --output-dir ./results/ \
  --progress \
  --verbose
```

### Quick Commands

```bash
# One-liner classification
npx imageflowio classify ./model.onnx ./image.jpg

# Quick segmentation
npx imageflowio segment ./model.onnx ./image.jpg

# Quick enhancement
npx imageflowio enhance ./model.onnx ./image.jpg
```

## 🎯 5. Smart Auto-Detection (Node.js)

### Model Analysis

```typescript
class ModelAnalyzer {
  async analyzeModel(modelPath: string): Promise<ModelInfo> {
    if (modelPath.endsWith(".onnx")) {
      return this.analyzeOnnxModel(modelPath);
    } else if (modelPath.includes("model.json")) {
      return this.analyzeTfjsModel(modelPath);
    }
  }

  private async analyzeOnnxModel(path: string): Promise<ModelInfo> {
    // Use ONNX.js or similar for Node.js
    const model = await this.loadOnnxModel(path);

    const inputShape = model.getInputShape();
    const outputShape = model.getOutputShape();

    // Determine model type
    if (outputShape.length === 2) {
      // [batch, classes]
      return {
        type: "classification",
        inputSize: this.getInputSize(inputShape),
        numClasses: outputShape[1],
        preprocessing: this.getClassificationPreprocessing(),
      };
    } else if (outputShape.length === 4) {
      // [batch, channels, height, width]
      return {
        type: "segmentation",
        inputSize: this.getInputSize(inputShape),
        outputChannels: outputShape[1],
        preprocessing: this.getSegmentationPreprocessing(),
      };
    }
  }
}
```

### Auto-Config Generation

```typescript
async function autoGenerateConfig(
  modelPath: string,
  inputImage: string,
  outputDir: string
): Promise<Config> {
  const analyzer = new ModelAnalyzer();
  const modelInfo = await analyzer.analyzeModel(modelPath);

  const config: Config = {
    $schema:
      "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
    model: {
      name: "auto-detected",
      path: modelPath,
      layout: modelInfo.type === "classification" ? "nchw" : "nhwc",
    },
    input: {
      type: "image",
      source: inputImage,
    },
    preprocessing: modelInfo.preprocessing,
    output: generateOutputConfig(modelInfo.type, outputDir),
  };

  return config;
}
```

### Smart Defaults

```typescript
class SmartDefaults {
  static getClassificationDefaults(): PreprocessingConfig {
    return {
      resize: {
        apply: true,
        imageSize: [224, 224],
        keepAspectRatio: false,
      },
      normalize: {
        apply: true,
        mean: [0.485, 0.456, 0.406], // ImageNet
        std: [0.229, 0.224, 0.225],
      },
      format: {
        dataType: "float32",
        channels: 3,
        channelOrder: "rgb",
      },
    };
  }

  static getSegmentationDefaults(): PreprocessingConfig {
    return {
      resize: {
        apply: true,
        imageSize: [512, 512],
        keepAspectRatio: true,
      },
      normalize: {
        apply: true,
        mean: [0.5, 0.5, 0.5],
        std: [0.5, 0.5, 0.5],
      },
      format: {
        dataType: "float32",
        channels: 3,
        channelOrder: "rgb",
      },
    };
  }
}
```

## 🎯 6. Visual Config Builder (Web Interface)

### React Component

```typescript
// React component for config builder
import React, { useState } from "react";
import { ImageFlowIO } from "imageflowio";

interface ConfigBuilderProps {
  onConfigGenerated: (config: Config) => void;
}

export const ConfigBuilder: React.FC<ConfigBuilderProps> = ({
  onConfigGenerated,
}) => {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [modelType, setModelType] = useState<ModelType>("classification");
  const [outputFormats, setOutputFormats] = useState<OutputFormat[]>(["raw"]);

  const generateConfig = async () => {
    if (!modelFile || !inputImage) return;

    const flow = new ImageFlowIO();
    const config = await flow.autoGenerateConfig({
      modelPath: modelFile.path,
      imagePath: inputImage.path,
      modelType,
      outputFormats,
    });

    onConfigGenerated(config);
  };

  return (
    <div className="config-builder">
      <div className="model-section">
        <h3>Model</h3>
        <input
          type="file"
          accept=".onnx,.tflite,.pb"
          onChange={(e) => setModelFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="input-section">
        <h3>Input</h3>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setInputImage(e.target.files?.[0] || null)}
        />
      </div>

      <div className="output-section">
        <h3>Output</h3>
        <label>
          <input
            type="checkbox"
            checked={outputFormats.includes("raw")}
            onChange={(e) => {
              if (e.target.checked) {
                setOutputFormats([...outputFormats, "raw"]);
              } else {
                setOutputFormats(outputFormats.filter((f) => f !== "raw"));
              }
            }}
          />
          Save raw tensor
        </label>
        <label>
          <input
            type="checkbox"
            checked={outputFormats.includes("image")}
            onChange={(e) => {
              if (e.target.checked) {
                setOutputFormats([...outputFormats, "image"]);
              } else {
                setOutputFormats(outputFormats.filter((f) => f !== "image"));
              }
            }}
          />
          Save as image
        </label>
      </div>

      <button onClick={generateConfig}>Generate Config</button>
    </div>
  );
};
```

### Vue.js Component

```vue
<template>
  <div class="config-builder">
    <div class="model-section">
      <h3>Model</h3>
      <input
        type="file"
        accept=".onnx,.tflite,.pb"
        @change="onModelFileChange"
      />
    </div>

    <div class="input-section">
      <h3>Input</h3>
      <input type="file" accept="image/*" @change="onInputImageChange" />
    </div>

    <div class="output-section">
      <h3>Output</h3>
      <label v-for="format in availableFormats" :key="format">
        <input
          type="checkbox"
          :checked="outputFormats.includes(format)"
          @change="toggleOutputFormat(format)"
        />
        {{ format }}
      </label>
    </div>

    <button @click="generateConfig">Generate Config</button>
  </div>
</template>

<script>
import { ImageFlowIO } from "imageflowio";

export default {
  name: "ConfigBuilder",
  data() {
    return {
      modelFile: null,
      inputImage: null,
      modelType: "classification",
      outputFormats: ["raw"],
      availableFormats: ["raw", "image", "json", "metadata"],
    };
  },
  methods: {
    onModelFileChange(event) {
      this.modelFile = event.target.files[0];
    },
    onInputImageChange(event) {
      this.inputImage = event.target.files[0];
    },
    toggleOutputFormat(format) {
      if (this.outputFormats.includes(format)) {
        this.outputFormats = this.outputFormats.filter((f) => f !== format);
      } else {
        this.outputFormats.push(format);
      }
    },
    async generateConfig() {
      if (!this.modelFile || !this.inputImage) return;

      const flow = new ImageFlowIO();
      const config = await flow.autoGenerateConfig({
        modelPath: this.modelFile.path,
        imagePath: this.inputImage.path,
        modelType: this.modelType,
        outputFormats: this.outputFormats,
      });

      this.$emit("config-generated", config);
    },
  },
};
</script>
```

## 🎯 7. Better Error Messages (Node.js)

### Contextual Error Handling

```typescript
class ErrorHandler {
  handleModelLoadError(error: Error, modelPath: string): ErrorInfo {
    if (error.message.includes("ONNX")) {
      return {
        message: "❌ ONNX model loading failed",
        suggestions: [
          "Check if the model file is valid ONNX format",
          "Try converting your model to ONNX: torch.onnx.export()",
          "Verify the model file path is correct",
        ],
        helpUrl: "https://docs.imageflowio.com/troubleshooting/onnx",
      };
    } else if (error.message.includes("TensorFlow.js")) {
      return {
        message: "❌ TensorFlow.js model loading failed",
        suggestions: [
          "Ensure model.json and weight files are in the same directory",
          "Check if the model was exported correctly for TF.js",
          "Try using ONNX format instead",
        ],
        helpUrl: "https://docs.imageflowio.com/troubleshooting/tfjs",
      };
    }
  }

  handlePreprocessingError(error: Error, config: Config): ErrorInfo {
    if (error.message.includes("dimension mismatch")) {
      return {
        message: "❌ Input dimension mismatch",
        suggestions: [
          `Model expects input shape: ${this.getExpectedShape()}`,
          `Current input shape: ${this.getActualShape()}`,
          "Adjust resize settings in preprocessing",
        ],
        autoFix: this.generateFixSuggestion(),
      };
    }
  }

  handleBackendError(error: Error, backend: string): ErrorInfo {
    if (backend === "onnx" && error.message.includes("EPERM")) {
      return {
        message: "❌ ONNX Runtime permission error",
        suggestions: [
          "Run as administrator or check file permissions",
          "Try using TensorFlow.js backend instead",
          "Check if antivirus is blocking ONNX Runtime",
        ],
        helpUrl: "https://docs.imageflowio.com/troubleshooting/permissions",
      };
    }
  }
}
```

### Interactive Error Resolution

```typescript
class InteractiveErrorResolver {
  async resolveError(error: Error, context: ErrorContext): Promise<Resolution> {
    const errorInfo = this.analyzeError(error);

    if (errorInfo.autoFix) {
      console.log("🔧 Auto-fix available!");
      console.log("Would you like to apply the fix? (y/n)");

      const response = await this.getUserInput();
      if (response.toLowerCase() === "y") {
        return this.applyAutoFix(errorInfo.autoFix);
      }
    }

    console.log("💡 Suggestions:");
    errorInfo.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    console.log(`📖 More help: ${errorInfo.helpUrl}`);

    return { resolved: false, suggestions: errorInfo.suggestions };
  }
}
```

## 🎯 8. Progressive Complexity (Node.js)

### Level 1: Simple Commands (Beginner)

```bash
# Just run it
npx imageflowio classify ./model.onnx ./image.jpg

# With basic options
npx imageflowio classify \
  --model ./model.onnx \
  --input ./image.jpg \
  --output ./results.json \
  --top-k 5
```

### Level 2: JavaScript API (Intermediate)

```javascript
import { ImageFlowIO } from "imageflowio";

// Simple usage
const flow = new ImageFlowIO();
const result = await flow.classify("./model.onnx", "./image.jpg");

// With custom options
const result = await flow.classify({
  modelPath: "./model.onnx",
  imagePath: "./image.jpg",
  resize: [512, 512],
  normalize: [0.485, 0.456, 0.406],
  outputPath: "./results.json",
});
```

### Level 3: Full Config (Advanced)

```json
{
  "model": {
    "name": "custom_model",
    "path": "./model.onnx",
    "layout": "nchw"
  },
  "preprocessing": {
    "resize": {
      "apply": true,
      "imageSize": [224, 224]
    },
    "normalize": {
      "apply": true,
      "mean": [0.485, 0.456, 0.406],
      "std": [0.229, 0.224, 0.225]
    }
  },
  "output": {
    "saveRaw": {
      "apply": true,
      "format": "npy",
      "path": "./outputs/raw"
    }
  }
}
```

## 🎯 9. Package.json Integration

### Scripts for Common Tasks

```json
{
  "name": "my-ml-project",
  "scripts": {
    "classify": "imageflowio classify --model ./models/mobilenetv2.onnx --input ./images/ --output ./results/",
    "segment": "imageflowio segment --model ./models/unet.onnx --input ./images/ --output ./masks/",
    "enhance": "imageflowio enhance --model ./models/super-resolution.onnx --input ./images/ --output ./enhanced/",
    "batch": "imageflowio classify --model ./models/model.onnx --input-dir ./images/ --output-dir ./results/ --batch-size 8",
    "dev": "imageflowio --interactive",
    "setup": "imageflowio --setup"
  },
  "dependencies": {
    "imageflowio": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^4.9.0"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 🎯 10. Implementation Roadmap (Node.js)

### Phase 1: Quick Wins (1-2 weeks)

- [ ] Better error messages with contextual suggestions
- [ ] Pre-built config templates for common models
- [ ] Simple CLI commands (`classify`, `segment`, `enhance`)
- [ ] Basic JavaScript API with TypeScript types

### Phase 2: Core Improvements (1-2 months)

- [ ] Full JavaScript/TypeScript API with async/await
- [ ] Interactive CLI mode with guided setup
- [ ] Smart defaults and auto-detection
- [ ] Batch processing capabilities
- [ ] Progress tracking and verbose logging

### Phase 3: Advanced Features (2-3 months)

- [ ] Web-based config builder (React/Vue.js)
- [ ] Visual debugging tools
- [ ] Auto-config generation from model analysis
- [ ] Real-time validation and error correction
- [ ] Performance optimization and caching

### Phase 4: Ecosystem (3-6 months)

- [ ] Model marketplace integration
- [ ] Cloud deployment tools (AWS Lambda, Vercel, Netlify)
- [ ] CI/CD integration examples
- [ ] Community templates and examples
- [ ] Performance benchmarking tools

## 💡 Key Node.js Benefits

### JavaScript/TypeScript Advantages

- **Familiar ecosystem** - npm, package.json, Node.js
- **Type safety** - Full TypeScript support with IntelliSense
- **Async/await** - Natural for ML inference operations
- **Web integration** - Easy to use in web applications
- **Cross-platform** - Works on Windows, Mac, Linux
- **Rich ecosystem** - Access to thousands of npm packages

### Node.js Specific Features

- **Streaming** - Process large files efficiently
- **Worker threads** - Parallel processing for batch operations
- **File system** - Native file operations with fs/promises
- **HTTP/HTTPS** - Easy API integration and model serving
- **Event-driven** - Perfect for ML pipeline orchestration
- **Memory management** - Efficient handling of large tensors

### Developer Experience

- **Hot reloading** - Fast development cycles
- **Debugging** - Excellent debugging support in VS Code
- **Testing** - Jest, Mocha, or other testing frameworks
- **Linting** - ESLint and Prettier for code quality
- **Documentation** - JSDoc for automatic documentation

## 🎯 Success Metrics

### Usability Metrics

- **Time to first success** - < 5 minutes for basic classification
- **Configuration complexity** - 80% reduction in config lines
- **Error resolution time** - < 2 minutes with contextual help
- **Learning curve** - 90% of users productive within 1 hour

### Adoption Metrics

- **npm downloads** - 10K+ monthly downloads
- **GitHub stars** - 500+ stars within 6 months
- **Community contributions** - 50+ contributors
- **Documentation completeness** - 95% API coverage

### Performance Metrics

- **Inference speed** - Within 10% of native implementations
- **Memory usage** - Efficient tensor management
- **Startup time** - < 2 seconds for first inference
- **Batch processing** - Linear scaling with batch size

## 🚀 Getting Started

### Quick Start

```bash
# Install ImageFlowIO
npm install imageflowio

# Run your first classification
npx imageflowio classify ./model.onnx ./image.jpg

# Or use the JavaScript API
node -e "
const { ImageFlowIO } = require('imageflowio');
const flow = new ImageFlowIO();
flow.classify('./model.onnx', './image.jpg').then(console.log);
"
```

### TypeScript Setup

```bash
# Install with TypeScript support
npm install imageflowio @types/node typescript

# Create tsconfig.json
npx tsc --init

# Use with full type safety
import { ImageFlowIO } from 'imageflowio';
const flow = new ImageFlowIO();
```

This comprehensive improvement plan transforms ImageFlowIO from a complex configuration tool into an intuitive, developer-friendly Node.js library that feels natural in the JavaScript/TypeScript ecosystem.
