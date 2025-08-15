import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ImageFlowConfig, Size2 } from "./types";
import sharpModule from "sharp";
import os from "os";
import { writeNpy } from "./utils/npy";
import { performance } from "node:perf_hooks";
import { NoopBackend } from "./backends/noop";
import { InferenceBackend } from "./backends/types";
import { OnnxBackend } from "./backends/onnx";
import { mapValueToColor } from "./utils/colormaps";
import { getPresetPalette } from "./utils/palette";

export type RunOptions = {
  backend?: "auto" | "onnx" | "noop" | "tfjs";
  threads?: number | "auto";
};

export class ImageFlowPipeline {
  private static preprocCache: Map<
    string,
    { data: Buffer; width: number; height: number; channels: 1 | 2 | 3 | 4 }
  > = new Map();
  constructor(private readonly config: ImageFlowConfig) {}

  async run(options?: RunOptions): Promise<{ outputPath?: string }> {
    const { input } = this.config;
    if (input.type !== "image")
      throw new Error("Only image input is supported.");

    const inputAbs = path.resolve(process.cwd(), input.source);
    if (!fs.existsSync(inputAbs)) {
      const { PipelineError } = await import("./errors.js");
      throw new PipelineError(`Input image not found: ${input.source}`);
    }
    const tStart = performance.now();
    const logs: string[] = [];
    const logLine = (m: string) => {
      logs.push(`[${new Date().toISOString()}] ${m}`);
    };
    const logMem = (tag: string) => {
      try {
        const mu = process.memoryUsage();
        const rssMb = (mu.rss / (1024 * 1024)).toFixed(1);
        const heapMb = (mu.heapUsed / (1024 * 1024)).toFixed(1);
        logLine(`mem/rss=${rssMb}MB heap=${heapMb}MB tag=${tag}`);
      } catch {}
    };
    logLine("pipeline/start");
    // Apply threads override or config threads
    const threadsOverride = options?.threads;
    if (threadsOverride) {
      if (threadsOverride === "auto") {
        const cores = Math.max(1, os.cpus()?.length || 1);
        sharpModule.concurrency(cores);
      } else {
        const countNum = Number(threadsOverride);
        if (!Number.isNaN(countNum) && countNum > 0)
          sharpModule.concurrency(countNum);
      }
    } else if (this.config.execution?.threads?.apply) {
      const count = this.config.execution.threads.count;
      if (count === "auto") {
        const cores = Math.max(1, os.cpus()?.length || 1);
        sharpModule.concurrency(cores);
      } else if (count) {
        const num = Number(count);
        if (!Number.isNaN(num) && num > 0) sharpModule.concurrency(num);
      }
    }
    const image = sharp(inputAbs, { failOn: "none" });
    const originalMeta = await image.metadata();
    const tAfterLoad = performance.now();
    logLine(`load/done ms=${(tAfterLoad - tStart).toFixed(2)}`);
    logMem("load");

    // Preprocessing with optional cache
    let work = image.clone();
    const useCaching = !!this.config.execution?.useCaching;
    const cacheMode = (
      this.config.execution?.useCaching === true
        ? "memory"
        : this.config.execution?.useCaching === false
        ? undefined
        : (this.config.execution?.useCaching as any)
    ) as undefined | "memory" | "disk";
    const cacheDir = this.config.execution?.cacheDir
      ? path.resolve(process.cwd(), this.config.execution.cacheDir)
      : path.resolve(process.cwd(), ".imageflowio-cache");
    const preprocessSignature = JSON.stringify(this.config.preprocessing ?? {});
    const inputStat = fs.statSync(inputAbs);
    const cacheKey = `${inputAbs}|${inputStat.mtimeMs}|${preprocessSignature}`;
    let loadedFromCache = false;
    if (useCaching && cacheMode) {
      const cached = ImageFlowPipeline.preprocCache.get(cacheKey);
      if (cached) {
        work = sharp(cached.data, {
          raw: {
            width: cached.width,
            height: cached.height,
            channels: cached.channels as 1 | 2 | 3 | 4,
          },
        });
        loadedFromCache = true;
        logLine("cache/memory hit");
      } else if (cacheMode === "disk") {
        try {
          const keySafe = Buffer.from(cacheKey).toString("base64url");
          const metaPath = path.join(cacheDir, `${keySafe}.json`);
          const binPath = path.join(cacheDir, `${keySafe}.bin`);
          if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            const buf = fs.readFileSync(binPath);
            work = sharp(buf, {
              raw: {
                width: meta.width,
                height: meta.height,
                channels: meta.channels,
              },
            });
            loadedFromCache = true;
            logLine("cache/disk hit");
          }
        } catch {}
      }
    }

