import { InferenceBackend, InferenceInput, InferenceOutput } from "./types";

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
    // Assume NHWC by default; models often expect NCHW; this can be made configurable later
    const nhwcShape = [1, input.height, input.width, input.channels];
    const tensor = new ort.Tensor("float32", input.data, nhwcShape);

    const inputName = (this.session as any).inputNames?.[0] ?? "input";
    const feeds: Record<string, any> = {};
    feeds[inputName] = tensor;
    const results = await this.session.run(feeds);
    const firstOutputName = Object.keys(results)[0];
    const outTensor = results[firstOutputName];
    const data: Float32Array = outTensor.data as Float32Array;
    const dims: number[] = (outTensor.dims as number[]) || nhwcShape;

    // Best-effort to parse dimensions
    let width = input.width;
    let height = input.height;
    let channels = input.channels as 1 | 2 | 3 | 4;
    if (dims.length === 4) {
      // try NHWC
      const [n, h, w, c] = dims;
      if (n === 1 && h > 0 && w > 0 && c > 0) {
        width = w;
        height = h;
        channels = Math.max(1, Math.min(4, c)) as 1 | 2 | 3 | 4;
      }
    }

    return { data, width, height, channels };
  }

  // Sessions are cached; dispose is a no-op in this preview
  async dispose(): Promise<void> {
    return;
  }
}
