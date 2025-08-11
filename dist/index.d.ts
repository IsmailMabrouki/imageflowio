type Size2 = [number, number];
interface ModelConfig {
    name?: string;
    path: string;
}
interface ExecutionConfig {
    backend?: "auto" | "cpu" | "gpu";
    threads?: {
        apply?: boolean;
        count?: number | "auto";
    };
    warmupRuns?: number;
    useCaching?: boolean;
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
    bitDepth?: 8 | 16 | 32;
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
    backend?: "auto" | "onnx" | "noop";
    threads?: number | "auto";
};
declare class ImageFlowPipeline {
    private readonly config;
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
}
interface InferenceOutput {
    data: Float32Array;
    width: number;
    height: number;
    channels: number;
}
interface InferenceBackend {
    name: string;
    loadModel(modelPath: string): Promise<void>;
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

export { ActivationConfig, BackendLoadError, BlendOverlayConfig, CenterCropConfig, ClampConfig, ColorMapConfig, ConfigValidationError, CustomConfig, DenormalizeConfig, ExecutionConfig, FormatConfig, ImageFlowConfig, ImageFlowError, ImageFlowPipeline, InferenceBackend, InferenceConfig, InferenceError, InferenceInput, InferenceOutput, InputConfig, LoggingConfig, ModelConfig, NormalizeConfig, OutputConfig, PaletteMapConfig, PipelineError, PostprocessingConfig, PreprocessingConfig, ResizeConfig, RunOptions, SaveConfig, SaveRawConfig, Size2, TilingConfig, ToneMapConfig, VisualizationConfig };
