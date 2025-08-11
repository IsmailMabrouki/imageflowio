export type Size2 = [number, number];

export interface ModelConfig {
  name?: string;
  path: string;
}

export interface ExecutionConfig {
  backend?: "auto" | "cpu" | "gpu";
  threads?: { apply?: boolean; count?: number | "auto" };
  warmupRuns?: number;
  useCaching?: boolean;
}

export interface InputConfig {
  type: "image";
  source: string;
  batchSize?: number;
}

export interface ResizeConfig {
  apply?: boolean;
  imageSize?: Size2;
  keepAspectRatio?: boolean;
  resizeMode?: "fit" | "fill" | "crop";
}

export interface CenterCropConfig {
  apply?: boolean;
  size?: Size2;
}

export interface NormalizeConfig {
  apply?: boolean;
  mean?: [number, number, number];
  std?: [number, number, number];
}

export interface FormatConfig {
  dataType?: "float32" | "float16" | "int8" | "uint8";
  channels?: number;
  channelOrder?: "rgb" | "bgr";
}

export interface PreprocessingConfig {
  resize?: ResizeConfig;
  centerCrop?: CenterCropConfig;
  normalize?: NormalizeConfig;
  format?: FormatConfig;
  grayscale?: { apply?: boolean };
}

export interface TilingConfig {
  apply?: boolean;
  tileSize?: Size2;
  overlap?: number;
  padMode?: "reflect" | "edge" | "zero";
  blend?: "feather" | "average" | "max";
}

export interface InferenceConfig {
  batchSize?: number;
  tiling?: TilingConfig;
}

export interface ActivationConfig {
  apply?: boolean;
  type?: "sigmoid" | "tanh" | "none";
}

export interface ClampConfig {
  apply?: boolean;
  min?: number;
  max?: number;
}

export interface DenormalizeConfig {
  apply?: boolean;
  scale?: number;
  dtype?: "uint8" | "float32";
}

export interface ColorMapConfig {
  apply?: boolean;
  mode?: "grayscale" | "magma" | "viridis" | "plasma";
  channel?: number;
}

export interface ToneMapConfig {
  apply?: boolean;
  method?: "aces" | "reinhard" | "filmic";
  exposure?: number;
  gamma?: number;
}

export interface PaletteMapConfig {
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

export interface BlendOverlayConfig {
  apply?: boolean;
  alpha?: number;
}

export interface PostprocessingConfig {
  activation?: ActivationConfig;
  clamp?: ClampConfig;
  denormalize?: DenormalizeConfig;
  resizeTo?: "input" | Size2 | "none";
  colorMap?: ColorMapConfig;
  toneMap?: ToneMapConfig;
  paletteMap?: PaletteMapConfig;
  blendOverlay?: BlendOverlayConfig;
}

export interface SaveConfig {
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

export interface SaveRawConfig {
  apply?: boolean;
  format?: "npy" | "npz" | "bin";
  path?: string;
}

export interface OutputConfig {
  save?: SaveConfig;
  writeMeta?: { apply?: boolean; jsonPath?: string };
  saveRaw?: SaveRawConfig;
}

export interface CustomConfig {
  preprocessingFn?: string;
  postprocessingFn?: string;
}

export interface LoggingConfig {
  level?: "debug" | "info" | "error";
  saveLogs?: boolean;
  logPath?: string;
}

export interface VisualizationConfig {
  apply?: boolean;
  type?: "sideBySide" | "overlay" | "heatmap" | "difference";
  outputPath?: string;
}

export interface ImageFlowConfig {
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
