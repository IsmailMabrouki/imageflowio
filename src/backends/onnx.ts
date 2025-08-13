import { InferenceBackend, InferenceInput, InferenceOutput } from "./types";
import { nhwcToNchw, nchwToNhwc } from "../utils/tensor";

export class OnnxBackend implements InferenceBackend {
  name = "onnxruntime-node";
  private session: any | null = null;
  private ort: any | null = null;
  private static sessionCache: Map<string, any> = new Map();

  async loadModel(modelPath: string): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency at install time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // Use require here to avoid TS type resolution when package isn't installed
      // and to keep this optional.
      // @ts-ignore
      this.ort = require("onnxruntime-node");
      const ort = this.ort;
      const cached = OnnxBackend.sessionCache.get(modelPath);
      if (cached) {
        this.session = cached;
        return;
      }
      this.session = await ort.InferenceSession.create(modelPath);
      OnnxBackend.sessionCache.set(modelPath, this.session);
    } catch (err) {
      throw new Error(
        `Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend. Underlying error: ${String(
          err
        )}`
      );
    }
  }

  async infer(input: InferenceInput): Promise<InferenceOutput> {
    if (!this.session || !this.ort)
      throw new Error("ONNX session not initialized");
    const ort = this.ort;
    const layout = input.layout || "nhwc";
    const isNchw = layout === "nchw";
    const nhwcShape = [1, input.height, input.width, input.channels];
    const nchwShape = [1, input.channels, input.height, input.width];
    const tensorData: Float32Array = isNchw
      ? nhwcToNchw(input.data, input.width, input.height, input.channels)
      : input.data;
    const tensorShape = isNchw ? nchwShape : nhwcShape;
    const tensor = new ort.Tensor("float32", tensorData, tensorShape);

    const inputName = (this.session as any).inputNames?.[0] ?? "input";
    const feeds: Record<string, any> = {};
    feeds[inputName] = tensor;
    const results = await this.session.run(feeds);
    const firstOutputName = Object.keys(results)[0];
    const outTensor = results[firstOutputName];
    let data: Float32Array = outTensor.data as Float32Array;
    const dims: number[] =
      (outTensor.dims as number[]) || (isNchw ? nchwShape : nhwcShape);

    // Best-effort to parse dimensions
    let width = input.width;
    let height = input.height;
    let channels = input.channels as 1 | 2 | 3 | 4;
    if (dims.length === 4) {
      // Prefer NHWC; detect NCHW when dims look like [1,C,H,W]
      const [d0, d1, d2, d3] = dims;
      if (d0 === 1 && d1 > 0 && d2 > 0 && d3 > 0) {
        // Heuristic: if layout was requested NCHW or dims look like NCHW (channels fairly small)
        const looksNchw = isNchw || (d1 <= 4 && d2 > 4 && d3 > 4);
        if (looksNchw) {
          channels = Math.max(1, Math.min(4, d1)) as 1 | 2 | 3 | 4;
          height = d2;
          width = d3;
          data = nchwToNhwc(data, width, height, channels);
        } else {
          // NHWC
          height = d1;
          width = d2;
          channels = Math.max(1, Math.min(4, d3)) as 1 | 2 | 3 | 4;
        }
      }
    }

    return { data, width, height, channels };
  }

  // Sessions are cached; dispose is a no-op in this preview
  async dispose(): Promise<void> {
    return;
  }
}
