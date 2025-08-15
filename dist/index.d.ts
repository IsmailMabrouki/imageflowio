type Size2 = [number, number];
interface ModelConfig {
    name?: string;
    path: string;
    layout?: "nhwc" | "nchw";
    inputName?: string;
    outputName?: string;
}
interface ExecutionConfig {
    backend?: "auto" | "onnx" | "noop" | "tfjs";
    threads?: {
        apply?: boolean;
        count?: number | "auto";
    };
    warmupRuns?: number;
    useCaching?: boolean | "memory" | "disk";
    cacheDir?: string;
}
interface InputConfig {
    type: "image";
    source: string;
    batchSize?: number;
}
interface ResizeConfig {
    apply?: boolean;
    imageSize?: Size2;
    keepAspectRatio?: boolean;
    resizeMode?: "fit" | "fill" | "crop";
}
interface CenterCropConfig {
    apply?: boolean;
    size?: Size2;
}
interface NormalizeConfig {
    apply?: boolean;
    mean?: [number, number, number];
    std?: [number, number, number];
}
interface FormatConfig {
    dataType?: "float32" | "float16" | "int8" | "uint8";
    channels?: number;
    channelOrder?: "rgb" | "bgr";
}
interface PreprocessingConfig {
    resize?: ResizeConfig;
    centerCrop?: CenterCropConfig;
    normalize?: NormalizeConfig;
    format?: FormatConfig;
    grayscale?: {
        apply?: boolean;
    };
    augmentations?: {
        apply?: boolean;
        methods?: Array<"flip" | "rotate" | "colorJitter">;
        params?: {
            flip?: {
                axis?: "horizontal" | "vertical";
                direction?: "horizontal" | "vertical";
            };
            rotate?: {
                angle?: 0 | 90 | 180 | 270 | number;
            };
            colorJitter?: {
                brightness?: number;
                saturation?: number;
                hue?: number;
            };
        };
    };
}
interface TilingConfig {
    apply?: boolean;
    tileSize?: Size2;
    overlap?: number;
    padMode?: "reflect" | "edge" | "zero";
    blend?: "feather" | "average" | "max";
}
interface InferenceConfig {
    batchSize?: number;
    tiling?: TilingConfig;
}
interface ActivationConfig {
    apply?: boolean;
    type?: "sigmoid" | "tanh" | "none";
}
interface ClampConfig {
    apply?: boolean;
    min?: number;
    max?: number;
}
interface DenormalizeConfig {
    apply?: boolean;
    scale?: number;
    dtype?: "uint8" | "float32";
}
interface ColorMapConfig {
    apply?: boolean;
    mode?: "grayscale" | "magma" | "viridis" | "plasma";
    channel?: number;
}
interface ToneMapConfig {
    apply?: boolean;
    method?: "aces" | "reinhard" | "filmic";
    exposure?: number;
    gamma?: number;
}
interface PaletteMapConfig {
    apply?: boolean;
    source?: "argmax" | "channel";
    channel?: number;
    palette?: {
        mode: "preset" | "file" | "inline";
        preset?: string;
        file?: string;
        inline?: [number, number, number][];
    };
    outline?: {
        apply?: boolean;
        color?: [number, number, number];
        thickness?: number;
    };
}
interface BlendOverlayConfig {
    apply?: boolean;
    alpha?: number;
}
interface PostprocessingConfig {
    activation?: ActivationConfig;
    clamp?: ClampConfig;
    denormalize?: DenormalizeConfig;
    resizeTo?: "input" | Size2 | "none";
    colorMap?: ColorMapConfig;
    toneMap?: ToneMapConfig;
    paletteMap?: PaletteMapConfig;
    blendOverlay?: BlendOverlayConfig;
}
interface SaveConfig {
    apply?: boolean;
    path?: string;
    format?: "png" | "jpeg" | "webp" | "tiff";
    bitDepth?: 1 | 2 | 4 | 8 | 16;
    colorSpace?: "srgb" | "linear";
    linearToSRGB?: boolean;
    splitChannels?: boolean;
    channelNames?: string[];
    filename?: string;
    quality?: number;
}
interface SaveRawConfig {
    apply?: boolean;
    format?: "npy" | "npz" | "bin";
    dtype?: "uint8" | "float32";
    path?: string;
}
interface OutputConfig {
    save?: SaveConfig;
    writeMeta?: {
        apply?: boolean;
        jsonPath?: string;
    };
    saveRaw?: SaveRawConfig;
}
interface CustomConfig {
    preprocessingFn?: string;
    postprocessingFn?: string;
}
interface LoggingConfig {
    level?: "debug" | "info" | "error";
    saveLogs?: boolean;
    logPath?: string;
}
interface VisualizationConfig {
    apply?: boolean;
    type?: "sideBySide" | "overlay" | "heatmap" | "difference";
    outputPath?: string;
    alpha?: number;
}
interface ImageFlowConfig {
    model: ModelConfig;
    execution?: ExecutionConfig;
    input: InputConfig;
    preprocessing?: PreprocessingConfig;
    inference?: InferenceConfig;
    postprocessing?: PostprocessingConfig;
    output?: OutputConfig;
    custom?: CustomConfig;
    logging?: LoggingConfig;
    visualization?: VisualizationConfig;
}

