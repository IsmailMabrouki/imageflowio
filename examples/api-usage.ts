/**
 * ImageFlowIO TypeScript API Usage Examples
 *
 * This file demonstrates how to use the ImageFlowIO TypeScript API
 * with full type safety and IntelliSense support.
 */

import {
  ImageFlowIO,
  ClassificationResult,
  SegmentationResult,
  DetectionResult,
  EnhancementResult,
} from "imageflowio";

async function main(): Promise<void> {
  // Initialize the ImageFlowIO instance
  const flow = new ImageFlowIO();

  console.log("🚀 ImageFlowIO TypeScript API Examples\n");

  // Example 1: Type-safe Classification
  console.log("1. Type-safe Classification:");
  try {
    const classificationResult: ClassificationResult = await flow.classify({
      modelPath: "./models/mobilenetv2.onnx",
      imagePath: "./images/sample.jpg",
      outputPath: "./results/classification.json",
      topK: 5,
      backend: "onnx",
      useCaching: "memory",
    });

    console.log(`   Top prediction: ${classificationResult.topPrediction}`);
    console.log(`   Confidence: ${classificationResult.confidence.toFixed(2)}`);
    console.log(`   Top ${classificationResult.topK.length} predictions:`);
    classificationResult.topK.forEach((pred, index) => {
      console.log(
        `   ${index + 1}. ${pred.label} (${pred.confidence.toFixed(2)})`
      );
    });
    console.log("   ✅ Classification completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Classification failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  // Example 2: Type-safe Segmentation
  console.log("2. Type-safe Segmentation:");
  try {
    const segmentationResult: SegmentationResult = await flow.segment({
      modelPath: "./models/unet.onnx",
      imagePath: "./images/sample.jpg",
      outputDir: "./results/segmentation",
      resize: [512, 512] as [number, number],
      overlay: true,
      colormap: "viridis",
      normalize: [0.5, 0.5, 0.5] as [number, number, number],
      std: [0.5, 0.5, 0.5] as [number, number, number],
    });

    console.log(`   Mask saved to: ${segmentationResult.maskPath}`);
    if (segmentationResult.overlayPath) {
      console.log(`   Overlay saved to: ${segmentationResult.overlayPath}`);
    }
    console.log("   ✅ Segmentation completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Segmentation failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  // Example 3: Type-safe Object Detection
  console.log("3. Type-safe Object Detection:");
  try {
    const detectionResult: DetectionResult = await flow.detect({
      modelPath: "./models/yolo.onnx",
      imagePath: "./images/sample.jpg",
      outputPath: "./results/detections.json",
      confidence: 0.5,
      resize: [416, 416] as [number, number],
      nms: true,
      labels: ["person", "car", "dog", "cat"],
    });

    console.log(`   Found ${detectionResult.detections.length} objects`);
    detectionResult.detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;
      console.log(
        `   ${index + 1}. ${detection.label} (${detection.confidence.toFixed(
          2
        )}) at [${x}, ${y}, ${width}, ${height}]`
      );
    });
    console.log("   ✅ Detection completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Detection failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  // Example 4: Type-safe Image Enhancement
  console.log("4. Type-safe Image Enhancement:");
  try {
    const enhancementResult: EnhancementResult = await flow.enhance({
      modelPath: "./models/super-resolution.onnx",
      imagePath: "./images/sample.jpg",
      outputDir: "./results/enhanced",
      scale: 2,
      quality: 95,
      format: "png",
      backend: "onnx",
      warmupRuns: 3,
    });

    console.log(`   Enhanced image saved to: ${enhancementResult.outputPath}`);
    console.log("   ✅ Enhancement completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Enhancement failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  // Example 5: Advanced Configuration with Type Safety
  console.log("5. Advanced Configuration with Type Safety:");
  try {
    // Set default preprocessing with type safety
    flow.setPreprocessing({
      resize: {
        apply: true,
        imageSize: [224, 224] as [number, number],
        keepAspectRatio: false,
      },
      normalize: {
        apply: true,
        mean: [0.485, 0.456, 0.406] as [number, number, number],
        std: [0.229, 0.224, 0.225] as [number, number, number],
      },
      format: {
        dataType: "float32",
        channels: 3,
        channelOrder: "rgb",
      },
    });

    // Set default output with type safety
    flow.setOutput({
      saveRaw: true,
      saveImage: true,
      saveMetadata: true,
      outputDir: "./results/custom",
    });

    const customResult = await flow.run({
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

    console.log("   Custom pipeline completed successfully");
    console.log("   ✅ Advanced configuration completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Advanced configuration failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  // Example 6: Auto-Config Generation with Type Safety
  console.log("6. Auto-Config Generation with Type Safety:");
  try {
    const generatedConfig = await flow.autoGenerateConfig({
      modelPath: "./models/unknown-model.onnx",
      imagePath: "./images/sample.jpg",
      modelType: "classification",
      outputFormats: ["raw", "json"],
      outputDir: "./results/auto",
    });

    console.log(`   Detected model type: ${generatedConfig.modelInfo.type}`);
    console.log(
      `   Input shape: [${generatedConfig.modelInfo.inputShape.join(", ")}]`
    );
    console.log(
      `   Output shape: [${generatedConfig.modelInfo.outputShape.join(", ")}]`
    );
    console.log(`   Layout: ${generatedConfig.modelInfo.layout}`);
    if (generatedConfig.modelInfo.numClasses) {
      console.log(
        `   Number of classes: ${generatedConfig.modelInfo.numClasses}`
      );
    }
    console.log("   Suggestions:");
    generatedConfig.suggestions.forEach((suggestion) => {
      console.log(`   - ${suggestion}`);
    });
    console.log("   ✅ Auto-config generation completed successfully\n");
  } catch (error) {
    console.log(
      `   ❌ Auto-config generation failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }

  console.log("🎉 All TypeScript examples completed!");
}

// Run the examples
main().catch(console.error);
