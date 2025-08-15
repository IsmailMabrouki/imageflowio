/**
 * TypeScript interfaces for ImageFlowIO JavaScript API
 */

export type ModelType =
  | "classification"
  | "segmentation"
  | "detection"
  | "image-to-image";
export type BackendType = "auto" | "onnx" | "tfjs" | "noop";
export type OutputFormat = "raw" | "image" | "json" | "metadata";

export interface ClassificationResult {
  topPrediction: string;
  confidence: number;
  topK: Array<{ label: string; confidence: number }>;
  rawOutput?: Float32Array;
  metadata?: any;
}

export interface SegmentationResult {
  maskPath: string;
  overlayPath?: string;
  rawOutput?: Float32Array;
  metadata?: any;
}

export interface DetectionResult {
  detections: Array<{
    label: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
  }>;
  rawOutput?: Float32Array;
  metadata?: any;
}

export interface EnhancementResult {
  outputPath: string;
  rawOutput?: Float32Array;
  metadata?: any;
}

export interface BaseOptions {
  modelPath: string;
  imagePath: string;
  outputPath?: string;
  outputDir?: string;
  backend?: BackendType;
  resize?: [number, number];
  normalize?: [number, number, number]; // mean values
  std?: [number, number, number]; // std values
  batchSize?: number;
  useCaching?: boolean | "memory" | "disk";
  cacheDir?: string;
  warmupRuns?: number;
  threads?: number | "auto";
  logLevel?: "debug" | "info" | "error";
}

export interface ClassificationOptions extends BaseOptions {
  topK?: number;
  labels?: string[];
}

export interface SegmentationOptions extends BaseOptions {
  overlay?: boolean;
  palette?: string | Array<[number, number, number]>;
  colormap?: "viridis" | "magma" | "plasma" | "grayscale";
}

export interface DetectionOptions extends BaseOptions {
  confidence?: number;
  nms?: boolean;
  labels?: string[];
}

export interface EnhancementOptions extends BaseOptions {
  scale?: number;
  quality?: number;
  format?: "png" | "jpeg" | "webp" | "tiff";
}

export interface BatchOptions extends BaseOptions {
  inputDir: string;
  outputDir: string;
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface ModelInfo {
  type: ModelType;
  inputShape: number[];
  outputShape: number[];
  numClasses?: number;
  inputName?: string;
  outputName?: string;
  layout?: "nhwc" | "nchw";
}

export interface AutoConfigOptions {
  modelPath: string;
  imagePath: string;
  modelType?: ModelType;
  outputFormats?: OutputFormat[];
  outputDir?: string;
}

export interface GeneratedConfig {
  config: any;
  modelInfo: ModelInfo;
  suggestions: string[];
}

export interface ApiPreprocessingConfig {
  resize?: {
    apply: boolean;
    imageSize: [number, number];
    keepAspectRatio?: boolean;
  };
  normalize?: {
    apply: boolean;
    mean: [number, number, number];
    std: [number, number, number];
  };
  format?: {
    dataType: "float32" | "uint8";
    channels: number;
    channelOrder: "rgb" | "bgr";
  };
}

export interface ApiOutputConfig {
  saveRaw?: boolean;
  saveImage?: boolean;
  saveMetadata?: boolean;
  outputDir?: string;
}

export interface ApiConfigOverrides {
  [key: string]: any;
}

export interface ApiRunOptions extends BaseOptions {
  configOverrides?: ApiConfigOverrides;
  customConfig?: any;
}
