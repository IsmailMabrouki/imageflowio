import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ImageFlowConfig, Size2 } from "./types";
import sharpModule from "sharp";
import { writeNpy } from "./utils/npy";
import { performance } from "node:perf_hooks";
import { NoopBackend } from "./backends/noop";
import { InferenceBackend } from "./backends/types";
import { OnnxBackend } from "./backends/onnx";
import { mapValueToColor } from "./utils/colormaps";
import { getPresetPalette } from "./utils/palette";

export type RunOptions = {
  backend?: "auto" | "onnx" | "noop";
  threads?: number | "auto";
};

export class ImageFlowPipeline {
  constructor(private readonly config: ImageFlowConfig) {}

  async run(options?: RunOptions): Promise<{ outputPath?: string }> {
    const { input } = this.config;
    if (input.type !== "image")
      throw new Error("Only image input is supported in this preview.");

    const inputAbs = path.resolve(process.cwd(), input.source);
    if (!fs.existsSync(inputAbs)) {
      throw new Error(`Input image not found: ${input.source}`);
    }
    const tStart = performance.now();
    // Apply threads override or config threads
    const threadsOverride = options?.threads;
    if (threadsOverride && threadsOverride !== "auto") {
      const countNum = Number(threadsOverride);
      if (!Number.isNaN(countNum) && countNum > 0)
        sharpModule.concurrency(countNum);
    } else if (this.config.execution?.threads?.apply) {
      const count = this.config.execution.threads.count;
      if (count && count !== "auto") {
        const num = Number(count);
        if (!Number.isNaN(num) && num > 0) sharpModule.concurrency(num);
      }
    }
    const image = sharp(inputAbs, { failOn: "none" });
    const originalMeta = await image.metadata();
    const tAfterLoad = performance.now();

    let work = image.clone();

    // Preprocessing: resize
    const pp = this.config.preprocessing;
    if (pp?.resize?.apply && pp.resize.imageSize) {
      const [w, h] = pp.resize.imageSize;
      if (pp.resize.keepAspectRatio) {
        const fit = pp.resize.resizeMode === "fill" ? "fill" : "inside"; // fit/inside mapping
        work = work.resize({
          width: w,
          height: h,
          fit: fit as any,
          withoutEnlargement: false,
        });
      } else {
        work = work.resize({ width: w, height: h, fit: "fill" });
      }
    }

    if (pp?.centerCrop?.apply && pp.centerCrop.size) {
      const [cw, ch] = pp.centerCrop.size;
      work = work.resize({
        width: cw,
        height: ch,
        fit: "cover",
        position: sharp.strategy.attention,
      });
    }

    if (pp?.grayscale?.apply) {
      work = work.grayscale();
    }

    // Build tensor for inference if requested (float32 path + optional normalize)
    let inputTensor: {
      data: Float32Array;
      width: number;
      height: number;
      channels: number;
    } | null = null;
    const needFloatTensor =
      pp?.normalize?.apply || pp?.format?.dataType === "float32";
    if (needFloatTensor) {
      const { data, info } = await work
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 3;
      const floatData = new Float32Array(width * height * channels);
      const mean = pp?.normalize?.mean ?? [0, 0, 0];
      const std = pp?.normalize?.std ?? [1, 1, 1];
      const applyNorm = pp?.normalize?.apply === true;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * channels;
          for (let c = 0; c < channels; c++) {
            const v = data[i + c] / 255;
            floatData[i + c] = applyNorm
              ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
              : v;
          }
        }
      }
      // Apply channel order for model input (float path) if requested
      if (pp?.format?.channelOrder === "bgr" && (info.channels ?? 3) >= 3) {
        for (let i = 0; i < width * height; i++) {
          const base = i * channels;
          const r = floatData[base + 0];
          const b = floatData[base + 2];
          floatData[base + 0] = b;
          floatData[base + 2] = r;
        }
      }
      inputTensor = { data: floatData, width, height, channels };
    }
    // Channel order conversion on uint8 path only (no float tensor)
    if (!needFloatTensor && pp?.format?.channelOrder === "bgr") {
      const { data, info } = await work
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 3;
      if (channels >= 3) {
        for (let i = 0; i < width * height; i++) {
          const base = i * channels;
          const r = data[base + 0];
          const b = data[base + 2];
          data[base + 0] = b;
          data[base + 2] = r;
        }
        work = sharp(data, { raw: { width, height, channels } });
      }
    }
    const tAfterPre = performance.now();

    // Placeholder for inference: image-to-image identity transform (no-op)
    let out = work;
    // Inference via backend if float tensor is prepared
    let tAfterInfer = performance.now();
    if (inputTensor) {
      // Select backend: CLI/opts override -> extension heuristic
      let backendChoice: "auto" | "onnx" | "noop" = options?.backend ?? "auto";
      if (backendChoice === "auto") {
        backendChoice = this.config.model.path.toLowerCase().endsWith(".onnx")
          ? "onnx"
          : "noop";
      }
      let backend: InferenceBackend =
        backendChoice === "onnx" ? new OnnxBackend() : new NoopBackend();
      await backend.loadModel(this.config.model.path);

      // Optional warmup runs
      const warmupRuns = Math.max(0, this.config.execution?.warmupRuns ?? 0);
      if (warmupRuns > 0 && inputTensor) {
        try {
          for (let i = 0; i < warmupRuns; i++) {
            await backend.infer({
              data: inputTensor.data,
              width: inputTensor.width,
              height: inputTensor.height,
              channels: inputTensor.channels,
            });
          }
        } catch {
          // ignore warmup errors in preview
        }
      }

      const tiling = this.config.inference?.tiling;
      const doTiling = !!tiling?.apply;
      const scaleFactor = this.config.postprocessing?.denormalize?.scale ?? 255;

      if (doTiling) {
        const { data: baseData, info: baseInfo } = await work
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const imgW = baseInfo.width ?? inputTensor.width;
        const imgH = baseInfo.height ?? inputTensor.height;
        const ch = baseInfo.channels ?? inputTensor.channels;
        const tileW = Math.max(1, tiling?.tileSize?.[0] ?? 256);
        const tileH = Math.max(1, tiling?.tileSize?.[1] ?? 256);
        const overlap = Math.max(0, tiling?.overlap ?? 0);
        const stepX = Math.max(1, tileW - overlap);
        const stepY = Math.max(1, tileH - overlap);
        const sum = new Float32Array(imgW * imgH * ch);
        const weight = new Float32Array(imgW * imgH);
        for (let y = 0; y < imgH; y += stepY) {
          const th = Math.min(tileH, imgH - y);
          for (let x = 0; x < imgW; x += stepX) {
            const tw = Math.min(tileW, imgW - x);
            // Extract tile
            const tileBuf = await sharp(baseData, {
              raw: { width: imgW, height: imgH, channels: ch },
            })
              .extract({ left: x, top: y, width: tw, height: th })
              .raw()
              .toBuffer();
            // to float + normalize
            const tileFloat = new Float32Array(tw * th * ch);
            const mean = pp?.normalize?.mean ?? [0, 0, 0];
            const std = pp?.normalize?.std ?? [1, 1, 1];
            const applyNorm = pp?.normalize?.apply === true;
            for (let i = 0; i < tw * th; i++) {
              for (let c = 0; c < ch; c++) {
                const v = tileBuf[i * ch + c] / 255;
                tileFloat[i * ch + c] = applyNorm
                  ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
                  : v;
              }
            }
            // Apply channel order for model input (tile float path)
            if (pp?.format?.channelOrder === "bgr" && ch >= 3) {
              for (let i = 0; i < tw * th; i++) {
                const base = i * ch;
                const r = tileFloat[base + 0];
                const b = tileFloat[base + 2];
                tileFloat[base + 0] = b;
                tileFloat[base + 2] = r;
              }
            }
            const tileOut = await backend.infer({
              data: tileFloat,
              width: tw,
              height: th,
              channels: ch,
            });
            // accumulate (average)
            for (let ty = 0; ty < th; ty++) {
              const gy = y + ty;
              for (let tx = 0; tx < tw; tx++) {
                const gx = x + tx;
                const gi = gy * imgW + gx;
                weight[gi] += 1;
                const pi = (ty * tw + tx) * ch;
                const go = gi * ch;
                for (let c = 0; c < ch; c++) {
                  sum[go + c] += tileOut.data[pi + c] * scaleFactor;
                }
              }
            }
          }
        }
        // finalize average
        const outBuf = Buffer.alloc(imgW * imgH * ch);
        for (let i = 0; i < imgW * imgH; i++) {
          const w = weight[i] || 1;
          const base = i * ch;
          for (let c = 0; c < ch; c++) {
            const v = Math.max(0, Math.min(255, Math.round(sum[base + c] / w)));
            outBuf[base + c] = v;
          }
        }
        out = sharp(outBuf, {
          raw: { width: imgW, height: imgH, channels: ch },
        });
      } else {
        const result = await backend.infer({
          data: inputTensor.data,
          width: inputTensor.width,
          height: inputTensor.height,
          channels: inputTensor.channels,
        });
        // Convert back to uint8 image for downstream steps (respect denormalize.scale if provided)
        const uint8 = Buffer.alloc(result.data.length);
        for (let i = 0; i < result.data.length; i++) {
          uint8[i] = Math.max(
            0,
            Math.min(255, Math.round(result.data[i] * scaleFactor))
          );
        }
        out = sharp(uint8, {
          raw: {
            width: result.width,
            height: result.height,
            channels: Math.max(1, Math.min(4, result.channels)) as
              | 1
              | 2
              | 3
              | 4,
          },
        });
      }
      tAfterInfer = performance.now();
      if (backend.dispose) await backend.dispose();
    }

    // Postprocessing
    const post = this.config.postprocessing;
    // toneMap/activation/clamp/denormalize are not implemented in this preview

    // Activation / clamp / denormalize (preview implementation on 8-bit data)
    if (
      post?.activation?.apply ||
      post?.clamp?.apply ||
      post?.denormalize?.apply
    ) {
      const { data, info } = await out
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const channels = info.channels ?? 3;
      const len = (info.width ?? 0) * (info.height ?? 0) * channels;
      for (let idx = 0; idx < len; idx++) {
        // normalize to [0,1]
        let v = data[idx] / 255;
        if (post.activation?.apply) {
          if (post.activation.type === "sigmoid") {
            const x = v * 2 - 1; // center around 0
            v = 1 / (1 + Math.exp(-x));
          } else if (post.activation.type === "tanh") {
            const x = v * 2 - 1;
            v = Math.tanh(x) * 0.5 + 0.5; // back to [0,1]
          }
        }
        if (post.clamp?.apply) {
          const min = Math.max(0, post.clamp.min ?? 0);
          const max = Math.min(1, post.clamp.max ?? 1);
          if (v < min) v = min;
          if (v > max) v = max;
        }
        if (post.denormalize?.apply) {
          const scale = post.denormalize.scale ?? 255;
          v = v * (scale / 255);
        }
        data[idx] = Math.max(0, Math.min(255, Math.round(v * 255)));
      }
      out = sharp(data, {
        raw: { width: info.width ?? 0, height: info.height ?? 0, channels },
      });
    }

    // Tone mapping: luminance-based operator preserving chroma
    if (post?.toneMap?.apply) {
      const method = post.toneMap.method ?? "reinhard";
      const exposure = post.toneMap.exposure ?? 0;
      const gamma = post.toneMap.gamma ?? 2.2;
      const { data, info } = await out
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 3;
      const expMul = Math.pow(2, exposure);
      const eps = 1e-6;
      if (channels >= 3) {
        for (let i = 0; i < width * height; i++) {
          const j = i * channels;
          const r = data[j + 0] / 255;
          const g = data[j + 1] / 255;
          const b = data[j + 2] / 255;
          let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          y *= expMul;
          let yMapped: number;
          if (method === "aces" || method === "filmic") {
            const a = 2.51,
              b1 = 0.03,
              c = 2.43,
              d = 0.59,
              e = 0.14;
            yMapped = (y * (a * y + b1)) / (y * (c * y + d) + e);
          } else {
            yMapped = y / (1 + y);
          }
          if (gamma > 0)
            yMapped = Math.pow(Math.max(0, Math.min(1, yMapped)), 1 / gamma);
          const scale = y > eps ? yMapped / y : 0;
          const rn = Math.max(0, Math.min(1, r * scale));
          const gn = Math.max(0, Math.min(1, g * scale));
          const bn = Math.max(0, Math.min(1, b * scale));
          data[j + 0] = Math.round(rn * 255);
          data[j + 1] = Math.round(gn * 255);
          data[j + 2] = Math.round(bn * 255);
        }
      } else {
        // Single-channel
        for (let i = 0; i < width * height; i++) {
          const v0 = (data[i] / 255) * expMul;
          let v = v0;
          if (method === "aces" || method === "filmic") {
            const a = 2.51,
              b1 = 0.03,
              c = 2.43,
              d = 0.59,
              e = 0.14;
            v = (v * (a * v + b1)) / (v * (c * v + d) + e);
          } else {
            v = v / (1 + v);
          }
          if (gamma > 0) v = Math.pow(Math.max(0, Math.min(1, v)), 1 / gamma);
          data[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
        }
      }
      out = sharp(data, { raw: { width, height, channels } });
    }

    // Color map: replicate a selected channel to RGB for visualization
    if (post?.colorMap?.apply) {
      const { data, info } = await out
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 1;
      const ch = Math.min(
        post.colorMap.channel ?? 0,
        Math.max(0, channels - 1)
      );
      const rgb = Buffer.alloc(width * height * 3);
      const mode = (post.colorMap.mode ?? "grayscale") as any;
      for (let i = 0; i < width * height; i++) {
        const v = data[i * channels + ch];
        const [r, g, b] = mapValueToColor(v, mode);
        const j = i * 3;
        rgb[j] = r;
        rgb[j + 1] = g;
        rgb[j + 2] = b;
      }
      out = sharp(rgb, { raw: { width, height, channels: 3 } });
    }

    // Palette mapping (argmax or channel index -> RGB)
    if (post?.paletteMap?.apply) {
      const { data, info } = await out
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 1;
      const source = post.paletteMap.source ?? "argmax";
      const palette = (() => {
        const p = post.paletteMap?.palette;
        if (!p) return getPresetPalette("pascal_voc");
        if (p.mode === "preset")
          return getPresetPalette(p.preset ?? "pascal_voc");
        if (p.mode === "inline" && p.inline && p.inline.length > 0)
          return p.inline as any;
        if (p.mode === "file" && p.file) {
          try {
            const abs = path.resolve(process.cwd(), p.file);
            if (fs.existsSync(abs)) {
              const arr = JSON.parse(fs.readFileSync(abs, "utf-8"));
              if (Array.isArray(arr) && arr.length > 0) return arr as any;
            }
          } catch {}
          return getPresetPalette("pascal_voc");
        }
        return getPresetPalette("pascal_voc");
      })();
      const classIdx = new Uint16Array(width * height);
      for (let i = 0; i < width * height; i++) {
        if (source === "channel" && post.paletteMap?.channel != null) {
          const ch = Math.max(
            0,
            Math.min(channels - 1, post.paletteMap.channel)
          );
          classIdx[i] = data[i * channels + ch];
        } else if (channels > 1) {
          let maxVal = -Infinity;
          let maxIdx = 0;
          for (let c = 0; c < channels; c++) {
            const val = data[i * channels + c];
            if (val > maxVal) {
              maxVal = val;
              maxIdx = c;
            }
          }
          classIdx[i] = maxIdx;
        } else {
          classIdx[i] = data[i];
        }
      }
      const rgb = Buffer.alloc(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        const cls = classIdx[i] % palette.length;
        const [r, g, b] = palette[cls];
        const j = i * 3;
        rgb[j] = r;
        rgb[j + 1] = g;
        rgb[j + 2] = b;
      }
      // Outline overlay (simple boundary detection)
      if (post.paletteMap.outline?.apply) {
        const color = post.paletteMap.outline.color ?? [255, 0, 0];
        const thickness = Math.max(1, post.paletteMap.outline.thickness ?? 1);
        // thickness>1 not fully implemented; treat as 1 for now
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const cls = classIdx[i];
            const leftDiff = x > 0 && classIdx[i - 1] !== cls;
            const topDiff = y > 0 && classIdx[i - width] !== cls;
            if (leftDiff || topDiff) {
              const j = i * 3;
              rgb[j] = color[0];
              rgb[j + 1] = color[1];
              rgb[j + 2] = color[2];
            }
          }
        }
      }
      out = sharp(rgb, { raw: { width, height, channels: 3 } });
    }

    // Resize back to input size on request
    if (
      post?.resizeTo === "input" &&
      originalMeta.width &&
      originalMeta.height
    ) {
      out = out.resize({
        width: originalMeta.width,
        height: originalMeta.height,
        fit: "fill",
      });
    } else if (Array.isArray(post?.resizeTo)) {
      const size = post?.resizeTo as Size2;
      out = out.resize({ width: size[0], height: size[1], fit: "fill" });
    }

    // Blend overlay: composite processed output over original input
    if (post?.blendOverlay?.apply) {
      const meta = await out.metadata();
      const base = sharp(inputAbs, { failOn: "none" }).resize({
        width: meta.width ?? undefined,
        height: meta.height ?? undefined,
        fit: "fill",
      });
      const alpha = Math.max(0, Math.min(1, post.blendOverlay.alpha ?? 0.5));
      const overlayBuf = await out.clone().ensureAlpha(alpha).png().toBuffer();
      out = base.composite([{ input: overlayBuf, blend: "over" }]);
    }
    const tAfterPost = performance.now();

    // Output saving
    const output = this.config.output;
    if (output?.save?.apply) {
      const dir = path.resolve(process.cwd(), output.save.path ?? "./outputs");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = (output.save.filename ?? "{model}_{timestamp}.png")
        .replace(
          "{model}",
          this.config.model.name ?? path.parse(this.config.model.path).name
        )
        .replace("{timestamp}", new Date().toISOString().replace(/[:.]/g, "-"));
      const target = path.join(dir, filename);

      const format = (output.save.format ?? "png").toLowerCase();

      // Optional linear -> sRGB companding before save
      if (output.save.linearToSRGB) {
        const { data, info } = await out
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const width = info.width ?? 0;
        const height = info.height ?? 0;
        const channels = info.channels ?? 3;
        const comp = Buffer.alloc(data.length);
        const isRGBA = channels === 4;
        for (let i = 0; i < width * height; i++) {
          const base = i * channels;
          const limit = isRGBA ? 3 : channels;
          for (let c = 0; c < limit; c++) {
            const lv = data[base + c] / 255;
            const srgb =
              lv <= 0.0031308
                ? 12.92 * lv
                : 1.055 * Math.pow(lv, 1 / 2.4) - 0.055;
            comp[base + c] = Math.max(0, Math.min(255, Math.round(srgb * 255)));
          }
          if (isRGBA) comp[base + 3] = data[base + 3];
        }
        out = sharp(comp, { raw: { width, height, channels } });
      }

      if (output.save.splitChannels) {
        const { data, info } = await out
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const width = info.width ?? 0;
        const height = info.height ?? 0;
        const channels = info.channels ?? 1;
        const base = path.parse(target).name;
        const ext = format;
        for (let c = 0; c < channels; c++) {
          const chName = output.save.channelNames?.[c] ?? `C${c}`;
          const chBuf = Buffer.alloc(width * height);
          for (let i = 0; i < width * height; i++) {
            chBuf[i] = data[i * channels + c];
          }
          const chSharp = sharp(chBuf, { raw: { width, height, channels: 1 } });
          const chTarget = path.join(dir, `${base}_${chName}.${ext}`);
          if (format === "png") {
            await chSharp.png({ compressionLevel: 9 }).toFile(chTarget);
          } else if (format === "jpeg") {
            await chSharp
              .jpeg({ quality: output.save.quality ?? 90 })
              .toFile(chTarget);
          } else if (format === "webp") {
            await chSharp
              .webp({ quality: output.save.quality ?? 90 })
              .toFile(chTarget);
          } else if (format === "tiff") {
            await chSharp
              .tiff({
                quality: output.save.quality ?? 90,
                bitdepth: (output.save.bitDepth as any) ?? 8,
              })
              .toFile(chTarget);
          } else {
            await chSharp.toFile(chTarget);
          }
        }
        // Also save the combined multi-channel image
        if (format === "png") {
          await out.png({ compressionLevel: 9 }).toFile(target);
        } else if (format === "jpeg") {
          await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "webp") {
          await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "tiff") {
          await out
            .tiff({
              quality: output.save.quality ?? 90,
              bitdepth: (output.save.bitDepth as any) ?? 8,
            })
            .toFile(target);
        } else {
          await out.toFile(target);
        }
      } else {
        if (format === "png") {
          await out.png({ compressionLevel: 9 }).toFile(target);
        } else if (format === "jpeg") {
          await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "webp") {
          await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "tiff") {
          await out
            .tiff({
              quality: output.save.quality ?? 90,
              bitdepth: (output.save.bitDepth as any) ?? 8,
            })
            .toFile(target);
        } else {
          await out.toFile(target);
        }
      }
      // Visualization (e.g., side-by-side)
      if (this.config.visualization?.apply) {
        const vizType = this.config.visualization.type ?? "sideBySide";
        const vizDir = path.resolve(
          process.cwd(),
          this.config.visualization.outputPath || output.save.path || dir
        );
        if (!fs.existsSync(vizDir)) fs.mkdirSync(vizDir, { recursive: true });
        if (vizType === "sideBySide") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const leftBuf = await sharp(inputAbs, { failOn: "none" })
            .resize({ width: w, height: h, fit: "fill" })
            .png()
            .toBuffer();
          const rightBuf = await out.clone().png().toBuffer();
          const canvas = sharp({
            create: {
              width: w * 2,
              height: h,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          })
            .composite([
              { input: leftBuf, left: 0, top: 0 },
              { input: rightBuf, left: w, top: 0 },
            ])
            .png();
          const vizName = path.parse(target).name + "_viz.png";
          await canvas.toFile(path.join(vizDir, vizName));
        } else if (vizType === "difference") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const left = await sharp(inputAbs, { failOn: "none" })
            .resize({ width: w, height: h, fit: "fill" })
            .raw()
            .toBuffer({ resolveWithObject: true });
          const right = await out
            .clone()
            .raw()
            .toBuffer({ resolveWithObject: true });
          const lc = left.info.channels ?? 3;
          const rc = right.info.channels ?? 3;
          const ch = Math.min(lc, rc, 3);
          const diff = Buffer.alloc(w * h * 3);
          for (let i = 0; i < w * h; i++) {
            let acc = 0;
            for (let c = 0; c < ch; c++) {
              const lv = left.data[i * lc + c] || 0;
              const rv = right.data[i * rc + c] || 0;
              acc += Math.abs(lv - rv);
            }
            const val = Math.max(0, Math.min(255, Math.round(acc / ch)));
            const j = i * 3;
            diff[j] = val;
            diff[j + 1] = val;
            diff[j + 2] = val;
          }
          const vizName = path.parse(target).name + "_diff.png";
          await sharp(diff, { raw: { width: w, height: h, channels: 3 } })
            .png()
            .toFile(path.join(vizDir, vizName));
        }
      }

      // Optionally write metadata
      if (this.config.output?.writeMeta?.apply) {
        const metaPath = this.config.output.writeMeta.jsonPath
          ? path.resolve(process.cwd(), this.config.output.writeMeta.jsonPath)
          : path.join(dir, "meta.json");
        const meta = {
          input: input.source,
          output: target,
          config: this.config,
          timestamp: new Date().toISOString(),
          inputSize: {
            width: originalMeta.width ?? null,
            height: originalMeta.height ?? null,
          },
          outputSize: await sharp(target)
            .metadata()
            .then((m) => ({
              width: m.width ?? null,
              height: m.height ?? null,
            })),
          timingsMs: {
            load: tAfterLoad - tStart,
            preprocess: tAfterPre - tAfterLoad,
            inference: tAfterInfer - tAfterPre,
            postprocess: tAfterPost - tAfterInfer,
            save: performance.now() - tAfterPost,
            total: performance.now() - tStart,
          },
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }
      // Optionally save raw tensor from the output image as [H,W,C] uint8 NPY
      if (
        this.config.output?.saveRaw?.apply &&
        this.config.output.saveRaw.path
      ) {
        const rawDir = path.resolve(
          process.cwd(),
          this.config.output.saveRaw.path
        );
        if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
        const format = (
          this.config.output.saveRaw.format || "npy"
        ).toLowerCase();
        const dtype = (this.config.output.saveRaw as any).dtype || "uint8";
        const ext = format === "bin" ? ".bin" : ".npy";
        const rawPath = path.join(rawDir, path.parse(target).name + ext);
        const { data, info } = await out
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const arr = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength
        );
        if (format === "bin") {
          fs.writeFileSync(
            rawPath,
            Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
          );
        } else {
          if (dtype === "float32") {
            const float = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++) float[i] = arr[i] / 255;
            writeNpy(
              rawPath,
              float as unknown as Float32Array,
              [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
              "float32"
            );
          } else {
            writeNpy(
              rawPath,
              arr,
              [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
              "uint8"
            );
          }
        }
      }
      return { outputPath: target };
    }

    return {};
  }
}
