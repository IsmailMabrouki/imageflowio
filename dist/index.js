"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BackendLoadError: () => BackendLoadError,
  ConfigValidationError: () => ConfigValidationError,
  ImageFlowError: () => ImageFlowError,
  ImageFlowPipeline: () => ImageFlowPipeline,
  InferenceError: () => InferenceError,
  PipelineError: () => PipelineError
});
module.exports = __toCommonJS(src_exports);

// src/pipeline.ts
var import_fs2 = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_sharp = __toESM(require("sharp"));
var import_sharp2 = __toESM(require("sharp"));

// src/utils/npy.ts
var import_fs = __toESM(require("fs"));
function getDescr(dtype) {
  switch (dtype) {
    case "float32":
      return "<f4";
    case "uint8":
      return "|u1";
    default:
      throw new Error(`Unsupported dtype for NPY: ${dtype}`);
  }
}
function writeNpy(filePath, data, shape, dtype) {
  const magic = Buffer.from("\x93NUMPY", "binary");
  const version = Buffer.from([1, 0]);
  const descr = getDescr(dtype);
  const shapeStr = `(${shape.join(", ")}${shape.length === 1 ? "," : ""})`;
  const headerObj = `{ 'descr': '${descr}', 'fortran_order': False, 'shape': ${shapeStr}, }`;
  const headerLen = 10 + 2 + 2;
  let headerText = headerObj;
  const baseLen = magic.length + version.length + 2;
  let totalLen = baseLen + headerText.length + 1;
  const pad = 16 - totalLen % 16;
  if (pad > 0 && pad < 16)
    headerText = headerText + " ".repeat(pad - 1);
  headerText += "\n";
  const headerBuf = Buffer.from(headerText, "latin1");
  const headerSize = Buffer.alloc(2);
  headerSize.writeUInt16LE(headerBuf.length, 0);
  const payload = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const out = Buffer.concat([magic, version, headerSize, headerBuf, payload]);
  import_fs.default.writeFileSync(filePath, out);
}

// src/pipeline.ts
var import_node_perf_hooks = require("perf_hooks");

// src/backends/noop.ts
var NoopBackend = class {
  constructor() {
    this.name = "noop";
  }
  async loadModel(_modelPath) {
    return;
  }
  async infer(input) {
    return {
      data: input.data,
      width: input.width,
      height: input.height,
      channels: Math.max(1, Math.min(4, input.channels))
    };
  }
};

// src/backends/onnx.ts
var _OnnxBackend = class _OnnxBackend {
  constructor() {
    this.name = "onnxruntime-node";
    this.session = null;
    this.ort = null;
  }
  async loadModel(modelPath) {
    try {
      this.ort = require("onnxruntime-node");
      const ort = this.ort;
      const cached = _OnnxBackend.sessionCache.get(modelPath);
      if (cached) {
        this.session = cached;
        return;
      }
      this.session = await ort.InferenceSession.create(modelPath);
      _OnnxBackend.sessionCache.set(modelPath, this.session);
    } catch (err) {
      throw new Error(
        `Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend. Underlying error: ${String(
          err
        )}`
      );
    }
  }
  async infer(input) {
    if (!this.session || !this.ort)
      throw new Error("ONNX session not initialized");
    const ort = this.ort;
    const nhwcShape = [1, input.height, input.width, input.channels];
    const tensor = new ort.Tensor("float32", input.data, nhwcShape);
    const inputName = this.session.inputNames?.[0] ?? "input";
    const feeds = {};
    feeds[inputName] = tensor;
    const results = await this.session.run(feeds);
    const firstOutputName = Object.keys(results)[0];
    const outTensor = results[firstOutputName];
    const data = outTensor.data;
    const dims = outTensor.dims || nhwcShape;
    let width = input.width;
    let height = input.height;
    let channels = input.channels;
    if (dims.length === 4) {
      const [n, h, w, c] = dims;
      if (n === 1 && h > 0 && w > 0 && c > 0) {
        width = w;
        height = h;
        channels = Math.max(1, Math.min(4, c));
      }
    }
    return { data, width, height, channels };
  }
  // Sessions are cached; dispose is a no-op in this preview
  async dispose() {
    return;
  }
};
_OnnxBackend.sessionCache = /* @__PURE__ */ new Map();
var OnnxBackend = _OnnxBackend;