type RunOptions = {
    backend?: "auto" | "onnx" | "noop" | "tfjs";
    threads?: number | "auto";
};
declare class ImageFlowPipeline {
    private readonly config;
    private static preprocCache;
    constructor(config: ImageFlowConfig);
    run(options?: RunOptions): Promise<{
        outputPath?: string;
    }>;
}

interface InferenceInput {
    data: Float32Array;
    width: number;
    height: number;
    channels: number;
    layout?: "nhwc" | "nchw";
    inputName?: string;
}
interface InferenceOutput {
    data: Float32Array;
    width: number;
    height: number;
    channels: number;
    layout?: "nhwc" | "nchw";
    outputName?: string;
}
interface BackendModelConfig {
    path: string;
    layout?: "nhwc" | "nchw";
    inputName?: string;
    outputName?: string;
}
interface InferenceBackend {
    name: string;
    loadModel(config: BackendModelConfig): Promise<void>;
    infer(input: InferenceInput): Promise<InferenceOutput>;
    dispose?(): Promise<void> | void;
}

declare class ImageFlowError extends Error {
    constructor(message: string);
}
declare class ConfigValidationError extends ImageFlowError {
}
declare class PipelineError extends ImageFlowError {
}
declare class BackendLoadError extends ImageFlowError {
}
declare class InferenceError extends ImageFlowError {
}
declare class SaveError extends ImageFlowError {
}

declare class NoopBackend implements InferenceBackend {
    name: string;
    private modelConfig;
    loadModel(config: BackendModelConfig): Promise<void>;
    infer(input: InferenceInput): Promise<InferenceOutput>;
}

declare class OnnxBackend implements InferenceBackend {
    name: string;
    private session;
    private ort;
    private modelConfig;
    private static sessionCache;
    loadModel(config: BackendModelConfig): Promise<void>;
    infer(input: InferenceInput): Promise<InferenceOutput>;
    dispose(): Promise<void>;
}

declare class TfjsBackend implements InferenceBackend {
    name: string;
    private model;
    private tf;
    private modelConfig;
    loadModel(config: BackendModelConfig): Promise<void>;
    infer(input: InferenceInput): Promise<InferenceOutput>;
    dispose(): Promise<void>;
}

declare function nhwcToNchw(data: Float32Array, width: number, height: number, channels: number): Float32Array;
declare function nchwToNhwc(data: Float32Array, width: number, height: number, channels: number): Float32Array;

/**
 * TypeScript interfaces for ImageFlowIO JavaScript API
 */
