export interface InferenceInput {
  data: Float32Array;
  width: number;
  height: number;
  channels: number;
  layout?: "nhwc" | "nchw";
  inputName?: string; // Optional input tensor name for backends that support it
}

export interface InferenceOutput {
  data: Float32Array;
  width: number;
  height: number;
  channels: number;
  layout?: "nhwc" | "nchw";
  outputName?: string; // Optional output tensor name for backends that support it
}

export interface BackendModelConfig {
  path: string;
  layout?: "nhwc" | "nchw";
  inputName?: string;
  outputName?: string;
  // Future: add model-specific configuration options
  // inputShape?: number[];
  // outputShape?: number[];
  // quantization?: "int8" | "float16" | "float32";
}

export interface InferenceBackend {
  name: string;
  loadModel(config: BackendModelConfig): Promise<void>;
  infer(input: InferenceInput): Promise<InferenceOutput>;
  dispose?(): Promise<void> | void;
  // Future: add capabilities interface
  // getCapabilities?(): BackendCapabilities;
}

// Future: define backend capabilities for feature detection
// export interface BackendCapabilities {
//   supportsTiling?: boolean;
//   supportsQuantization?: boolean;
//   maxInputSize?: number;
//   supportedDataTypes?: ("float32" | "float16" | "int8")[];
// }
