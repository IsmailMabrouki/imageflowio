import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "../dist/index.mjs";

const MODEL_ENV = "IMAGEFLOWIO_ONNX_MODEL";

describe("ONNX backend integration (guarded)", () => {
  it("runs pipeline with ONNX backend when model is provided", async () => {
    const modelPath = process.env[MODEL_ENV];
    if (!modelPath || !fs.existsSync(modelPath)) {
      // Skip if model is not provided
      expect(true).toBe(true);
      return;
    }

    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "onnx-"));

    // Create a tiny 2x2 PNG input
    const inputPath = path.join(tmpDir, "input.png");
    const pngData = Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000002000000020806000000f478d4fa0000000a49444154789c63600000020001a2fd0d0a0000000049454e44ae426082",
      "hex"
    );
    fs.writeFileSync(inputPath, pngData);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: modelPath },
      input: { type: "image", source: inputPath },
      preprocessing: {
        resize: { apply: true, imageSize: [4, 4] },
        format: { dataType: "float32", channels: 3, channelOrder: "rgb" },
        normalize: { apply: true, mean: [0, 0, 0], std: [1, 1, 1] },
      },
      postprocessing: { resizeTo: "input" },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const result = await pipeline.run({ backend: "onnx" });
    expect(result.outputPath).toBeTruthy();
    expect(fs.existsSync(result.outputPath!)).toBe(true);
  }, 20000);
});
