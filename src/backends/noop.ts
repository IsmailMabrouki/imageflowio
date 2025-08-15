import {
  InferenceBackend,
  InferenceInput,
  InferenceOutput,
  BackendModelConfig,
} from "./types";

export class NoopBackend implements InferenceBackend {
  name = "noop";
  private modelConfig: BackendModelConfig | null = null;

  async loadModel(config: BackendModelConfig): Promise<void> {
    this.modelConfig = config;
    // No-op backend doesn't actually load anything
  }

  async infer(input: InferenceInput): Promise<InferenceOutput> {
    // Identity transform: return input as output
    return {
      data: input.data,
      width: input.width,
      height: input.height,
      channels: input.channels,
      layout: input.layout,
    };
  }
}