    // Preprocessing: resize, crop, grayscale, augmentations
    const pp = this.config.preprocessing;
    if (!loadedFromCache) {
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

      // Preprocessing: augmentations
      if (pp?.augmentations?.apply) {
        const methods: string[] = ((pp.augmentations as any).methods ||
          []) as string[];
        const params: any = (pp.augmentations as any).params || {};
        for (const method of methods) {
          if (method === "flip") {
            const axis =
              params?.flip?.axis || params?.flip?.direction || "horizontal";
            if (axis === "vertical") {
              work = work.flip();
            } else {
              work = work.flop();
            }
          } else if (method === "rotate") {
            const angle = Number(params?.rotate?.angle ?? 0);
            const allowed = [0, 90, 180, 270];
            const rot = allowed.includes(angle) ? angle : 0;
            if (rot !== 0) work = work.rotate(rot as 0 | 90 | 180 | 270);
          } else if (method === "colorJitter") {
            const brightness = Number(params?.colorJitter?.brightness ?? 1);
            const saturation = Number(params?.colorJitter?.saturation ?? 1);
            const hue = Number(params?.colorJitter?.hue ?? 0);
            work = work.modulate({
              brightness:
                isFinite(brightness) && brightness > 0 ? brightness : 1,
              saturation:
                isFinite(saturation) && saturation > 0 ? saturation : 1,
              hue: isFinite(hue) ? hue : 0,
            });
          }
        }
      }
      if (useCaching && cacheMode) {
        const { data, info } = await work
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const ch = Math.max(1, Math.min(4, info.channels ?? 3)) as
          | 1
          | 2
          | 3
          | 4;
        ImageFlowPipeline.preprocCache.set(cacheKey, {
          data,
          width: info.width ?? 0,
          height: info.height ?? 0,
          channels: ch,
        });
        if (cacheMode === "disk") {
          try {
            if (!fs.existsSync(cacheDir))
              fs.mkdirSync(cacheDir, { recursive: true });
            const keySafe = Buffer.from(cacheKey).toString("base64url");
            const metaPath = path.join(cacheDir, `${keySafe}.json`);
            const binPath = path.join(cacheDir, `${keySafe}.bin`);
            fs.writeFileSync(
              metaPath,
              JSON.stringify(
                {
                  width: info.width ?? 0,
                  height: info.height ?? 0,
                  channels: ch,
                },
                null,
                2
              ),
              "utf-8"
            );
            fs.writeFileSync(
              binPath,
              Buffer.from(data.buffer, data.byteOffset, data.byteLength)
            );
            logLine("cache/disk write");
          } catch {}
        }
      }
    }