// src/utils/colormaps.ts
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t))
  ];
}
function findStops(stops, t) {
  if (t <= stops[0].t)
    return [stops[0], stops[0], 0];
  if (t >= stops[stops.length - 1].t)
    return [stops[stops.length - 1], stops[stops.length - 1], 0];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const nt = (t - a.t) / (b.t - a.t);
      return [a, b, nt];
    }
  }
  return [stops[0], stops[0], 0];
}
function getStops(mode) {
  switch (mode) {
    case "viridis":
      return [
        { t: 0, color: [68, 1, 84] },
        { t: 0.25, color: [59, 82, 139] },
        { t: 0.5, color: [33, 145, 140] },
        { t: 0.75, color: [94, 201, 98] },
        { t: 1, color: [253, 231, 37] }
      ];
    case "magma":
      return [
        { t: 0, color: [0, 0, 4] },
        { t: 0.25, color: [84, 15, 109] },
        { t: 0.5, color: [187, 55, 84] },
        { t: 0.75, color: [249, 142, 8] },
        { t: 1, color: [252, 253, 191] }
      ];
    case "plasma":
      return [
        { t: 0, color: [13, 8, 135] },
        { t: 0.25, color: [126, 3, 168] },
        { t: 0.5, color: [203, 71, 119] },
        { t: 0.75, color: [248, 149, 64] },
        { t: 1, color: [240, 249, 33] }
      ];
    case "grayscale":
    default:
      return [
        { t: 0, color: [0, 0, 0] },
        { t: 1, color: [255, 255, 255] }
      ];
  }
}
function mapValueToColor(v, mode) {
  if (mode === "grayscale")
    return [v, v, v];
  const t = Math.max(0, Math.min(1, v / 255));
  const stops = getStops(mode);
  const [a, b, nt] = findStops(stops, t);
  return lerpColor(a.color, b.color, nt);
}

// src/utils/palette.ts
var PASCAL_VOC = [
  [0, 0, 0],
  [128, 0, 0],
  [0, 128, 0],
  [128, 128, 0],
  [0, 0, 128],
  [128, 0, 128],
  [0, 128, 128],
  [128, 128, 128],
  [64, 0, 0],
  [192, 0, 0],
  [64, 128, 0],
  [192, 128, 0],
  [64, 0, 128],
  [192, 0, 128],
  [64, 128, 128],
  [192, 128, 128],
  [0, 64, 0],
  [128, 64, 0],
  [0, 192, 0],
  [128, 192, 0],
  [0, 64, 128]
];
function getPresetPalette(name) {
  switch (name.toLowerCase()) {
    case "pascal_voc":
      return PASCAL_VOC;
    default:
      return PASCAL_VOC;
  }
}

