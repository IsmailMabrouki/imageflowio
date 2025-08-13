import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ImageFlowPipeline } from "../dist/index.mjs";

describe("Tiled inference", () => {
  it("produces identical output to non-tiling with noop backend", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "tiling-"));
    const inputPath = path.join(tmpDir, "input.png");

    // Create a deterministic patterned image
    const width = 63;
    const height = 41;
    const channels = 3;
    const raw = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        raw[i + 0] = (x * 3 + y * 5 + 13) % 256;
        raw[i + 1] = (x * 7 + y * 11 + 29) % 256;
        raw[i + 2] = (x * 13 + y * 17 + 37) % 256;
      }
    }
    await sharp(raw, { raw: { width, height, channels } })
      .png()
      .toFile(inputPath);

    const outDirA = path.join(tmpDir, "outA");
    const outDirB = path.join(tmpDir, "outB");

    const baseConfig = {
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "float32", channels: 3, channelOrder: "rgb" },
        normalize: { apply: false },
      },
      output: { save: { apply: true, path: outDirA, format: "png" } },
    } as any;

    const configTiled = JSON.parse(JSON.stringify(baseConfig));
    configTiled.output.save.path = outDirB;
    configTiled.inference = {
      tiling: { apply: true, tileSize: [16, 17], overlap: 5, blend: "max" },
    };

    const pipelineA = new ImageFlowPipeline(baseConfig);
    const pipelineB = new ImageFlowPipeline({
      ...configTiled,
      execution: { backend: "noop" },
    } as any);

    const resA = await pipelineA.run({ backend: "noop" });
    const resB = await pipelineB.run({ backend: "noop" });

    expect(resA.outputPath && resB.outputPath).toBeTruthy();

    const a = await sharp(resA.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const b = await sharp(resB.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(a.info.width).toBe(b.info.width);
    expect(a.info.height).toBe(b.info.height);
    expect(a.info.channels).toBe(b.info.channels);
    expect(a.data.length).toBe(b.data.length);
    // With max blend vs identity path on noop backend, outputs should still match for this input
    for (let i = 0; i < a.data.length; i++) {
      if (a.data[i] !== b.data[i]) {
        throw new Error(
          `Byte mismatch at index ${i}: ${a.data[i]} != ${b.data[i]}`
        );
      }
    }
  });

  it("handles zero padding when tiles exceed image size", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "tiling-"));
    const inputPath = path.join(tmpDir, "small.png");
    // 5x5 RGB checker-ish pattern
    const width = 5;
    const height = 5;
    const channels = 3;
    const raw = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const v = ((x + y) % 2) * 255;
        raw[i + 0] = v;
        raw[i + 1] = 255 - v;
        raw[i + 2] = v;
      }
    }
    await sharp(raw, { raw: { width, height, channels } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "outZ");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "float32", channels: 3, channelOrder: "rgb" },
        normalize: { apply: false },
      },
      inference: {
        tiling: { apply: true, tileSize: [8, 8], overlap: 2, padMode: "zero" },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const out = await sharp(res.outputPath!).metadata();
    expect(out.width).toBe(width);
    expect(out.height).toBe(height);
  });
});
