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
      tiling: { apply: true, tileSize: [16, 17], overlap: 5 },
    };

    const pipelineA = new ImageFlowPipeline(baseConfig);
    const pipelineB = new ImageFlowPipeline(configTiled);

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
    for (let i = 0; i < a.data.length; i++) {
      if (a.data[i] !== b.data[i]) {
        throw new Error(
          `Byte mismatch at index ${i}: ${a.data[i]} != ${b.data[i]}`
        );
      }
    }
  });
});