    // Custom preprocessing hook
    if (this.config.custom?.preprocessingFn) {
      try {
        const abs = path.resolve(
          process.cwd(),
          this.config.custom.preprocessingFn
        );
        const mod: any = await import(abs);
        const fn = mod?.default || mod?.preprocess || mod?.run;
        if (typeof fn === "function") {
          const maybe = await fn(work.clone());
          if (maybe && typeof (maybe as any).metadata === "function") {
            work = maybe as any;
          }
        }
      } catch {
        // ignore custom preprocessing errors in preview
      }
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
      const srcChannels = info.channels ?? 3;
      const desiredChannels = pp?.format?.channels ?? srcChannels;
      const outChannels =
        desiredChannels === 1 || desiredChannels === 3
          ? desiredChannels
          : srcChannels;
      const floatData = new Float32Array(width * height * outChannels);
      const mean = pp?.normalize?.mean ?? [0, 0, 0];
      const std = pp?.normalize?.std ?? [1, 1, 1];
      const applyNorm = pp?.normalize?.apply === true;
      if (outChannels === srcChannels) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * srcChannels;
            for (let c = 0; c < srcChannels; c++) {
              const v = data[i + c] / 255;
              floatData[i + c] = applyNorm
                ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
                : v;
            }
          }
        }
      } else if (outChannels === 1 && srcChannels >= 3) {
        // RGB -> grayscale luminance
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * srcChannels;
            const r = data[i + 0] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (applyNorm) v = (v - (mean[0] ?? 0)) / (std[0] ?? 1);
            floatData[y * width + x] = v;
          }
        }
      } else if (outChannels === 3 && srcChannels === 1) {
        // grayscale -> RGB replicate
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const v0 = data[y * width + x] / 255;
            const r = applyNorm ? (v0 - (mean[0] ?? 0)) / (std[0] ?? 1) : v0;
            const g = applyNorm ? (v0 - (mean[1] ?? 0)) / (std[1] ?? 1) : v0;
            const b = applyNorm ? (v0 - (mean[2] ?? 0)) / (std[2] ?? 1) : v0;
            const j = (y * width + x) * 3;
            floatData[j + 0] = r;
            floatData[j + 1] = g;
            floatData[j + 2] = b;
          }
        }
      } else {
        // Fallback: copy min channels
        const ch = Math.min(outChannels, srcChannels);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const si = (y * width + x) * srcChannels;
            const di = (y * width + x) * outChannels;
            for (let c = 0; c < ch; c++) {
              const v = data[si + c] / 255;
              floatData[di + c] = applyNorm
                ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
                : v;
            }
          }
        }
      }
      // Apply channel order for model input (float path) if requested
      if (pp?.format?.channelOrder === "bgr" && outChannels >= 3) {
        for (let i = 0; i < width * height; i++) {
          const base = i * outChannels;
          const r = floatData[base + 0];
          const b = floatData[base + 2];
          floatData[base + 0] = b;
          floatData[base + 2] = r;
        }
      }
      inputTensor = { data: floatData, width, height, channels: outChannels };
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
    logLine(`preprocess/done ms=${(tAfterPre - tAfterLoad).toFixed(2)}`);
    logMem("preprocess");

    // Placeholder for inference: image-to-image identity transform (no-op)
    let out = work;
    // Inference via backend if float tensor is prepared
    let tAfterInfer = performance.now();
    if (inputTensor) {
      // Select backend: options override -> config.execution.backend -> extension heuristic
      let backendChoice: "auto" | "onnx" | "noop" | "tfjs" =
        options?.backend ?? ((this.config.execution?.backend as any) || "auto");
      if (backendChoice === "auto") {
        const modelPath = this.config.model.path;
        const lower = modelPath.toLowerCase();
        const absModel = path.isAbsolute(modelPath)
          ? modelPath
          : path.resolve(process.cwd(), modelPath);
        const looksOnnx = lower.endsWith(".onnx");
        const looksTfjs =
          lower.endsWith("model.json") ||
          (fs.existsSync(absModel) &&
            fs.statSync(absModel).isDirectory() &&
            fs.existsSync(path.join(absModel, "model.json")));
        backendChoice = looksOnnx ? "onnx" : looksTfjs ? "tfjs" : "noop";
      }
      let backend: InferenceBackend;
      if (backendChoice === "onnx") backend = new OnnxBackend();
      else if (backendChoice === "tfjs")
        backend = new (await import("./backends/tfjs.js")).TfjsBackend();
      else backend = new NoopBackend();
      try {
        const modelConfig = {
          path: this.config.model.path,
          layout: this.config.model.layout,
          inputName: this.config.model.inputName,
          outputName: this.config.model.outputName,
        };
        await backend.loadModel(modelConfig);
      } catch (e: any) {
        throw new (await import("./errors.js")).BackendLoadError(
          e?.message || String(e)
        );
      }

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
        } catch {}
      }

      const tiling = this.config.inference?.tiling;
      const doTiling = !!tiling?.apply;
      const scaleFactor = this.config.postprocessing?.denormalize?.scale ?? 255;

      if (doTiling) {
        logLine(
          `tiling/start tileSize=${tiling?.tileSize?.[0] ?? 256}x${
            tiling?.tileSize?.[1] ?? 256
          } overlap=${tiling?.overlap ?? 0} blend=${
            tiling?.blend ?? "average"
          } pad=${tiling?.padMode ?? "none"}`
        );
        const { data: baseData, info: baseInfo } = await work
          .clone()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const imgW = baseInfo.width ?? inputTensor.width;
        const imgH = baseInfo.height ?? inputTensor.height;
        const srcCh = baseInfo.channels ?? inputTensor.channels;
        const desiredCh = pp?.format?.channels ?? srcCh;
        const ch = desiredCh === 1 || desiredCh === 3 ? desiredCh : srcCh;
        const tileW = Math.max(1, tiling?.tileSize?.[0] ?? 256);
        const tileH = Math.max(1, tiling?.tileSize?.[1] ?? 256);
        const overlap = Math.max(0, tiling?.overlap ?? 0);
        const stepX = Math.max(1, tileW - overlap);
        const stepY = Math.max(1, tileH - overlap);
        const sum = new Float32Array(imgW * imgH * ch);
        const weight = new Float32Array(imgW * imgH);
        const blendMode = (tiling?.blend ?? "average") as
          | "average"
          | "max"
          | "feather";
        const maxVals =
          blendMode === "max"
            ? new Float32Array(imgW * imgH * ch).fill(-Infinity)
            : null;
        for (let y = 0; y < imgH; y += stepY) {
          const th = Math.min(tileH, imgH - y);
          for (let x = 0; x < imgW; x += stepX) {
            const tw = Math.min(tileW, imgW - x);
            logLine(`tiling/tile x=${x} y=${y} w=${tw} h=${th}`);
            // Extract tile
            const tileBuf = await sharp(baseData, {
              raw: { width: imgW, height: imgH, channels: ch },
            })
              .extract({ left: x, top: y, width: tw, height: th })
              .raw()
              .toBuffer();
            // Optional pad to fixed tile size for inference
            const needPad =
              tiling?.padMode && (tw < tileW || th < tileH) ? true : false;
            const inferW = needPad ? tileW : tw;
            const inferH = needPad ? tileH : th;
            let tileInBuf: Buffer = tileBuf;
            if (needPad) {
              const mode = tiling?.padMode ?? "reflect";
              if (mode === "zero") {
                const pad = Buffer.alloc(inferW * inferH * srcCh, 0);
                for (let iy = 0; iy < th; iy++) {
                  for (let ix = 0; ix < tw; ix++) {
                    const si = (iy * tw + ix) * srcCh;
                    const di = (iy * inferW + ix) * srcCh;
                    for (let c0 = 0; c0 < srcCh; c0++)
                      pad[di + c0] = tileBuf[si + c0];
                  }
                }
                tileInBuf = pad;
              } else {
                const extendWith = mode === "edge" ? "copy" : "mirror";
                tileInBuf = await sharp(tileBuf, {
                  raw: { width: tw, height: th, channels: srcCh },
                })
                  .extend({
                    top: 0,
                    left: 0,
                    right: tileW - tw,
                    bottom: tileH - th,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                    extendWith,
                  })
                  .raw()
                  .toBuffer();
              }
            }
            // to float + normalize
            const tileFloat = new Float32Array(inferW * inferH * ch);
            const mean = pp?.normalize?.mean ?? [0, 0, 0];
            const std = pp?.normalize?.std ?? [1, 1, 1];
            const applyNorm = pp?.normalize?.apply === true;
            if (ch === srcCh) {
              for (let i = 0; i < inferW * inferH; i++) {
                for (let c = 0; c < ch; c++) {
                  const v = tileInBuf[i * srcCh + c] / 255;
                  tileFloat[i * ch + c] = applyNorm
                    ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
                    : v;
                }
              }
            } else if (ch === 1 && srcCh >= 3) {
              for (let i = 0; i < inferW * inferH; i++) {
                const r = tileInBuf[i * srcCh + 0] / 255;
                const g = tileInBuf[i * srcCh + 1] / 255;
                const b = tileInBuf[i * srcCh + 2] / 255;
                let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                if (applyNorm) v = (v - (mean[0] ?? 0)) / (std[0] ?? 1);
                tileFloat[i] = v;
              }
            } else if (ch === 3 && srcCh === 1) {
              for (let i = 0; i < inferW * inferH; i++) {
                const v0 = tileInBuf[i] / 255;
                tileFloat[i * 3 + 0] = applyNorm
                  ? (v0 - (mean[0] ?? 0)) / (std[0] ?? 1)
                  : v0;
                tileFloat[i * 3 + 1] = applyNorm
                  ? (v0 - (mean[1] ?? 0)) / (std[1] ?? 1)
                  : v0;
                tileFloat[i * 3 + 2] = applyNorm
                  ? (v0 - (mean[2] ?? 0)) / (std[2] ?? 1)
                  : v0;
              }
            } else {
              // fallback copy min
              const copyCh = Math.min(ch, srcCh);
              for (let i = 0; i < inferW * inferH; i++) {
                for (let c = 0; c < copyCh; c++) {
                  const v = tileInBuf[i * srcCh + c] / 255;
                  tileFloat[i * ch + c] = applyNorm
                    ? (v - (mean[c] ?? 0)) / (std[c] ?? 1)
                    : v;
                }
              }
            }
            // Apply channel order for model input (tile float path)
            if (pp?.format?.channelOrder === "bgr" && ch >= 3) {
              for (let i = 0; i < inferW * inferH; i++) {
                const base = i * ch;
                const r = tileFloat[base + 0];
                const b = tileFloat[base + 2];
                tileFloat[base + 0] = b;
                tileFloat[base + 2] = r;
              }
            }
            const tileOut = await backend.infer({
              data: tileFloat,
              width: inferW,
              height: inferH,
              channels: ch,
              // optional backend-specific hints
              ...(this.config.model.inputName
                ? { inputName: this.config.model.inputName }
                : {}),
              ...(this.config.model.outputName
                ? { outputName: this.config.model.outputName }
                : {}),
            } as any);
            // accumulate
            if (blendMode === "max" && maxVals) {
              for (let ty = 0; ty < th; ty++) {
                const gy = y + ty;
                for (let tx = 0; tx < tw; tx++) {
                  const gx = x + tx;
                  const gi = gy * imgW + gx;
                  const pi = (ty * inferW + tx) * ch;
                  const go = gi * ch;
                  for (let c = 0; c < ch; c++) {
                    const v = tileOut.data[pi + c] * scaleFactor;
                    if (v > maxVals[go + c]) maxVals[go + c] = v;
                  }
                }
              }
            } else {
              for (let ty = 0; ty < th; ty++) {
                const gy = y + ty;
                for (let tx = 0; tx < tw; tx++) {
                  const gx = x + tx;
                  const gi = gy * imgW + gx;
                  const pi = (ty * inferW + tx) * ch;
                  const go = gi * ch;
                  let w = 1;
                  if (blendMode === "feather") {
                    const distX = Math.min(tx + 1, tw - tx);
                    const distY = Math.min(ty + 1, th - ty);
                    w = Math.max(1, distX * distY);
                  }
                  weight[gi] += w;
                  for (let c = 0; c < ch; c++) {
                    sum[go + c] += tileOut.data[pi + c] * scaleFactor * w;
                  }
                }
              }
            }
          }
        }
        // finalize
        const outBuf = Buffer.alloc(imgW * imgH * ch);
        if (blendMode === "max" && maxVals) {
          for (let i = 0; i < imgW * imgH; i++) {
            const base = i * ch;
            for (let c = 0; c < ch; c++) {
              const v = Math.max(
                0,
                Math.min(255, Math.round(maxVals[base + c]))
              );
              outBuf[base + c] = v;
            }
          }
        } else {
          for (let i = 0; i < imgW * imgH; i++) {
            const w = weight[i] || 1;
            const base = i * ch;
            for (let c = 0; c < ch; c++) {
              const v = Math.max(
                0,
                Math.min(255, Math.round(sum[base + c] / w))
              );
              outBuf[base + c] = v;
            }
          }
        }
        out = sharp(outBuf, {
          raw: { width: imgW, height: imgH, channels: ch },
        });
        logLine("tiling/done");
      } else {
        // For now, we assume backends consume NHWC; if model.layout === 'nchw', a conversion could be inserted here.
        let result;
        try {
          result = await backend.infer({
            data: inputTensor.data,
            width: inputTensor.width,
            height: inputTensor.height,
            channels: inputTensor.channels,
            layout: this.config.model.layout || "nhwc",
            ...(this.config.model.inputName
              ? { inputName: this.config.model.inputName }
              : {}),
            ...(this.config.model.outputName
              ? { outputName: this.config.model.outputName }
              : {}),
          } as any);
        } catch (e: any) {
          const { InferenceError } = await import("./errors.js");
          throw new InferenceError(e?.message || String(e));
        }
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
      logLine(`inference/done ms=${(tAfterInfer - tAfterPre).toFixed(2)}`);
      logMem("inference");
      if (backend.dispose) await backend.dispose();
    }

    // Postprocessing
    const post = this.config.postprocessing;
    // Activation / clamp / denormalize on 8-bit data
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
      // Outline overlay with optional thickness
      if (post.paletteMap.outline?.apply) {
        const color = post.paletteMap.outline.color ?? [255, 0, 0];
        const thickness = Math.max(1, post.paletteMap.outline.thickness ?? 1);
        const mask = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const cls = classIdx[i];
            const leftDiff = x > 0 && classIdx[i - 1] !== cls;
            const topDiff = y > 0 && classIdx[i - width] !== cls;
            if (leftDiff || topDiff) mask[i] = 1;
          }
        }
        if (thickness > 1) {
          const r = thickness - 1;
          const dilated = new Uint8Array(width * height);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (!mask[y * width + x]) continue;
              for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    dilated[ny * width + nx] = 1;
                  }
                }
              }
            }
          }
          for (let i = 0; i < width * height; i++) if (dilated[i]) mask[i] = 1;
        }
        for (let i = 0; i < width * height; i++) {
          if (mask[i]) {
            const j = i * 3;
            rgb[j] = color[0];
            rgb[j + 1] = color[1];
            rgb[j + 2] = color[2];
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

    // Custom postprocessing hook
    if (this.config.custom?.postprocessingFn) {
      try {
        const abs = path.resolve(
          process.cwd(),
          this.config.custom.postprocessingFn
        );
        const mod: any = await import(abs);
        const fn = mod?.default || mod?.postprocess || mod?.run;
        if (typeof fn === "function") {
          const maybe = await fn(out.clone());
          if (maybe && typeof (maybe as any).metadata === "function") {
            out = maybe as any;
          }
        }
      } catch {
        // ignore custom postprocessing errors in preview
      }
    }
    const tAfterPost = performance.now();
    logLine(`postprocess/done ms=${(tAfterPost - tAfterInfer).toFixed(2)}`);
    logMem("postprocess");

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
            const bd = output.save.bitDepth as any as number | undefined;
            const pngOpts: any = { compressionLevel: 9 };
            if (bd === 8 || bd === 16) pngOpts.bitdepth = bd as any;
            await chSharp.png(pngOpts).toFile(chTarget);
          } else if (format === "jpeg") {
            await chSharp
              .jpeg({ quality: output.save.quality ?? 90 })
              .toFile(chTarget);
          } else if (format === "webp") {
            await chSharp
              .webp({ quality: output.save.quality ?? 90 })
              .toFile(chTarget);
          } else if (format === "tiff") {
            const bd = output.save.bitDepth as any as number | undefined;
            const tiffOpts: any = { quality: output.save.quality ?? 90 };
            if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
              tiffOpts.bitdepth = bd as any;
            await chSharp.tiff(tiffOpts).toFile(chTarget);
          } else {
            await chSharp.toFile(chTarget);
          }
        }
        // Also save the combined multi-channel image
        if (format === "png") {
          const bd = output.save.bitDepth as any as number | undefined;
          const pngOpts: any = { compressionLevel: 9 };
          if (bd === 8 || bd === 16) pngOpts.bitdepth = bd as any;
          try {
            await out.png(pngOpts).toFile(target);
          } catch (e: any) {
            const { SaveError } = await import("./errors.js");
            throw new SaveError(e?.message || String(e));
          }
        } else if (format === "jpeg") {
          try {
            await out
              .jpeg({ quality: output.save.quality ?? 90 })
              .toFile(target);
          } catch (e: any) {
            const { SaveError } = await import("./errors.js");
            throw new SaveError(e?.message || String(e));
          }
        } else if (format === "webp") {
          try {
            await out
              .webp({ quality: output.save.quality ?? 90 })
              .toFile(target);
          } catch (e: any) {
            const { SaveError } = await import("./errors.js");
            throw new SaveError(e?.message || String(e));
          }
        } else if (format === "tiff") {
          const bd = output.save.bitDepth as any as number | undefined;
          const tiffOpts: any = { quality: output.save.quality ?? 90 };
          if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
            tiffOpts.bitdepth = bd as any;
          try {
            await out.tiff(tiffOpts).toFile(target);
          } catch (e: any) {
            const { SaveError } = await import("./errors.js");
            throw new SaveError(e?.message || String(e));
          }
        } else {
          try {
            await out.toFile(target);
          } catch (e: any) {
            const { SaveError } = await import("./errors.js");
            throw new SaveError(e?.message || String(e));
          }
        }
        logLine(`save/done path=${target}`);
      } else {
        if (format === "png") {
          const bd = output.save.bitDepth as any as number | undefined;
          const pngOpts: any = { compressionLevel: 9 };
          if (bd === 8 || bd === 16) pngOpts.bitdepth = bd as any;
          await out.png(pngOpts).toFile(target);
        } else if (format === "jpeg") {
          await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "webp") {
          await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "tiff") {
          const bd = output.save.bitDepth as any as number | undefined;
          const tiffOpts: any = { quality: output.save.quality ?? 90 };
          if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
            tiffOpts.bitdepth = bd as any;
          await out.tiff(tiffOpts).toFile(target);
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
        const vizAlpha = Math.max(
          0,
          Math.min(1, this.config.visualization?.alpha ?? 0.5)
        );
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
          const vpath = path.join(vizDir, vizName);
          await canvas.toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
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
          const vpath = path.join(vizDir, vizName);
          await sharp(diff, { raw: { width: w, height: h, channels: 3 } })
            .png()
            .toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
        } else if (vizType === "overlay") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const base = await sharp(inputAbs, { failOn: "none" })
            .resize({ width: w, height: h, fit: "fill" })
            .png()
            .toBuffer();
          const overlay = await out
            .clone()
            .ensureAlpha(vizAlpha)
            .png()
            .toBuffer();
          const viz = sharp(base)
            .composite([{ input: overlay, blend: "over" }])
            .png();
          const vizName = path.parse(target).name + "_overlay.png";
          const vpath = path.join(vizDir, vizName);
          await viz.toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
        } else if (vizType === "heatmap") {
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
          const heat = Buffer.alloc(w * h * 3);
          for (let i = 0; i < w * h; i++) {
            let acc = 0;
            for (let c = 0; c < ch; c++) {
              const lv = left.data[i * lc + c] || 0;
              const rv = right.data[i * rc + c] || 0;
              acc += Math.abs(lv - rv);
            }
            const val = Math.max(0, Math.min(255, Math.round(acc / ch)));
            const [r, g, b] = mapValueToColor(val, "magma");
            const j = i * 3;
            heat[j] = r;
            heat[j + 1] = g;
            heat[j + 2] = b;
          }
          const vizName = path.parse(target).name + "_heatmap.png";
          const vpath = path.join(vizDir, vizName);
          await sharp(heat, { raw: { width: w, height: h, channels: 3 } })
            .png()
            .toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
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
      // Write logs if requested
      if (this.config.logging?.saveLogs) {
        try {
          const logPath = this.config.logging.logPath
            ? path.resolve(process.cwd(), this.config.logging.logPath)
            : path.resolve(process.cwd(), "logs/inference.log");
          const ldir = path.dirname(logPath);
          if (!fs.existsSync(ldir)) fs.mkdirSync(ldir, { recursive: true });
          const totalMs = performance.now() - tStart;
          logs.push(
            `[${new Date().toISOString()}] total ms=${totalMs.toFixed(2)}`
          );
          try {
            const mu = process.memoryUsage();
            const rssMb = (mu.rss / (1024 * 1024)).toFixed(1);
            const heapMb = (mu.heapUsed / (1024 * 1024)).toFixed(1);
            logs.push(
              `[${new Date().toISOString()}] mem/rss=${rssMb}MB heap=${heapMb}MB tag=end`
            );
          } catch {}
          const level = (this.config.logging.level || "info") as
            | "debug"
            | "info"
            | "error";
          let lines = logs;
          if (level === "error") {
            lines = logs.filter((l) => l.includes("total ms="));
          } else if (level === "info") {
            lines = logs.filter(
              (l) =>
                l.includes("/done") ||
                l.includes("pipeline/start") ||
                l.includes("total ms=")
            );
          }
          fs.writeFileSync(logPath, lines.join("\n"), "utf-8");
        } catch {}
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
        } else if (format === "npz") {
          const { writeNpz } = await import("./utils/npy.js");
          if (dtype === "float32") {
            const float = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++) float[i] = arr[i] / 255;
            writeNpz(rawPath.replace(/\.npy$/i, ".npz"), [
              {
                name: "output",
                data: float as unknown as Float32Array,
                shape: [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
                dtype: "float32",
              },
            ]);
          } else {
            writeNpz(rawPath.replace(/\.npy$/i, ".npz"), [
              {
                name: "output",
                data: arr,
                shape: [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
                dtype: "uint8",
              },
            ]);
          }
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
