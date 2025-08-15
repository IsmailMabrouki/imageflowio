/**
 * ImageFlowIO JavaScript API
 *
 * Provides a developer-friendly interface for ML inference pipelines
 */

import { ImageFlowPipeline } from "./pipeline";
import * as fs from "fs";
import * as path from "path";
import {
  ClassificationResult,
  SegmentationResult,
  DetectionResult,
  EnhancementResult,
  ClassificationOptions,
  SegmentationOptions,
  DetectionOptions,
  EnhancementOptions,
  BatchOptions,
  ModelInfo,
  AutoConfigOptions,
  GeneratedConfig,
  ApiPreprocessingConfig,
  ApiOutputConfig,
  ApiRunOptions,
  ModelType,
  BackendType,
} from "./types/api";

export class ImageFlowIO {
  private defaultPreprocessing: ApiPreprocessingConfig = {};
  private defaultOutput: ApiOutputConfig = {};

  constructor() {
    // Initialize with smart defaults
  }

  /**
   * Set default preprocessing configuration
   */
  setPreprocessing(config: ApiPreprocessingConfig): void {
    this.defaultPreprocessing = { ...this.defaultPreprocessing, ...config };
  }

  /**
   * Set default output configuration
   */
  setOutput(config: ApiOutputConfig): void {
    this.defaultOutput = { ...this.defaultOutput, ...config };
  }

  /**
   * Classify an image using a classification model
   */
  async classify(
    options: ClassificationOptions
  ): Promise<ClassificationResult> {
    const config = this.generateClassificationConfig(options);
    const result = await this.runPipeline(config, options.imagePath);

    return this.processClassificationResult(result, options);
  }

  /**
   * Segment an image using a segmentation model
   */
  async segment(options: SegmentationOptions): Promise<SegmentationResult> {
    const config = this.generateSegmentationConfig(options);
    const result = await this.runPipeline(config, options.imagePath);

    return this.processSegmentationResult(result, options);
  }

  /**
   * Detect objects in an image using a detection model
   */
  async detect(options: DetectionOptions): Promise<DetectionResult> {
    const config = this.generateDetectionConfig(options);
    const result = await this.runPipeline(config, options.imagePath);

    return this.processDetectionResult(result, options);
  }

  /**
   * Enhance an image using an image-to-image model
   */
  async enhance(options: EnhancementOptions): Promise<EnhancementResult> {
    const config = this.generateEnhancementConfig(options);
    const result = await this.runPipeline(config, options.imagePath);

    return this.processEnhancementResult(result, options);
  }

  /**
   * Process multiple images in batch
   */
  async batchClassify(options: BatchOptions): Promise<ClassificationResult[]> {
    const config = this.generateClassificationConfig(options);
    return this.runBatchPipeline(config, options);
  }

  /**
   * Auto-generate configuration based on model analysis
   */
  async autoGenerateConfig(
    options: AutoConfigOptions
  ): Promise<GeneratedConfig> {
    const modelInfo = await this.analyzeModel(options.modelPath);
    const config = this.generateConfigFromModelInfo(modelInfo, options);

    return {
      config,
      modelInfo,
      suggestions: this.generateSuggestions(modelInfo, options),
    };
  }

  /**
   * Run with custom configuration
   */
  async run(options: ApiRunOptions): Promise<any> {
    let config = options.customConfig;

    if (!config) {
      config = this.generateBaseConfig(options);
      if (options.configOverrides) {
        config = this.applyConfigOverrides(config, options.configOverrides);
      }
    }

    return this.runPipeline(config, options.imagePath);
  }

  /**
   * Analyze model to determine type and characteristics
   */
  private async analyzeModel(modelPath: string): Promise<ModelInfo> {
    // Basic model analysis based on file extension and path
    const ext = path.extname(modelPath).toLowerCase();
    const filename = path.basename(modelPath, ext).toLowerCase();

    let type: ModelType = "image-to-image";
    let layout: "nhwc" | "nchw" = "nhwc";

    // Heuristic model type detection
    if (
      filename.includes("class") ||
      filename.includes("resnet") ||
      filename.includes("mobilenet")
    ) {
      type = "classification";
      layout = "nchw";
    } else if (
      filename.includes("detect") ||
      filename.includes("yolo") ||
      filename.includes("ssd")
    ) {
      type = "detection";
      layout = "nhwc";
    } else if (
      filename.includes("seg") ||
      filename.includes("unet") ||
      filename.includes("mask")
    ) {
      type = "segmentation";
      layout = "nhwc";
    }

    return {
      type,
      inputShape: [1, 3, 224, 224], // Default assumption
      outputShape: type === "classification" ? [1, 1000] : [1, 3, 224, 224],
      numClasses: type === "classification" ? 1000 : undefined,
      layout,
    };
  }

