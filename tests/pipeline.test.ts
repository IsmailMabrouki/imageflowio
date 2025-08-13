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

  it("can save raw BIN with correct size", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // Create 3x2 RGB so size is predictable
    const width = 3,
      height = 2,
      channels = 3;
    const raw = Buffer.alloc(width * height * channels, 7);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width, height, channels },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const rawDir = path.join(tmpDir, "raw");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outDir, format: "png" },
        saveRaw: { apply: true, format: "bin", path: rawDir },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    const base = path.parse(res.outputPath!).name;
    const binPath = path.join(rawDir, `${base}.bin`);
    expect(fs.existsSync(binPath)).toBe(true);
    const stats = fs.statSync(binPath);
    expect(Number(stats.size)).toBe(width * height * channels);
  });

  it("can save float32 NPY when dtype is set", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const width = 2,
      height = 2,
      channels = 1;
    const raw = Buffer.from([0, 64, 128, 255]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width, height, channels },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const rawDir = path.join(tmpDir, "raw");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outDir, format: "png" },
        saveRaw: { apply: true, format: "npy", path: rawDir, dtype: "float32" },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const npyPath = path.join(rawDir, `${base}.npy`);
    expect(fs.existsSync(npyPath)).toBe(true);
    const buf = fs.readFileSync(npyPath);
    // Quick sanity: header contains '<f4'
    expect(buf.includes(Buffer.from("<f4"))).toBe(true);
  });

  it("applies tone mapping reinhard without error", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // Bright gradient to exercise tone mapping
    const width = 8,
      height = 8,
      channels = 3;
    const raw = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = Math.min(255, Math.round((x + y) * 16));
        const i = (y * width + x) * channels;
        raw[i] = v;
        raw[i + 1] = v;
        raw[i + 2] = v;
      }
    }
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width, height, channels },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        toneMap: { apply: true, method: "reinhard", exposure: 1, gamma: 2.2 },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    expect(fs.existsSync(res.outputPath!)).toBe(true);
  });

  it("writes side-by-side visualization when enabled", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 255, 0]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 2, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const vizDir = path.join(tmpDir, "viz");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      visualization: { apply: true, type: "sideBySide", outputPath: vizDir },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const vizPath = path.join(vizDir, `${base}_viz.png`);
    expect(fs.existsSync(vizPath)).toBe(true);
  });

  it("writes difference visualization when enabled", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 255, 0]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 2, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const vizDir = path.join(tmpDir, "viz");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      visualization: { apply: true, type: "difference", outputPath: vizDir },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const diffPath = path.join(vizDir, `${base}_diff.png`);
    expect(fs.existsSync(diffPath)).toBe(true);
  });

  it("writes overlay visualization when enabled", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 255, 0]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 2, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const vizDir = path.join(tmpDir, "viz");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      visualization: { apply: true, type: "overlay", outputPath: vizDir },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const vizPath = path.join(vizDir, `${base}_overlay.png`);
    expect(fs.existsSync(vizPath)).toBe(true);
  });

  it("writes heatmap visualization when enabled", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 255, 0]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 2, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const vizDir = path.join(tmpDir, "viz");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      visualization: { apply: true, type: "heatmap", outputPath: vizDir },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const vizPath = path.join(vizDir, `${base}_heatmap.png`);
    expect(fs.existsSync(vizPath)).toBe(true);
  });

  it("paletteMap can load palette from file", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 single-channel with class indices [0, 1]
    const raw = Buffer.from([0, 1]);
    await (
      await import("sharp")
    )
      .default(raw, {
        raw: { width: 2, height: 1, channels: 1 },
      })
      .png()
      .toFile(inputPath);

    const palettePath = path.join(tmpDir, "palette.json");
    fs.writeFileSync(
      palettePath,
      JSON.stringify([
        [255, 0, 0],
        [0, 255, 0],
      ])
    );

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        paletteMap: {
          apply: true,
          source: "channel",
          channel: 0,
          palette: { mode: "file", file: palettePath },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    // Should produce a 2x1 RGB image with [255,0,0] then [0,255,0]
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(2);
    expect(info.height).toBe(1);
    expect(info.channels).toBe(3);
    expect([data[0], data[1], data[2]]).toEqual([255, 0, 0]);
    expect([data[3], data[4], data[5]]).toEqual([0, 255, 0]);
  });
});