// src/pipeline.ts
var ImageFlowPipeline = class {
  constructor(config) {
    this.config = config;
  }
  async run(options) {
    const { input } = this.config;
    if (input.type !== "image")
      throw new Error("Only image input is supported in this preview.");
    const inputAbs = import_path.default.resolve(process.cwd(), input.source);
    if (!import_fs2.default.existsSync(inputAbs)) {
      throw new Error(`Input image not found: ${input.source}`);
    }
    const tStart = import_node_perf_hooks.performance.now();
    const threadsOverride = options?.threads;
    if (threadsOverride && threadsOverride !== "auto") {
      const countNum = Number(threadsOverride);
      if (!Number.isNaN(countNum) && countNum > 0)
        import_sharp2.default.concurrency(countNum);
    } else if (this.config.execution?.threads?.apply) {
      const count = this.config.execution.threads.count;
      if (count && count !== "auto") {
        const num = Number(count);
        if (!Number.isNaN(num) && num > 0)
          import_sharp2.default.concurrency(num);
      }
    }
    const image = (0, import_sharp.default)(inputAbs, { failOn: "none" });
    const originalMeta = await image.metadata();
    const tAfterLoad = import_node_perf_hooks.performance.now();
    let work = image.clone();
    const pp = this.config.preprocessing;
    if (pp?.resize?.apply && pp.resize.imageSize) {
      const [w, h] = pp.resize.imageSize;
      if (pp.resize.keepAspectRatio) {
        const fit = pp.resize.resizeMode === "fill" ? "fill" : "inside";
        work = work.resize({
          width: w,
          height: h,
          fit,
          withoutEnlargement: false
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
        position: import_sharp.default.strategy.attention
      });
    }
    if (pp?.grayscale?.apply) {
      work = work.grayscale();
    }
    let inputTensor = null;
    const needFloatTensor = pp?.normalize?.apply || pp?.format?.dataType === "float32";
    if (needFloatTensor) {
      const { data, info } = await work.clone().raw().toBuffer({ resolveWithObject: true });
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
            floatData[i + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
          }
        }
      }
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
    if (!needFloatTensor && pp?.format?.channelOrder === "bgr") {
      const { data, info } = await work.clone().raw().toBuffer({ resolveWithObject: true });
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
        work = (0, import_sharp.default)(data, { raw: { width, height, channels } });
      }
    }
    const tAfterPre = import_node_perf_hooks.performance.now();
    let out = work;
    let tAfterInfer = import_node_perf_hooks.performance.now();
    if (inputTensor) {
      let backendChoice = options?.backend ?? "auto";
      if (backendChoice === "auto") {
        backendChoice = this.config.model.path.toLowerCase().endsWith(".onnx") ? "onnx" : "noop";
      }
      let backend = backendChoice === "onnx" ? new OnnxBackend() : new NoopBackend();
      await backend.loadModel(this.config.model.path);
      const warmupRuns = Math.max(0, this.config.execution?.warmupRuns ?? 0);
      if (warmupRuns > 0 && inputTensor) {
        try {
          for (let i = 0; i < warmupRuns; i++) {
            await backend.infer({
              data: inputTensor.data,
              width: inputTensor.width,
              height: inputTensor.height,
              channels: inputTensor.channels
            });
          }
        } catch {
        }
      }
      const tiling = this.config.inference?.tiling;
      const doTiling = !!tiling?.apply;
      const scaleFactor = this.config.postprocessing?.denormalize?.scale ?? 255;
      if (doTiling) {
        const { data: baseData, info: baseInfo } = await work.clone().raw().toBuffer({ resolveWithObject: true });
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
            const tileBuf = await (0, import_sharp.default)(baseData, {
              raw: { width: imgW, height: imgH, channels: ch }
            }).extract({ left: x, top: y, width: tw, height: th }).raw().toBuffer();
            const tileFloat = new Float32Array(tw * th * ch);
            const mean = pp?.normalize?.mean ?? [0, 0, 0];
            const std = pp?.normalize?.std ?? [1, 1, 1];
            const applyNorm = pp?.normalize?.apply === true;
            for (let i = 0; i < tw * th; i++) {
              for (let c = 0; c < ch; c++) {
                const v = tileBuf[i * ch + c] / 255;
                tileFloat[i * ch + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
              }
            }
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
              channels: ch
            });
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
        const outBuf = Buffer.alloc(imgW * imgH * ch);
        for (let i = 0; i < imgW * imgH; i++) {
          const w = weight[i] || 1;
          const base = i * ch;
          for (let c = 0; c < ch; c++) {
            const v = Math.max(0, Math.min(255, Math.round(sum[base + c] / w)));
            outBuf[base + c] = v;
          }
        }
        out = (0, import_sharp.default)(outBuf, {
          raw: { width: imgW, height: imgH, channels: ch }
        });
      } else {
        const result = await backend.infer({
          data: inputTensor.data,
          width: inputTensor.width,
          height: inputTensor.height,
          channels: inputTensor.channels
        });
        const uint8 = Buffer.alloc(result.data.length);
        for (let i = 0; i < result.data.length; i++) {
          uint8[i] = Math.max(
            0,
            Math.min(255, Math.round(result.data[i] * scaleFactor))
          );
        }
        out = (0, import_sharp.default)(uint8, {
          raw: {
            width: result.width,
            height: result.height,
            channels: Math.max(1, Math.min(4, result.channels))
          }
        });
      }
      tAfterInfer = import_node_perf_hooks.performance.now();
      if (backend.dispose)
        await backend.dispose();
    }
    const post = this.config.postprocessing;
    if (post?.activation?.apply || post?.clamp?.apply || post?.denormalize?.apply) {
      const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
      const channels = info.channels ?? 3;
      const len = (info.width ?? 0) * (info.height ?? 0) * channels;
      for (let idx = 0; idx < len; idx++) {
        let v = data[idx] / 255;
        if (post.activation?.apply) {
          if (post.activation.type === "sigmoid") {
            const x = v * 2 - 1;
            v = 1 / (1 + Math.exp(-x));
          } else if (post.activation.type === "tanh") {
            const x = v * 2 - 1;
            v = Math.tanh(x) * 0.5 + 0.5;
          }
        }
        if (post.clamp?.apply) {
          const min = Math.max(0, post.clamp.min ?? 0);
          const max = Math.min(1, post.clamp.max ?? 1);
          if (v < min)
            v = min;
          if (v > max)
            v = max;
        }
        if (post.denormalize?.apply) {
          const scale = post.denormalize.scale ?? 255;
          v = v * (scale / 255);
        }
        data[idx] = Math.max(0, Math.min(255, Math.round(v * 255)));
      }
      out = (0, import_sharp.default)(data, {
        raw: { width: info.width ?? 0, height: info.height ?? 0, channels }
      });
    }
    if (post?.toneMap?.apply) {
      const method = post.toneMap.method ?? "reinhard";
      const exposure = post.toneMap.exposure ?? 0;
      const gamma = post.toneMap.gamma ?? 2.2;
      const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
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
          let yMapped;
          if (method === "aces" || method === "filmic") {
            const a = 2.51, b1 = 0.03, c = 2.43, d = 0.59, e = 0.14;
            yMapped = y * (a * y + b1) / (y * (c * y + d) + e);
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
        for (let i = 0; i < width * height; i++) {
          const v0 = data[i] / 255 * expMul;
          let v = v0;
          if (method === "aces" || method === "filmic") {
            const a = 2.51, b1 = 0.03, c = 2.43, d = 0.59, e = 0.14;
            v = v * (a * v + b1) / (v * (c * v + d) + e);
          } else {
            v = v / (1 + v);
          }
          if (gamma > 0)
            v = Math.pow(Math.max(0, Math.min(1, v)), 1 / gamma);
          data[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
        }
      }
      out = (0, import_sharp.default)(data, { raw: { width, height, channels } });
    }
    if (post?.colorMap?.apply) {
      const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 1;
      const ch = Math.min(
        post.colorMap.channel ?? 0,
        Math.max(0, channels - 1)
      );
      const rgb = Buffer.alloc(width * height * 3);
      const mode = post.colorMap.mode ?? "grayscale";
      for (let i = 0; i < width * height; i++) {
        const v = data[i * channels + ch];
        const [r, g, b] = mapValueToColor(v, mode);
        const j = i * 3;
        rgb[j] = r;
        rgb[j + 1] = g;
        rgb[j + 2] = b;
      }
      out = (0, import_sharp.default)(rgb, { raw: { width, height, channels: 3 } });
    }
    if (post?.paletteMap?.apply) {
      const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const channels = info.channels ?? 1;
      const source = post.paletteMap.source ?? "argmax";
      const palette = (() => {
        const p = post.paletteMap?.palette;
        if (!p)
          return getPresetPalette("pascal_voc");
        if (p.mode === "preset")
          return getPresetPalette(p.preset ?? "pascal_voc");
        if (p.mode === "inline" && p.inline && p.inline.length > 0)
          return p.inline;
        if (p.mode === "file" && p.file) {
          try {
            const abs = import_path.default.resolve(process.cwd(), p.file);
            if (import_fs2.default.existsSync(abs)) {
              const arr = JSON.parse(import_fs2.default.readFileSync(abs, "utf-8"));
              if (Array.isArray(arr) && arr.length > 0)
                return arr;
            }
          } catch {
          }
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
      if (post.paletteMap.outline?.apply) {
        const color = post.paletteMap.outline.color ?? [255, 0, 0];
        const thickness = Math.max(1, post.paletteMap.outline.thickness ?? 1);
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
      out = (0, import_sharp.default)(rgb, { raw: { width, height, channels: 3 } });
    }
    if (post?.resizeTo === "input" && originalMeta.width && originalMeta.height) {
      out = out.resize({
        width: originalMeta.width,
        height: originalMeta.height,
        fit: "fill"
      });
    } else if (Array.isArray(post?.resizeTo)) {
      const size = post?.resizeTo;
      out = out.resize({ width: size[0], height: size[1], fit: "fill" });
    }
    if (post?.blendOverlay?.apply) {
      const meta = await out.metadata();
      const base = (0, import_sharp.default)(inputAbs, { failOn: "none" }).resize({
        width: meta.width ?? void 0,
        height: meta.height ?? void 0,
        fit: "fill"
      });
      const alpha = Math.max(0, Math.min(1, post.blendOverlay.alpha ?? 0.5));
      const overlayBuf = await out.clone().ensureAlpha(alpha).png().toBuffer();
      out = base.composite([{ input: overlayBuf, blend: "over" }]);
    }
    const tAfterPost = import_node_perf_hooks.performance.now();
    const output = this.config.output;
    if (output?.save?.apply) {
      const dir = import_path.default.resolve(process.cwd(), output.save.path ?? "./outputs");
      if (!import_fs2.default.existsSync(dir))
        import_fs2.default.mkdirSync(dir, { recursive: true });
      const filename = (output.save.filename ?? "{model}_{timestamp}.png").replace(
        "{model}",
        this.config.model.name ?? import_path.default.parse(this.config.model.path).name
      ).replace("{timestamp}", (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"));
      const target = import_path.default.join(dir, filename);
      const format = (output.save.format ?? "png").toLowerCase();
      if (output.save.linearToSRGB) {
        const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
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
            const srgb = lv <= 31308e-7 ? 12.92 * lv : 1.055 * Math.pow(lv, 1 / 2.4) - 0.055;
            comp[base + c] = Math.max(0, Math.min(255, Math.round(srgb * 255)));
          }
          if (isRGBA)
            comp[base + 3] = data[base + 3];
        }
        out = (0, import_sharp.default)(comp, { raw: { width, height, channels } });
      }
      if (output.save.splitChannels) {
        const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
        const width = info.width ?? 0;
        const height = info.height ?? 0;
        const channels = info.channels ?? 1;
        const base = import_path.default.parse(target).name;
        const ext = format;
        for (let c = 0; c < channels; c++) {
          const chName = output.save.channelNames?.[c] ?? `C${c}`;
          const chBuf = Buffer.alloc(width * height);
          for (let i = 0; i < width * height; i++) {
            chBuf[i] = data[i * channels + c];
          }
          const chSharp = (0, import_sharp.default)(chBuf, { raw: { width, height, channels: 1 } });
          const chTarget = import_path.default.join(dir, `${base}_${chName}.${ext}`);
          if (format === "png") {
            await chSharp.png({ compressionLevel: 9 }).toFile(chTarget);
          } else if (format === "jpeg") {
            await chSharp.jpeg({ quality: output.save.quality ?? 90 }).toFile(chTarget);
          } else if (format === "webp") {
            await chSharp.webp({ quality: output.save.quality ?? 90 }).toFile(chTarget);
          } else if (format === "tiff") {
            await chSharp.tiff({
              quality: output.save.quality ?? 90,
              bitdepth: output.save.bitDepth ?? 8
            }).toFile(chTarget);
          } else {
            await chSharp.toFile(chTarget);
          }
        }
        if (format === "png") {
          await out.png({ compressionLevel: 9 }).toFile(target);
        } else if (format === "jpeg") {
          await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "webp") {
          await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "tiff") {
          await out.tiff({
            quality: output.save.quality ?? 90,
            bitdepth: output.save.bitDepth ?? 8
          }).toFile(target);
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
          await out.tiff({
            quality: output.save.quality ?? 90,
            bitdepth: output.save.bitDepth ?? 8
          }).toFile(target);
        } else {
          await out.toFile(target);
        }
      }
      if (this.config.visualization?.apply) {
        const vizType = this.config.visualization.type ?? "sideBySide";
        const vizDir = import_path.default.resolve(
          process.cwd(),
          this.config.visualization.outputPath || output.save.path || dir
        );
        if (!import_fs2.default.existsSync(vizDir))
          import_fs2.default.mkdirSync(vizDir, { recursive: true });
        if (vizType === "sideBySide") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const leftBuf = await (0, import_sharp.default)(inputAbs, { failOn: "none" }).resize({ width: w, height: h, fit: "fill" }).png().toBuffer();
          const rightBuf = await out.clone().png().toBuffer();
          const canvas = (0, import_sharp.default)({
            create: {
              width: w * 2,
              height: h,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
          }).composite([
            { input: leftBuf, left: 0, top: 0 },
            { input: rightBuf, left: w, top: 0 }
          ]).png();
          const vizName = import_path.default.parse(target).name + "_viz.png";
          await canvas.toFile(import_path.default.join(vizDir, vizName));
        } else if (vizType === "difference") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const left = await (0, import_sharp.default)(inputAbs, { failOn: "none" }).resize({ width: w, height: h, fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
          const right = await out.clone().raw().toBuffer({ resolveWithObject: true });
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
          const vizName = import_path.default.parse(target).name + "_diff.png";
          await (0, import_sharp.default)(diff, { raw: { width: w, height: h, channels: 3 } }).png().toFile(import_path.default.join(vizDir, vizName));
        }
      }
      if (this.config.output?.writeMeta?.apply) {
        const metaPath = this.config.output.writeMeta.jsonPath ? import_path.default.resolve(process.cwd(), this.config.output.writeMeta.jsonPath) : import_path.default.join(dir, "meta.json");
        const meta = {
          input: input.source,
          output: target,
          config: this.config,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          inputSize: {
            width: originalMeta.width ?? null,
            height: originalMeta.height ?? null
          },
          outputSize: await (0, import_sharp.default)(target).metadata().then((m) => ({
            width: m.width ?? null,
            height: m.height ?? null
          })),
          timingsMs: {
            load: tAfterLoad - tStart,
            preprocess: tAfterPre - tAfterLoad,
            inference: tAfterInfer - tAfterPre,
            postprocess: tAfterPost - tAfterInfer,
            save: import_node_perf_hooks.performance.now() - tAfterPost,
            total: import_node_perf_hooks.performance.now() - tStart
          }
        };
        import_fs2.default.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }
      if (this.config.output?.saveRaw?.apply && this.config.output.saveRaw.path) {
        const rawDir = import_path.default.resolve(
          process.cwd(),
          this.config.output.saveRaw.path
        );
        if (!import_fs2.default.existsSync(rawDir))
          import_fs2.default.mkdirSync(rawDir, { recursive: true });
        const format2 = (this.config.output.saveRaw.format || "npy").toLowerCase();
        const dtype = this.config.output.saveRaw.dtype || "uint8";
        const ext = format2 === "bin" ? ".bin" : ".npy";
        const rawPath = import_path.default.join(rawDir, import_path.default.parse(target).name + ext);
        const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
        const arr = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength
        );
        if (format2 === "bin") {
          import_fs2.default.writeFileSync(
            rawPath,
            Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
          );
        } else {
          if (dtype === "float32") {
            const float = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++)
              float[i] = arr[i] / 255;
            writeNpy(
              rawPath,
              float,
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
};

// src/errors.ts
var ImageFlowError = class extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
};
var ConfigValidationError = class extends ImageFlowError {
};
var PipelineError = class extends ImageFlowError {
};
var BackendLoadError = class extends ImageFlowError {
};
var InferenceError = class extends ImageFlowError {
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BackendLoadError,
  ConfigValidationError,
  ImageFlowError,
  ImageFlowPipeline,
  InferenceError,
  PipelineError
});
//# sourceMappingURL=index.js.map