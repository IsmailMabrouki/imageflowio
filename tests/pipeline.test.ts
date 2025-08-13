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
      visualization: {
        apply: true,
        type: "overlay",
        outputPath: vizDir,
        alpha: 0.7,
      },
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

  it("applies BGR channel order on float path (noop backend)", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 pixel with distinct RGB values
    const raw = Buffer.from([200, 10, 30]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "float32", channels: 3, channelOrder: "bgr" },
        normalize: { apply: false },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Expect R/B swapped
    expect([data[0], data[1], data[2]]).toEqual([30, 10, 200]);
  });

  it("format.channels can request grayscale from RGB on float path", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 RGB distinct
    const raw = Buffer.from([100, 150, 200]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "float32", channels: 1, channelOrder: "rgb" },
        normalize: { apply: false },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { info } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(3); // output image is RGB, but backend input was grayscale
  });

  it("throws BackendLoadError when ONNX backend is requested without dependency", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([0, 0, 0]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const pipeline = new ImageFlowPipeline({
      model: { path: "missing.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: { format: { dataType: "float32", channels: 3 } },
      output: { save: { apply: false } },
    } as any);
    let threw = false;
    try {
      await pipeline.run({ backend: "onnx" });
    } catch (e: any) {
      threw = true;
      const msg = String(e?.message || e);
      expect(
        /Failed to load onnxruntime-node|Cannot find module/i.test(msg)
      ).toBe(true);
    }
    expect(threw).toBe(true);
  });

  it("tensor utils nhwc<->nchw roundtrip yields original", async () => {
    const { nhwcToNchw, nchwToNhwc } = await import("../dist/index.mjs");
    const width = 2,
      height = 2,
      channels = 3;
    const nhwc = new Float32Array([
      // y=0
      1,
      2,
      3, // x=0 (R,G,B)
      4,
      5,
      6, // x=1
      // y=1
      7,
      8,
      9, // x=0
      10,
      11,
      12, // x=1
    ]);
    const nchw = nhwcToNchw(nhwc, width, height, channels);
    const back = nchwToNhwc(nchw, width, height, channels);
    expect(Array.from(back)).toEqual(Array.from(nhwc));
  });

  it("applies BGR channel order in tiled path", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 pixels with distinct colors
    const raw = Buffer.from([200, 10, 30, 10, 200, 30]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "float32", channels: 3, channelOrder: "bgr" },
        normalize: { apply: false },
      },
      inference: { tiling: { apply: true, tileSize: [1, 1], overlap: 0 } },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Both pixels should have R/B swapped
    expect([data[0], data[1], data[2]]).toEqual([30, 10, 200]);
    expect([data[3], data[4], data[5]]).toEqual([30, 200, 10]);
  });

  it("linearToSRGB brightens mid-tones", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 gray ~ 64
    const raw = Buffer.from([64, 64, 64]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDirNo = path.join(tmpDir, "out-no");
    const outDirYes = path.join(tmpDir, "out-yes");

    const pipelineNo = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: {
          apply: true,
          path: outDirNo,
          format: "png",
          filename: "no.png",
          linearToSRGB: false,
        },
      },
    } as any);
    const pipelineYes = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: {
          apply: true,
          path: outDirYes,
          format: "png",
          filename: "yes.png",
          linearToSRGB: true,
        },
      },
    } as any);

    const resNo = await pipelineNo.run({ backend: "noop" });
    const resYes = await pipelineYes.run({ backend: "noop" });

    const sharp = (await import("sharp")).default;
    const { data: dn } = await sharp(resNo.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data: dy } = await sharp(resYes.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Expect sRGB companding to increase mid-tone brightness
    expect(dy[0]).toBeGreaterThan(dn[0]);
  });

  it("writes meta.json with timings and sizes", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const metaPath = path.join(outDir, "meta.json");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outDir, format: "png" },
        writeMeta: { apply: true, jsonPath: metaPath },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    expect(meta.timingsMs).toBeTruthy();
    expect(typeof meta.timingsMs.load).toBe("number");
    expect(meta.inputSize).toBeTruthy();
    expect(meta.outputSize).toBeTruthy();
  });

  it("paletteMap outline overlays boundary pixels", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 single-channel classes [0,1]
    const raw = Buffer.from([0, 1]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 1, channels: 1 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        paletteMap: {
          apply: true,
          source: "channel",
          channel: 0,
          palette: {
            mode: "inline",
            inline: [
              [0, 0, 255],
              [0, 255, 0],
            ],
          },
          outline: { apply: true, color: [255, 0, 0], thickness: 1 },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Pixel 0: class 0 -> [0,0,255]; Pixel 1: boundary -> outlined in red
    expect([data[0], data[1], data[2]]).toEqual([0, 0, 255]);
    expect([data[3], data[4], data[5]]).toEqual([255, 0, 0]);
  });

  it("uses execution.backend from config when not overridden", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([10, 20, 30]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "model.onnx" },
      execution: { backend: "noop" },
      input: { type: "image", source: inputPath },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run();
    expect(fs.existsSync(res.outputPath!)).toBe(true);
  });

  it("visualization defaults to output.save.path when outputPath is omitted", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      visualization: { apply: true, type: "sideBySide" },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = path.parse(res.outputPath!).name;
    const vizPath = path.join(outDir, `${base}_viz.png`);
    expect(fs.existsSync(vizPath)).toBe(true);
  });

  it("splitChannels uses default channel names when not provided", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 RGB image
    const raw = Buffer.from([10, 20, 30, 40, 50, 60]);
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
          filename: "base.png",
        },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(fs.existsSync(path.join(outDir, "base_C0.png"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "base_C1.png"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "base_C2.png"))).toBe(true);
  });

  it("resizeTo fixed size produces expected dimensions", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 0, 0]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: { resizeTo: [4, 5] },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const meta = await sharp(res.outputPath!).metadata();
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(5);
  });

  it("handles execution.warmupRuns without error", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([123, 45, 67]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      execution: { warmupRuns: 2 },
      preprocessing: {
        format: { dataType: "float32", channels: 3, channelOrder: "rgb" },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
    expect(fs.existsSync(res.outputPath!)).toBe(true);
  });

  it("applies BGR channel order on uint8 path when float tensor not needed", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 RGB
    const raw = Buffer.from([10, 20, 200]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    // Set dataType to uint8 and no normalize so uint8 path is taken
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        format: { dataType: "uint8", channels: 3, channelOrder: "bgr" },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([200, 20, 10]);
  });

  it("colorMap grayscale replicates channel to RGB", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 single-channel values [64, 192]
    const raw = Buffer.from([64, 192]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 1, channels: 1 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        colorMap: { apply: true, mode: "grayscale", channel: 0 },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([64, 64, 64]);
    expect([data[3], data[4], data[5]]).toEqual([192, 192, 192]);
  });

  it("blendOverlay composites processed output over original input", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 blue base
    const raw = Buffer.from([0, 0, 255]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      // Force a processed red image via palette mapping of a single-channel input
      postprocessing: {
        paletteMap: {
          apply: true,
          source: "channel",
          channel: 0,
          palette: { mode: "inline", inline: [[255, 0, 0]] },
        },
        blendOverlay: { apply: true, alpha: 0.5 },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Expect composite not equal to pure base [0,0,255] nor pure red [255,0,0]
    expect([data[0], data[1], data[2]]).not.toEqual([0, 0, 255]);
    expect([data[0], data[1], data[2]]).not.toEqual([255, 0, 0]);
  });

  it("linearToSRGB preserves alpha channel", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 RGBA with alpha 128
    const raw = Buffer.from([64, 64, 64, 128]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 4 } })
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
          linearToSRGB: true,
        },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(128);
  });

  it("paletteMap argmax across channels selects highest channel", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 1x1 2-channel (grayscale+alpha layout in PNG): values [10, 200]
    const raw = Buffer.from([10, 200]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 2 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        paletteMap: {
          apply: true,
          source: "argmax",
          palette: {
            mode: "inline",
            inline: [
              [255, 0, 0],
              [0, 255, 0],
            ],
          },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Expect green selected (index 1)
    expect([data[0], data[1], data[2]]).toEqual([0, 255, 0]);
  });

  it("applies augmentations: flip horizontal and rotate 90", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 pixels [R, G]
    const raw = Buffer.from([255, 0, 0, 0, 255, 0]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        augmentations: {
          apply: true,
          methods: ["flip", "rotate"],
          params: { flip: { axis: "horizontal" }, rotate: { angle: 90 } },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(1);
    expect(info.height).toBe(2);
    // After horizontal flip: [G, R]; rotate 90 makes vertical [R at bottom].
    // We only assert sizes and that output differs from original first pixel.
    expect([data[0], data[1], data[2]]).not.toEqual([255, 0, 0]);
  });

  it("applies colorJitter without throwing", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([100, 120, 140]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: {
        augmentations: {
          apply: true,
          methods: ["colorJitter"],
          params: {
            colorJitter: { brightness: 1.2, saturation: 0.8, hue: 90 },
          },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    expect(res.outputPath).toBeTruthy();
  });

  it("centerCrop produces exact requested size", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 4x2 image
    const raw = Buffer.alloc(4 * 2 * 3, 128);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 4, height: 2, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      preprocessing: { centerCrop: { apply: true, size: [2, 2] } },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const meta = await sharp(res.outputPath!).metadata();
    expect(meta.width).toBe(2);
    expect(meta.height).toBe(2);
  });

  it("save TIFF with bitDepth 8 writes 8-bit image", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([10, 20, 30]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
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
          format: "tiff",
          bitDepth: 8 as any,
          filename: "x.tiff",
        },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const meta = await sharp(res.outputPath!).metadata();
    // sharp exposes 'depth' as 'uchar' or 'ushort' (string)
    expect(meta.depth).toBe("uchar");
  });

  it("saveRaw NPY uint8 has '|u1' dtype in header", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([0, 127, 255]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 3 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const rawDir = path.join(tmpDir, "raw");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outDir, format: "png" },
        saveRaw: { apply: true, format: "npy", path: rawDir },
      },
    } as any);

    const res = await pipeline.run({ backend: "noop" });
    const base = require("path").parse(res.outputPath!).name;
    const npyPath = require("path").join(rawDir, `${base}.npy`);
    const buf = require("fs").readFileSync(npyPath);
    expect(buf.includes(Buffer.from("|u1"))).toBe(true);
  });

  it("activation tanh raises bright values and boosts dark less", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const brightPath = path.join(tmpDir, "b.png");
    const darkPath = path.join(tmpDir, "d.png");
    // 1x1 bright and dark
    await (
      await import("sharp")
    )
      .default(Buffer.from([255, 255, 255]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(brightPath);
    await (
      await import("sharp")
    )
      .default(Buffer.from([0, 0, 0]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(darkPath);

    const outDir = path.join(tmpDir, "out");
    const makePipe = (src: string) =>
      new ImageFlowPipeline({
        model: { path: "noop.onnx" },
        input: { type: "image", source: src },
        postprocessing: { activation: { apply: true, type: "tanh" } },
        output: { save: { apply: true, path: outDir, format: "png" } },
      } as any);
    const sharp = (await import("sharp")).default;
    const resB = await makePipe(brightPath).run({ backend: "noop" });
    const rb = await sharp(resB.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const resD = await makePipe(darkPath).run({ backend: "noop" });
    const rd = await sharp(resD.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(rb.data[0]).toBeGreaterThan(rd.data[0]);
  });

  it("clamp limits values to [min,max] range", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([255, 255, 255]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: { clamp: { apply: true, min: 0, max: 0.5 } },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeLessThanOrEqual(128);
  });

  it("denormalize scale reduces intensity proportionally", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([200, 200, 200]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        denormalize: { apply: true, scale: 128, dtype: "uint8" },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeLessThan(200);
  });

  it("filename pattern uses {model}", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([0, 0, 0]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { name: "mname", path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: {
          apply: true,
          path: outDir,
          format: "png",
          filename: "{model}_x.png",
        },
      },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    expect(
      require("path").parse(res.outputPath!).name.startsWith("mname_")
    ).toBe(true);
  });

  it("saves JPEG and WebP without error", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([10, 20, 30]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outJ = path.join(tmpDir, "outJ");
    const outW = path.join(tmpDir, "outW");
    const pipeJ = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outJ, format: "jpeg", filename: "a.jpg" },
      },
    } as any);
    const pipeW = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      output: {
        save: { apply: true, path: outW, format: "webp", filename: "a.webp" },
      },
    } as any);
    const rj = await pipeJ.run({ backend: "noop" });
    const rw = await pipeW.run({ backend: "noop" });
    expect(require("fs").existsSync(rj.outputPath!)).toBe(true);
    expect(require("fs").existsSync(rw.outputPath!)).toBe(true);
  });

  it("toneMap ACES on grayscale runs without error", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x1 grayscale values
    const raw = Buffer.from([50, 200]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 1, channels: 1 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        toneMap: { apply: true, method: "aces", exposure: 0.5, gamma: 2.2 },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const { data } = await sharp(res.outputPath!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThanOrEqual(0);
    expect(data[1]).toBeLessThanOrEqual(255);
  });

  it("splitChannels with single-channel produces only C0 file", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    const raw = Buffer.from([77]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 1, height: 1, channels: 1 } })
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
          filename: "base.png",
        },
      },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    expect(
      require("fs").existsSync(require("path").join(outDir, "base_C0.png"))
    ).toBe(true);
  });

  it("paletteMap outline with thickness>1 does not throw", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    // 2x2 checker of classes [0,1]
    const raw = Buffer.from([0, 1, 1, 0]);
    await (
      await import("sharp")
    )
      .default(raw, { raw: { width: 2, height: 2, channels: 1 } })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      postprocessing: {
        paletteMap: {
          apply: true,
          source: "channel",
          channel: 0,
          palette: {
            mode: "inline",
            inline: [
              [0, 0, 255],
              [255, 255, 0],
            ],
          },
          outline: { apply: true, color: [255, 0, 0], thickness: 3 },
        },
      },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    expect(require("fs").existsSync(res.outputPath!)).toBe(true);
  });

  it("custom preprocessing and postprocessing hooks run when provided", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([0, 0, 0]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const prePath = path.join(tmpDir, "pre.js");
    const postPath = path.join(tmpDir, "post.js");
    require("fs").writeFileSync(
      prePath,
      `module.exports = async (img) => img.negate();`
    );
    require("fs").writeFileSync(
      postPath,
      `module.exports = async (img) => img.ensureAlpha(0.5);`
    );

    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      custom: { preprocessingFn: prePath, postprocessingFn: postPath },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    const sharp = (await import("sharp")).default;
    const meta = await sharp(res.outputPath!).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("writes logs to file when logging.saveLogs is true", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "pipeline-"));
    const inputPath = path.join(tmpDir, "input.png");
    await (
      await import("sharp")
    )
      .default(Buffer.from([0, 0, 0]), {
        raw: { width: 1, height: 1, channels: 3 },
      })
      .png()
      .toFile(inputPath);

    const outDir = path.join(tmpDir, "out");
    const logPath = path.join(tmpDir, "log.txt");
    const pipeline = new ImageFlowPipeline({
      model: { path: "noop.onnx" },
      input: { type: "image", source: inputPath },
      logging: { saveLogs: true, logPath, level: "info" },
      output: { save: { apply: true, path: outDir, format: "png" } },
    } as any);
    const res = await pipeline.run({ backend: "noop" });
    expect(fs.existsSync(logPath)).toBe(true);
    const contents = fs.readFileSync(logPath, "utf-8");
    expect(contents).toContain("pipeline/start");
    expect(contents).toMatch(/total ms=/);
  });
});
