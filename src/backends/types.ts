export interface InferenceInput {
  data: Float32Array;
  width: number;
  height: number;
  channels: number;
}

export interface InferenceOutput {
  data: Float32Array;
  width: number;
  height: number;
  channels: number;
}

export interface InferenceBackend {
  name: string;
  loadModel(modelPath: string): Promise<void>;
  infer(input: InferenceInput): Promise<InferenceOutput>;
  dispose?(): Promise<void> | void;
}