  /**
   * Generate classification configuration
   */
  private generateClassificationConfig(options: ClassificationOptions): any {
    const baseConfig = this.generateBaseConfig(options);

    return {
      ...baseConfig,
      preprocessing: {
        ...baseConfig.preprocessing,
        resize: {
          apply: true,
          imageSize: options.resize || [224, 224],
          keepAspectRatio: false,
        },
        normalize: {
          apply: true,
          mean: options.normalize || [0.485, 0.456, 0.406], // ImageNet
          std: options.std || [0.229, 0.224, 0.225],
        },
      },
      output: {
        ...baseConfig.output,
        saveRaw: {
          apply: true,
          format: "npy",
          path: options.outputDir || "./outputs/raw",
        },
        writeMeta: {
          apply: true,
          jsonPath: options.outputPath || "./outputs/predictions.json",
        },
      },
    };
  }

  /**
   * Generate segmentation configuration
   */
  private generateSegmentationConfig(options: SegmentationOptions): any {
    const baseConfig = this.generateBaseConfig(options);

    return {
      ...baseConfig,
      preprocessing: {
        ...baseConfig.preprocessing,
        resize: {
          apply: true,
          imageSize: options.resize || [512, 512],
          keepAspectRatio: true,
        },
        normalize: {
          apply: true,
          mean: options.normalize || [0.5, 0.5, 0.5],
          std: options.std || [0.5, 0.5, 0.5],
        },
      },
      postprocessing: {
        denormalize: {
          apply: true,
          scale: 255,
          dtype: "uint8",
        },
        resizeTo: "input",
        ...(options.colormap && {
          colorMap: {
            apply: true,
            mode: options.colormap,
            channel: 0,
          },
        }),
      },
      output: {
        ...baseConfig.output,
        save: {
          apply: true,
          path: options.outputDir || "./outputs",
          format: "png",
          filename: "segmentation_mask.png",
        },
      },
    };
  }

  /**
   * Generate detection configuration
   */
  private generateDetectionConfig(options: DetectionOptions): any {
    const baseConfig = this.generateBaseConfig(options);

    return {
      ...baseConfig,
      preprocessing: {
        ...baseConfig.preprocessing,
        resize: {
          apply: true,
          imageSize: options.resize || [416, 416],
          keepAspectRatio: true,
        },
        normalize: {
          apply: true,
          mean: options.normalize || [0.5, 0.5, 0.5],
          std: options.std || [0.5, 0.5, 0.5],
        },
      },
      output: {
        ...baseConfig.output,
        saveRaw: {
          apply: true,
          format: "npy",
          path: options.outputDir || "./outputs/raw",
        },
        writeMeta: {
          apply: true,
          jsonPath: options.outputPath || "./outputs/detections.json",
        },
      },
    };
  }

  /**
   * Generate enhancement configuration
   */
  private generateEnhancementConfig(options: EnhancementOptions): any {
    const baseConfig = this.generateBaseConfig(options);

    return {
      ...baseConfig,
      preprocessing: {
        ...baseConfig.preprocessing,
        resize: {
          apply: true,
          imageSize: options.resize || [512, 512],
          keepAspectRatio: true,
        },
        normalize: {
          apply: true,
          mean: options.normalize || [0.5, 0.5, 0.5],
          std: options.std || [0.5, 0.5, 0.5],
        },
      },
      postprocessing: {
        denormalize: {
          apply: true,
          scale: 255,
          dtype: "uint8",
        },
        resizeTo: "input",
      },
      output: {
        ...baseConfig.output,
        save: {
          apply: true,
          path: options.outputDir || "./outputs",
          format: options.format || "png",
          quality: options.quality || 95,
          filename: "enhanced_image.png",
        },
      },
    };
  }