type ModelType = "classification" | "segmentation" | "detection" | "image-to-image";
type BackendType = "auto" | "onnx" | "tfjs" | "noop";
type OutputFormat = "raw" | "image" | "json" | "metadata";
interface ClassificationResult {
    topPrediction: string;
    confidence: number;
    topK: Array<{
        label: string;
        confidence: number;
    }>;
    rawOutput?: Float32Array;
    metadata?: any;
}
interface SegmentationResult {
    maskPath: string;
    overlayPath?: string;
    rawOutput?: Float32Array;
    metadata?: any;
}
interface DetectionResult {
    detections: Array<{
        label: string;
        confidence: number;
        bbox: [number, number, number, number];
    }>;
    rawOutput?: Float32Array;
    metadata?: any;
}
interface EnhancementResult {
    outputPath: string;
    rawOutput?: Float32Array;
    metadata?: any;
}
interface BaseOptions {
    modelPath: string;
    imagePath: string;
    outputPath?: string;
    outputDir?: string;
    backend?: BackendType;
    resize?: [number, number];
    normalize?: [number, number, number];
    std?: [number, number, number];
    batchSize?: number;
    useCaching?: boolean | "memory" | "disk";
    cacheDir?: string;
    warmupRuns?: number;
    threads?: number | "auto";
    logLevel?: "debug" | "info" | "error";
}
interface ClassificationOptions extends BaseOptions {
    topK?: number;
    labels?: string[];
}
interface SegmentationOptions extends BaseOptions {
    overlay?: boolean;
    palette?: string | Array<[number, number, number]>;
    colormap?: "viridis" | "magma" | "plasma" | "grayscale";
}
interface DetectionOptions extends BaseOptions {
    confidence?: number;
    nms?: boolean;
    labels?: string[];
}
interface EnhancementOptions extends BaseOptions {
    scale?: number;
    quality?: number;
    format?: "png" | "jpeg" | "webp" | "tiff";
}
interface BatchOptions extends BaseOptions {
    inputDir: string;
    outputDir: string;
    concurrency?: number;
    onProgress?: (processed: number, total: number) => void;
}
interface ModelInfo {
    type: ModelType;
    inputShape: number[];
    outputShape: number[];
    numClasses?: number;
    inputName?: string;
    outputName?: string;
    layout?: "nhwc" | "nchw";
}
interface AutoConfigOptions {
    modelPath: string;
    imagePath: string;
    modelType?: ModelType;
    outputFormats?: OutputFormat[];
    outputDir?: string;
}
interface GeneratedConfig {
    config: any;
    modelInfo: ModelInfo;
    suggestions: string[];
}
interface ApiPreprocessingConfig {
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
interface ApiOutputConfig {
    saveRaw?: boolean;
    saveImage?: boolean;
    saveMetadata?: boolean;
    outputDir?: string;
}
interface ApiConfigOverrides {
    [key: string]: any;
}
interface ApiRunOptions extends BaseOptions {
    configOverrides?: ApiConfigOverrides;
    customConfig?: any;
}

/**
 * ImageFlowIO JavaScript API
 *
 * Provides a developer-friendly interface for ML inference pipelines
 */

declare class ImageFlowIO {
    private defaultPreprocessing;
    private defaultOutput;
    constructor();
    /**
     * Set default preprocessing configuration
     */
    setPreprocessing(config: ApiPreprocessingConfig): void;
    /**
     * Set default output configuration
     */
    setOutput(config: ApiOutputConfig): void;
    /**
     * Classify an image using a classification model
     */
    classify(options: ClassificationOptions): Promise<ClassificationResult>;
    /**
     * Segment an image using a segmentation model
     */
    segment(options: SegmentationOptions): Promise<SegmentationResult>;
    /**
     * Detect objects in an image using a detection model
     */
    detect(options: DetectionOptions): Promise<DetectionResult>;
    /**
     * Enhance an image using an image-to-image model
     */
    enhance(options: EnhancementOptions): Promise<EnhancementResult>;
    /**
     * Process multiple images in batch
     */
    batchClassify(options: BatchOptions): Promise<ClassificationResult[]>;
    /**
     * Auto-generate configuration based on model analysis
     */
    autoGenerateConfig(options: AutoConfigOptions): Promise<GeneratedConfig>;
    /**
     * Run with custom configuration
     */
    run(options: ApiRunOptions): Promise<any>;
    /**
     * Analyze model to determine type and characteristics
     */
    private analyzeModel;
    /**
     * Generate classification configuration
     */
    private generateClassificationConfig;
    /**
     * Generate segmentation configuration
     */
    private generateSegmentationConfig;
    /**
     * Generate detection configuration
     */
    private generateDetectionConfig;
    /**
     * Generate enhancement configuration
     */
    private generateEnhancementConfig;
    /**
     * Generate base configuration
     */
    private generateBaseConfig;
    /**
     * Run the pipeline with given configuration
     */
    private runPipeline;
    /**
     * Run batch pipeline
     */
    private runBatchPipeline;
    /**
     * Process classification results
     */
    private processClassificationResult;
    /**
     * Process segmentation results
     */
    private processSegmentationResult;
    /**
     * Process detection results
     */
    private processDetectionResult;
    /**
     * Process enhancement results
     */
    private processEnhancementResult;
    /**
     * Generate configuration from model info
     */
    private generateConfigFromModelInfo;
    /**
     * Generate suggestions based on model info
     */
    private generateSuggestions;
    /**
     * Apply configuration overrides
     */
    private applyConfigOverrides;
}

export { ActivationConfig, ApiConfigOverrides, ApiOutputConfig, ApiPreprocessingConfig, ApiRunOptions, AutoConfigOptions, BackendLoadError, BackendModelConfig, BackendType, BaseOptions, BatchOptions, BlendOverlayConfig, CenterCropConfig, ClampConfig, ClassificationOptions, ClassificationResult, ColorMapConfig, ConfigValidationError, CustomConfig, DenormalizeConfig, DetectionOptions, DetectionResult, EnhancementOptions, EnhancementResult, ExecutionConfig, FormatConfig, GeneratedConfig, ImageFlowConfig, ImageFlowError, ImageFlowIO, ImageFlowPipeline, InferenceBackend, InferenceConfig, InferenceError, InferenceInput, InferenceOutput, InputConfig, LoggingConfig, ModelConfig, ModelInfo, ModelType, NoopBackend, NormalizeConfig, OnnxBackend, OutputConfig, OutputFormat, PaletteMapConfig, PipelineError, PostprocessingConfig, PreprocessingConfig, ResizeConfig, RunOptions, SaveConfig, SaveError, SaveRawConfig, SegmentationOptions, SegmentationResult, Size2, TfjsBackend, TilingConfig, ToneMapConfig, VisualizationConfig, nchwToNhwc, nhwcToNchw };
