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

export { ActivationConfig, BackendLoadError, BackendModelConfig, BlendOverlayConfig, CenterCropConfig, ClampConfig, ColorMapConfig, ConfigValidationError, CustomConfig, DenormalizeConfig, ExecutionConfig, FormatConfig, ImageFlowConfig, ImageFlowError, ImageFlowPipeline, InferenceBackend, InferenceConfig, InferenceError, InferenceInput, InferenceOutput, InputConfig, LoggingConfig, ModelConfig, NoopBackend, NormalizeConfig, OnnxBackend, OutputConfig, PaletteMapConfig, PipelineError, PostprocessingConfig, PreprocessingConfig, ResizeConfig, RunOptions, SaveConfig, SaveError, SaveRawConfig, Size2, TfjsBackend, TilingConfig, ToneMapConfig, VisualizationConfig, nchwToNhwc, nhwcToNchw };
