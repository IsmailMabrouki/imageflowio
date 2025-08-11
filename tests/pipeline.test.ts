import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "../dist/index.mjs";

describe("Pipeline", () => {
  it("resizes and saves an output image", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // Create a tiny 2x2 PNG via a Buffer (black)
    const pngData = Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000002000000020806000000f4" +
        "78d4fa0000000a49444154789c63600000020001a2fd0d0a0000000049454e44ae426082",
      "hex"
    );
    fs.writeFileSync(inputPath, pngData);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: { resize: { apply: true, imageSize: [4, 4] } },
      postprocessing: { resizeTo: "input" },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const result = await pipeline.run();
    expect(result.outputPath).toBeTruthy();
    expect(fs.existsSync(result.outputPath!)).toBe(true);
    // meta/raw disabled by default; enable and test
    const pipeline2 = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outDir, format: "png" },
        writeMeta: { apply: true, jsonPath: path.join(outDir, "meta.json") },
        saveRaw: { apply: true, format: "npy", path: outDir },
      },
    } as any);
    const result2 = await pipeline2.run();
    expect(fs.existsSync(path.join(outDir, "meta.json"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(outDir, `${path.parse(result2.outputPath!).name}.npy`)
      )
    ).toBe(true);
  });

  it("can split channels when requested", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 RGB image with distinct channels per pixel
    const raw = Buffer.from([
      255,
      0,
      0, // red
      0,
      255,
      0, // green
    ]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: {
          apply: true,
          path: outDir,
          format: "png",
          splitChannels: true,
          channelNames: ["R", "G", "B"],
          filename: "split_test.png",
        },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    expect(fs.existsSync(path.join(outDir, "split_test.png"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "split_test_R.png"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "split_test_G.png"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "split_test_B.png"))).toBe(true);
  });
});
