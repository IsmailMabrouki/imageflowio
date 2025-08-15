import {
  InferenceBackend,
  InferenceInput,
  InferenceOutput,
  BackendModelConfig,
} from "./types";
import { nchwToNhwc } from "../utils/tensor";
import path from "path";
import fs from "fs";

export class TfjsBackend implements InferenceBackend {
  name = "tfjs";
  private model: any | null = null;
  private tf: any | null = null;
  private modelConfig: BackendModelConfig | null = null;

  async loadModel(config: BackendModelConfig): Promise<void> {
    this.modelConfig = config;
    try {
      // Try tfjs-node first (faster), fall back to tfjs
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.tf = require("@tensorflow/tfjs-node");
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.tf = require("@tensorflow/tfjs");
      }
      const tf = this.tf;

      // Check if model path is a directory containing model.json
      const modelPath = config.path;
      const modelJsonPath = path.join(modelPath, "model.json");

      if (fs.existsSync(modelJsonPath)) {
        // Load as Graph model
        this.model = await tf.loadGraphModel(`file://${modelPath}`);
      } else {
        // Try as Layers model
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
      }
    } catch (err) {
      const msg = String(err);
      if (/Cannot find module '@tensorflow\/tfjs/i.test(msg)) {
        throw new Error(
          "Failed to load TensorFlow.js backend. Install '@tensorflow/tfjs-node' or '@tensorflow/tfjs' to use the TFJS backend."
        );
      }
      throw new Error(
        `Failed to load TFJS model at ${config.path}. Install '@tensorflow/tfjs-node' or '@tensorflow/tfjs' to use the TFJS backend. Underlying error: ${msg}`
      );
    }
  }

  async infer(input: InferenceInput): Promise<InferenceOutput> {
    if (!this.model || !this.tf) throw new Error("TFJS model not initialized");
    if (!this.modelConfig) throw new Error("TFJS model configuration not set");

    const tf = this.tf;
    const layout = input.layout || this.modelConfig.layout || "nhwc";

    // Convert input to tensor
    const shape =
      layout === "nchw"
        ? [1, input.channels, input.height, input.width]
        : [1, input.height, input.width, input.channels];

    const tensor = tf.tensor(input.data, shape);

    // Run inference
    const result = await this.model.predict(tensor);

    // Convert output back to Float32Array
    const outputData = await result.array();
    const flatOutput = new Float32Array(outputData.flat(3));

    // Clean up tensors
    tensor.dispose();
    result.dispose();

    // Parse output dimensions
    const outputShape = result.shape;
    let width = input.width;
    let height = input.height;
    let channels = input.channels;

    if (outputShape.length === 4) {
      const [batch, dim1, dim2, dim3] = outputShape;
      if (batch === 1) {
        if (layout === "nchw") {
          channels = dim1;
          height = dim2;
          width = dim3;
        } else {
          height = dim1;
          width = dim2;
          channels = dim3;
        }
      }
    }

    return {
      data: flatOutput,
      width,
      height,
      channels: Math.max(1, Math.min(4, channels)) as 1 | 2 | 3 | 4,
      layout,
    };
  }

  async dispose(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}
