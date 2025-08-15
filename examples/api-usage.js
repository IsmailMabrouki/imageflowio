/**
 * ImageFlowIO JavaScript API Usage Examples
 *
 * This file demonstrates how to use the ImageFlowIO JavaScript API
 * for various ML inference tasks.
 */

const { ImageFlowIO } = require("imageflowio");

async function main() {
  // Initialize the ImageFlowIO instance
  const flow = new ImageFlowIO();

  console.log("🚀 ImageFlowIO JavaScript API Examples\n");

  // Example 1: Simple Classification
  console.log("1. Simple Classification:");
  try {
    const classificationResult = await flow.classify({
      modelPath: "./models/mobilenetv2.onnx",
      imagePath: "./images/sample.jpg",
      outputPath: "./results/classification.json",
      topK: 5,
    });

    console.log(`   Top prediction: ${classificationResult.topPrediction}`);
    console.log(`   Confidence: ${classificationResult.confidence.toFixed(2)}`);
    console.log("   ✅ Classification completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Classification failed: ${error.message}\n`);
  }

  // Example 2: Segmentation with Custom Options
  console.log("2. Segmentation with Custom Options:");
  try {
    const segmentationResult = await flow.segment({
      modelPath: "./models/unet.onnx",
      imagePath: "./images/sample.jpg",
      outputDir: "./results/segmentation",
      resize: [512, 512],
      overlay: true,
      colormap: "viridis",
    });

    console.log(`   Mask saved to: ${segmentationResult.maskPath}`);
    if (segmentationResult.overlayPath) {
      console.log(`   Overlay saved to: ${segmentationResult.overlayPath}`);
    }
    console.log("   ✅ Segmentation completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Segmentation failed: ${error.message}\n`);
  }

  // Example 3: Object Detection
  console.log("3. Object Detection:");
  try {
    const detectionResult = await flow.detect({
      modelPath: "./models/yolo.onnx",
      imagePath: "./images/sample.jpg",
      outputPath: "./results/detections.json",
      confidence: 0.5,
      resize: [416, 416],
    });

    console.log(`   Found ${detectionResult.detections.length} objects`);
    detectionResult.detections.forEach((detection, index) => {
      console.log(
        `   ${index + 1}. ${detection.label} (${detection.confidence.toFixed(
          2
        )})`
      );
    });
    console.log("   ✅ Detection completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Detection failed: ${error.message}\n`);
  }

  // Example 4: Image Enhancement
  console.log("4. Image Enhancement:");
  try {
    const enhancementResult = await flow.enhance({
      modelPath: "./models/super-resolution.onnx",
      imagePath: "./images/sample.jpg",
      outputDir: "./results/enhanced",
      scale: 2,
      quality: 95,
      format: "png",
    });

    console.log(`   Enhanced image saved to: ${enhancementResult.outputPath}`);
    console.log("   ✅ Enhancement completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Enhancement failed: ${error.message}\n`);
  }

  // Example 5: Custom Configuration
  console.log("5. Custom Configuration:");
  try {
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
      outputDir: "./results/custom",
    });

    const customResult = await flow.run({
      modelPath: "./models/custom-model.onnx",
      imagePath: "./images/sample.jpg",
      backend: "onnx",
      useCaching: "memory",
      warmupRuns: 3,
      configOverrides: {
        "inference.batchSize": 4,
        "execution.threads.count": 8,
      },
    });

    console.log("   Custom pipeline completed successfully");
    console.log("   ✅ Custom configuration completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Custom configuration failed: ${error.message}\n`);
  }

  // Example 6: Auto-Config Generation
  console.log("6. Auto-Config Generation:");
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
    console.log("   Suggestions:");
    generatedConfig.suggestions.forEach((suggestion) => {
      console.log(`   - ${suggestion}`);
    });
    console.log("   ✅ Auto-config generation completed successfully\n");
  } catch (error) {
    console.log(`   ❌ Auto-config generation failed: ${error.message}\n`);
  }

  console.log("🎉 All examples completed!");
}

// Run the examples
main().catch(console.error);
