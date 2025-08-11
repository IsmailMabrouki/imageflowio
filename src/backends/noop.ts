import { InferenceBackend, InferenceInput, InferenceOutput } from "./types";

export class NoopBackend implements InferenceBackend {
  name = "noop";
  async loadModel(_modelPath: string): Promise<void> {
    return;
  }
  async infer(input: InferenceInput): Promise<InferenceOutput> {
    // Identity passthrough
    return {
      data: input.data,
      width: input.width,
      height: input.height,
      channels: Math.max(1, Math.min(4, input.channels)) as 1 | 2 | 3 | 4,
    };
  }
}