  /**
   * Generate base configuration
   */
  private generateBaseConfig(options: any): any {
    return {
      $schema:
        "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
      model: {
        name: "api-generated",
        path: options.modelPath,
        layout: "nhwc",
      },
      execution: {
        backend: options.backend || "auto",
        threads: {
          apply: true,
          count: options.threads || "auto",
        },
        warmupRuns: options.warmupRuns || 2,
        useCaching: options.useCaching || false,
        ...(options.cacheDir && { cacheDir: options.cacheDir }),
      },
      input: {
        type: "image",
        source: options.imagePath,
      },
      preprocessing: {
        ...this.defaultPreprocessing,
        format: {
          dataType: "float32",
          channels: 3,
          channelOrder: "rgb",
        },
      },
      inference: {
        batchSize: options.batchSize || 1,
      },
      logging: {
        level: options.logLevel || "info",
      },
    };
  }

  /**
   * Run the pipeline with given configuration
   */
  private async runPipeline(config: any, imagePath: string): Promise<any> {
    const pipeline = new ImageFlowPipeline(config);
    return pipeline.run();
  }

  /**
   * Run batch pipeline
   */
  private async runBatchPipeline(
    config: any,
    options: BatchOptions
  ): Promise<any[]> {
    // Implementation for batch processing
    // This would use the existing CLI batch functionality
    throw new Error("Batch processing not yet implemented in API");
  }

  /**
   * Process classification results
   */
  private processClassificationResult(
    result: any,
    options: ClassificationOptions
  ): ClassificationResult {
    // Process raw output and extract top predictions
    // This is a simplified implementation
    return {
      topPrediction: "unknown",
      confidence: 0.0,
      topK: [],
      rawOutput: result.rawOutput,
      metadata: result.metadata,
    };
  }

  /**
   * Process segmentation results
   */
  private processSegmentationResult(
    result: any,
    options: SegmentationOptions
  ): SegmentationResult {
    return {
      maskPath: result.outputPath || "./outputs/segmentation_mask.png",
      overlayPath: options.overlay ? "./outputs/overlay.png" : undefined,
      rawOutput: result.rawOutput,
      metadata: result.metadata,
    };
  }

  /**
   * Process detection results
   */
  private processDetectionResult(
    result: any,
    options: DetectionOptions
  ): DetectionResult {
    return {
      detections: [],
      rawOutput: result.rawOutput,
      metadata: result.metadata,
    };
  }

  /**
   * Process enhancement results
   */
  private processEnhancementResult(
    result: any,
    options: EnhancementOptions
  ): EnhancementResult {
    return {
      outputPath: result.outputPath || "./outputs/enhanced_image.png",
      rawOutput: result.rawOutput,
      metadata: result.metadata,
    };
  }

  /**
   * Generate configuration from model info
   */
  private generateConfigFromModelInfo(
    modelInfo: ModelInfo,
    options: AutoConfigOptions
  ): any {
    const baseConfig = this.generateBaseConfig(options);

    // Adjust configuration based on model type
    switch (modelInfo.type) {
      case "classification":
        return this.generateClassificationConfig({
          ...options,
          resize: [224, 224],
        });
      case "segmentation":
        return this.generateSegmentationConfig({
          ...options,
          resize: [512, 512],
        });
      case "detection":
        return this.generateDetectionConfig({ ...options, resize: [416, 416] });
      default:
        return this.generateEnhancementConfig({
          ...options,
          resize: [512, 512],
        });
    }
  }

  /**
   * Generate suggestions based on model info
   */
  private generateSuggestions(
    modelInfo: ModelInfo,
    options: AutoConfigOptions
  ): string[] {
    const suggestions: string[] = [];

    if (modelInfo.type === "classification") {
      suggestions.push(
        "Consider using ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]"
      );
      suggestions.push(
        "Set resize to [224, 224] for most classification models"
      );
    }

    if (modelInfo.type === "segmentation") {
      suggestions.push("Enable overlay visualization for better results");
      suggestions.push("Consider using a colormap for visualization");
    }

    return suggestions;
  }

  /**
   * Apply configuration overrides
   */
  private applyConfigOverrides(config: any, overrides: any): any {
    const result = { ...config };

    for (const [key, value] of Object.entries(overrides)) {
      const keys = key.split(".");
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
    }

    return result;
  }
}
