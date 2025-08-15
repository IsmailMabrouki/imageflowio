"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// src/utils/npy.ts
var npy_exports = {};
__export(npy_exports, {
  writeNpy: () => writeNpy,
  writeNpz: () => writeNpz
});
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
function writeNpz(filePath, arrays) {
  const files = arrays.map((arr) => {
    const tmpPath = `${arr.name}.npy`;
    const magic = Buffer.from("\x93NUMPY", "binary");
    const version = Buffer.from([1, 0]);
    const descr = arr.dtype === "float32" ? "<f4" : "|u1";
    const shapeStr = `(${arr.shape.join(", ")}${arr.shape.length === 1 ? "," : ""})`;
    const headerObj = `{ 'descr': '${descr}', 'fortran_order': False, 'shape': ${shapeStr}, }`;
    const baseLen = magic.length + version.length + 2;
    let headerText = headerObj;
    let totalLen = baseLen + headerText.length + 1;
    const pad = 16 - totalLen % 16;
    if (pad > 0 && pad < 16)
      headerText = headerText + " ".repeat(pad - 1);
    headerText += "\n";
    const headerBuf = Buffer.from(headerText, "latin1");
    const headerSize = Buffer.alloc(2);
    headerSize.writeUInt16LE(headerBuf.length, 0);
    const payload = Buffer.from(
      arr.data.buffer,
      arr.data.byteOffset,
      arr.data.byteLength
    );
    const npy = Buffer.concat([magic, version, headerSize, headerBuf, payload]);
    return { name: tmpPath, data: npy };
  });
  const localHeaders = [];
  const fileDatas = [];
  const centralHeaders = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf-8");
    const crc = import_zlib.default.crc32 ? import_zlib.default.crc32(f.data) >>> 0 : 0;
    const compMethod = 0;
    const lastMod = 0;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(67324752, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(compMethod, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(f.data.length, 18);
    localHeader.writeUInt32LE(f.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localHeaders.push(localHeader, nameBuf);
    fileDatas.push(f.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(33639248, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(compMethod, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralHeaders.push(central, nameBuf);
    offset += localHeader.length + nameBuf.length + f.data.length;
  }
  const centralDir = Buffer.concat(centralHeaders);
  const localPart = Buffer.concat([...localHeaders, ...fileDatas]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(localPart.length, 16);
  end.writeUInt16LE(0, 20);
  import_fs.default.writeFileSync(filePath, Buffer.concat([localPart, centralDir, end]));
}
var import_fs, import_zlib;
var init_npy = __esm({
  "src/utils/npy.ts"() {
    "use strict";
    import_fs = __toESM(require("fs"));
    import_zlib = __toESM(require("zlib"));
  }
});

// src/errors.ts
var errors_exports = {};
__export(errors_exports, {
  BackendLoadError: () => BackendLoadError,
  ConfigValidationError: () => ConfigValidationError,
  ImageFlowError: () => ImageFlowError,
  InferenceError: () => InferenceError,
  PipelineError: () => PipelineError,
  SaveError: () => SaveError
});
var ImageFlowError, ConfigValidationError, PipelineError, BackendLoadError, InferenceError, SaveError;
var init_errors = __esm({
  "src/errors.ts"() {
    "use strict";
    ImageFlowError = class extends Error {
      constructor(message) {
        super(message);
        this.name = new.target.name;
      }
    };
    ConfigValidationError = class extends ImageFlowError {
    };
    PipelineError = class extends ImageFlowError {
    };
    BackendLoadError = class extends ImageFlowError {
    };
    InferenceError = class extends ImageFlowError {
    };
    SaveError = class extends ImageFlowError {
    };
  }
});

// src/backends/tfjs.ts
var tfjs_exports = {};
__export(tfjs_exports, {
  TfjsBackend: () => TfjsBackend
});
var import_path, import_fs2, TfjsBackend;
var init_tfjs = __esm({
  "src/backends/tfjs.ts"() {
    "use strict";
    import_path = __toESM(require("path"));
    import_fs2 = __toESM(require("fs"));
    TfjsBackend = class {
      constructor() {
        this.name = "tfjs";
        this.model = null;
        this.tf = null;
        this.modelConfig = null;
      }
      async loadModel(config) {
        this.modelConfig = config;
        try {
          try {
            this.tf = require("@tensorflow/tfjs-node");
          } catch {
            this.tf = require("@tensorflow/tfjs");
          }
          const tf = this.tf;
          const modelPath = config.path;
          const modelJsonPath = import_path.default.join(modelPath, "model.json");
          if (import_fs2.default.existsSync(modelJsonPath)) {
            this.model = await tf.loadGraphModel(`file://${modelPath}`);
          } else {
            this.model = await tf.loadLayersModel(`file://${modelPath}`);
          }
        } catch (err) {
          const msg = String(err);
          if (/Cannot find module '@tensorflow\/tfjs/i.test(msg)) {
            throw new Error(
              "Failed to load TensorFlow.js backend. Install '@tensorflow/tfjs-node' or '@tensorflow/tfjs' to use the TFJS backend."
            );
          }
          throw new Error(
            `Failed to load TFJS model at ${config.path}. Install '@tensorflow/tfjs-node' or '@tensorflow/tfjs' to use the TFJS backend. Underlying error: ${msg}`
          );
        }
      }
      async infer(input) {
        if (!this.model || !this.tf)
          throw new Error("TFJS model not initialized");
        if (!this.modelConfig)
          throw new Error("TFJS model configuration not set");
        const tf = this.tf;
        const layout = input.layout || this.modelConfig.layout || "nhwc";
        const shape = layout === "nchw" ? [1, input.channels, input.height, input.width] : [1, input.height, input.width, input.channels];
        const tensor = tf.tensor(input.data, shape);
        const result = await this.model.predict(tensor);
        const outputData = await result.array();
        const flatOutput = new Float32Array(outputData.flat(3));
        tensor.dispose();
        result.dispose();
        const outputShape = result.shape;
        let width = input.width;
        let height = input.height;
        let channels = input.channels;
        if (outputShape.length === 4) {
          const [batch, dim1, dim2, dim3] = outputShape;
          if (batch === 1) {
            if (layout === "nchw") {
              channels = dim1;
              height = dim2;
              width = dim3;
            } else {
              height = dim1;
              width = dim2;
              channels = dim3;
            }
          }
        }
        return {
          data: flatOutput,
          width,
          height,
          channels: Math.max(1, Math.min(4, channels)),
          layout
        };
      }
      async dispose() {
        if (this.model) {
          this.model.dispose();
          this.model = null;
        }
      }
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BackendLoadError: () => BackendLoadError,
  ConfigValidationError: () => ConfigValidationError,
  ImageFlowError: () => ImageFlowError,
  ImageFlowPipeline: () => ImageFlowPipeline,
  InferenceError: () => InferenceError,
  NoopBackend: () => NoopBackend,
  OnnxBackend: () => OnnxBackend,
  PipelineError: () => PipelineError,
  SaveError: () => SaveError,
  TfjsBackend: () => TfjsBackend,
  nchwToNhwc: () => nchwToNhwc,
  nhwcToNchw: () => nhwcToNchw
});
module.exports = __toCommonJS(src_exports);

// src/pipeline.ts
var import_fs3 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_sharp = __toESM(require("sharp"));
var import_sharp2 = __toESM(require("sharp"));
var import_os = __toESM(require("os"));
init_npy();
var import_node_perf_hooks = require("perf_hooks");

// src/backends/noop.ts
var NoopBackend = class {
  constructor() {
    this.name = "noop";
    this.modelConfig = null;
  }
  async loadModel(config) {
    this.modelConfig = config;
  }
  async infer(input) {
    return {
      data: input.data,
      width: input.width,
      height: input.height,
      channels: input.channels,
      layout: input.layout
    };
  }
};

// src/utils/tensor.ts
function nhwcToNchw(data, width, height, channels) {
  const out = new Float32Array(channels * height * width);
  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nhwcIndex = (y * width + x) * channels + c;
        const nchwIndex = c * height * width + y * width + x;
        out[nchwIndex] = data[nhwcIndex];
      }
    }
  }
  return out;
}
function nchwToNhwc(data, width, height, channels) {
  const out = new Float32Array(height * width * channels);
  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nchwIndex = c * height * width + y * width + x;
        const nhwcIndex = (y * width + x) * channels + c;
        out[nhwcIndex] = data[nchwIndex];
      }
    }
  }
  return out;
}

// src/backends/onnx.ts
var _OnnxBackend = class _OnnxBackend {
  constructor() {
    this.name = "onnxruntime-node";
    this.session = null;
    this.ort = null;
    this.modelConfig = null;
  }
  async loadModel(config) {
    this.modelConfig = config;
    try {
      this.ort = require("onnxruntime-node");
      const ort = this.ort;
      const cached = _OnnxBackend.sessionCache.get(config.path);
      if (cached) {
        this.session = cached;
        return;
      }
      this.session = await ort.InferenceSession.create(config.path);
      _OnnxBackend.sessionCache.set(config.path, this.session);
    } catch (err) {
      const msg = String(err);
      if (/Cannot find module 'onnxruntime-node'|MODULE_NOT_FOUND/i.test(msg)) {
        throw new Error(
          "Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend."
        );
      }
      throw new Error(
        `Failed to load ONNX model at ${config.path}. Install 'onnxruntime-node' to use the ONNX backend. Underlying error: ${msg}`
      );
    }
  }
  async infer(input) {
    if (!this.session || !this.ort)
      throw new Error("ONNX session not initialized");
    if (!this.modelConfig)
      throw new Error("ONNX model configuration not set");
    const ort = this.ort;
    const layout = input.layout || this.modelConfig.layout || "nhwc";
    const isNchw = layout === "nchw";
    const nhwcShape = [1, input.height, input.width, input.channels];
    const nchwShape = [1, input.channels, input.height, input.width];
    const tensorData = isNchw ? nhwcToNchw(input.data, input.width, input.height, input.channels) : input.data;
    const tensorShape = isNchw ? nchwShape : nhwcShape;
    const tensor = new ort.Tensor("float32", tensorData, tensorShape);
    const inputName = input.inputName || this.modelConfig.inputName || (this.session.inputNames?.[0] ?? "input");
    const feeds = {};
    feeds[inputName] = tensor;
    const results = await this.session.run(feeds);
    const outputName = this.modelConfig.outputName || Object.keys(results)[0];
    const outTensor = results[outputName];
    let data = outTensor.data;
    const dims = outTensor.dims || (isNchw ? nchwShape : nhwcShape);
    let width = input.width;
    let height = input.height;
    let channels = input.channels;
    if (dims.length === 4) {
      const [d0, d1, d2, d3] = dims;
      if (d0 === 1 && d1 > 0 && d2 > 0 && d3 > 0) {
        const looksNchw = isNchw || d1 <= 4 && d2 > 4 && d3 > 4;
        if (looksNchw) {
          channels = Math.max(1, Math.min(4, d1));
          height = d2;
          width = d3;
          data = nchwToNhwc(data, width, height, channels);
        } else {
          height = d1;
          width = d2;
          channels = Math.max(1, Math.min(4, d3));
        }
      }
    }
    return {
      data,
      width,
      height,
      channels
    };
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
var _ImageFlowPipeline = class _ImageFlowPipeline {
  constructor(config) {
    this.config = config;
  }
  async run(options) {
    const { input } = this.config;
    if (input.type !== "image")
      throw new Error("Only image input is supported.");
    const inputAbs = import_path2.default.resolve(process.cwd(), input.source);
    if (!import_fs3.default.existsSync(inputAbs)) {
      const { PipelineError: PipelineError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
      throw new PipelineError2(`Input image not found: ${input.source}`);
    }
    const tStart = import_node_perf_hooks.performance.now();
    const logs = [];
    const logLine = (m) => {
      logs.push(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${m}`);
    };
    const logMem = (tag) => {
      try {
        const mu = process.memoryUsage();
        const rssMb = (mu.rss / (1024 * 1024)).toFixed(1);
        const heapMb = (mu.heapUsed / (1024 * 1024)).toFixed(1);
        logLine(`mem/rss=${rssMb}MB heap=${heapMb}MB tag=${tag}`);
      } catch {
      }
    };
    logLine("pipeline/start");
    const threadsOverride = options?.threads;
    if (threadsOverride) {
      if (threadsOverride === "auto") {
        const cores = Math.max(1, import_os.default.cpus()?.length || 1);
        import_sharp2.default.concurrency(cores);
      } else {
        const countNum = Number(threadsOverride);
        if (!Number.isNaN(countNum) && countNum > 0)
          import_sharp2.default.concurrency(countNum);
      }
    } else if (this.config.execution?.threads?.apply) {
      const count = this.config.execution.threads.count;
      if (count === "auto") {
        const cores = Math.max(1, import_os.default.cpus()?.length || 1);
        import_sharp2.default.concurrency(cores);
      } else if (count) {
        const num = Number(count);
        if (!Number.isNaN(num) && num > 0)
          import_sharp2.default.concurrency(num);
      }
    }
    const image = (0, import_sharp.default)(inputAbs, { failOn: "none" });
    const originalMeta = await image.metadata();
    const tAfterLoad = import_node_perf_hooks.performance.now();
    logLine(`load/done ms=${(tAfterLoad - tStart).toFixed(2)}`);
    logMem("load");
    let work = image.clone();
    const useCaching = !!this.config.execution?.useCaching;
    const cacheMode = this.config.execution?.useCaching === true ? "memory" : this.config.execution?.useCaching === false ? void 0 : this.config.execution?.useCaching;
    const cacheDir = this.config.execution?.cacheDir ? import_path2.default.resolve(process.cwd(), this.config.execution.cacheDir) : import_path2.default.resolve(process.cwd(), ".imageflowio-cache");
    const preprocessSignature = JSON.stringify(this.config.preprocessing ?? {});
    const inputStat = import_fs3.default.statSync(inputAbs);
    const cacheKey = `${inputAbs}|${inputStat.mtimeMs}|${preprocessSignature}`;
    let loadedFromCache = false;
    if (useCaching && cacheMode) {
      const cached = _ImageFlowPipeline.preprocCache.get(cacheKey);
      if (cached) {
        work = (0, import_sharp.default)(cached.data, {
          raw: {
            width: cached.width,
            height: cached.height,
            channels: cached.channels
          }
        });
        loadedFromCache = true;
        logLine("cache/memory hit");
      } else if (cacheMode === "disk") {
        try {
          const keySafe = Buffer.from(cacheKey).toString("base64url");
          const metaPath = import_path2.default.join(cacheDir, `${keySafe}.json`);
          const binPath = import_path2.default.join(cacheDir, `${keySafe}.bin`);
          if (import_fs3.default.existsSync(metaPath) && import_fs3.default.existsSync(binPath)) {
            const meta = JSON.parse(import_fs3.default.readFileSync(metaPath, "utf-8"));
            const buf = import_fs3.default.readFileSync(binPath);
            work = (0, import_sharp.default)(buf, {
              raw: {
                width: meta.width,
                height: meta.height,
                channels: meta.channels
              }
            });
            loadedFromCache = true;
            logLine("cache/disk hit");
          }
        } catch {
        }
      }
    }
    const pp = this.config.preprocessing;
    if (!loadedFromCache) {
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
      if (pp?.augmentations?.apply) {
        const methods = pp.augmentations.methods || [];
        const params = pp.augmentations.params || {};
        for (const method of methods) {
          if (method === "flip") {
            const axis = params?.flip?.axis || params?.flip?.direction || "horizontal";
            if (axis === "vertical") {
              work = work.flip();
            } else {
              work = work.flop();
            }
          } else if (method === "rotate") {
            const angle = Number(params?.rotate?.angle ?? 0);
            const allowed = [0, 90, 180, 270];
            const rot = allowed.includes(angle) ? angle : 0;
            if (rot !== 0)
              work = work.rotate(rot);
          } else if (method === "colorJitter") {
            const brightness = Number(params?.colorJitter?.brightness ?? 1);
            const saturation = Number(params?.colorJitter?.saturation ?? 1);
            const hue = Number(params?.colorJitter?.hue ?? 0);
            work = work.modulate({
              brightness: isFinite(brightness) && brightness > 0 ? brightness : 1,
              saturation: isFinite(saturation) && saturation > 0 ? saturation : 1,
              hue: isFinite(hue) ? hue : 0
            });
          }
        }
      }
      if (useCaching && cacheMode) {
        const { data, info } = await work.clone().raw().toBuffer({ resolveWithObject: true });
        const ch = Math.max(1, Math.min(4, info.channels ?? 3));
        _ImageFlowPipeline.preprocCache.set(cacheKey, {
          data,
          width: info.width ?? 0,
          height: info.height ?? 0,
          channels: ch
        });
        if (cacheMode === "disk") {
          try {
            if (!import_fs3.default.existsSync(cacheDir))
              import_fs3.default.mkdirSync(cacheDir, { recursive: true });
            const keySafe = Buffer.from(cacheKey).toString("base64url");
            const metaPath = import_path2.default.join(cacheDir, `${keySafe}.json`);
            const binPath = import_path2.default.join(cacheDir, `${keySafe}.bin`);
            import_fs3.default.writeFileSync(
              metaPath,
              JSON.stringify(
                {
                  width: info.width ?? 0,
                  height: info.height ?? 0,
                  channels: ch
                },
                null,
                2
              ),
              "utf-8"
            );
            import_fs3.default.writeFileSync(
              binPath,
              Buffer.from(data.buffer, data.byteOffset, data.byteLength)
            );
            logLine("cache/disk write");
          } catch {
          }
        }
      }
    }
    if (this.config.custom?.preprocessingFn) {
      try {
        const abs = import_path2.default.resolve(
          process.cwd(),
          this.config.custom.preprocessingFn
        );
        const mod = await import(abs);
        const fn = mod?.default || mod?.preprocess || mod?.run;
        if (typeof fn === "function") {
          const maybe = await fn(work.clone());
          if (maybe && typeof maybe.metadata === "function") {
            work = maybe;
          }
        }
      } catch {
      }
    }
    let inputTensor = null;
    const needFloatTensor = pp?.normalize?.apply || pp?.format?.dataType === "float32";
    if (needFloatTensor) {
      const { data, info } = await work.clone().raw().toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      const srcChannels = info.channels ?? 3;
      const desiredChannels = pp?.format?.channels ?? srcChannels;
      const outChannels = desiredChannels === 1 || desiredChannels === 3 ? desiredChannels : srcChannels;
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
              floatData[i + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
            }
          }
        }
      } else if (outChannels === 1 && srcChannels >= 3) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * srcChannels;
            const r = data[i + 0] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (applyNorm)
              v = (v - (mean[0] ?? 0)) / (std[0] ?? 1);
            floatData[y * width + x] = v;
          }
        }
      } else if (outChannels === 3 && srcChannels === 1) {
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
        const ch = Math.min(outChannels, srcChannels);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const si = (y * width + x) * srcChannels;
            const di = (y * width + x) * outChannels;
            for (let c = 0; c < ch; c++) {
              const v = data[si + c] / 255;
              floatData[di + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
            }
          }
        }
      }
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
    logLine(`preprocess/done ms=${(tAfterPre - tAfterLoad).toFixed(2)}`);
    logMem("preprocess");
    let out = work;
    let tAfterInfer = import_node_perf_hooks.performance.now();
    if (inputTensor) {
      let backendChoice = options?.backend ?? (this.config.execution?.backend || "auto");
      if (backendChoice === "auto") {
        const modelPath = this.config.model.path;
        const lower = modelPath.toLowerCase();
        const absModel = import_path2.default.isAbsolute(modelPath) ? modelPath : import_path2.default.resolve(process.cwd(), modelPath);
        const looksOnnx = lower.endsWith(".onnx");
        const looksTfjs = lower.endsWith("model.json") || import_fs3.default.existsSync(absModel) && import_fs3.default.statSync(absModel).isDirectory() && import_fs3.default.existsSync(import_path2.default.join(absModel, "model.json"));
        backendChoice = looksOnnx ? "onnx" : looksTfjs ? "tfjs" : "noop";
      }
      let backend;
      if (backendChoice === "onnx")
        backend = new OnnxBackend();
      else if (backendChoice === "tfjs")
        backend = new (await Promise.resolve().then(() => (init_tfjs(), tfjs_exports))).TfjsBackend();
      else
        backend = new NoopBackend();
      try {
        const modelConfig = {
          path: this.config.model.path,
          layout: this.config.model.layout,
          inputName: this.config.model.inputName,
          outputName: this.config.model.outputName
        };
        await backend.loadModel(modelConfig);
      } catch (e) {
        throw new (await Promise.resolve().then(() => (init_errors(), errors_exports))).BackendLoadError(
          e?.message || String(e)
        );
      }
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
        logLine(
          `tiling/start tileSize=${tiling?.tileSize?.[0] ?? 256}x${tiling?.tileSize?.[1] ?? 256} overlap=${tiling?.overlap ?? 0} blend=${tiling?.blend ?? "average"} pad=${tiling?.padMode ?? "none"}`
        );
        const { data: baseData, info: baseInfo } = await work.clone().raw().toBuffer({ resolveWithObject: true });
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
        const blendMode = tiling?.blend ?? "average";
        const maxVals = blendMode === "max" ? new Float32Array(imgW * imgH * ch).fill(-Infinity) : null;
        for (let y = 0; y < imgH; y += stepY) {
          const th = Math.min(tileH, imgH - y);
          for (let x = 0; x < imgW; x += stepX) {
            const tw = Math.min(tileW, imgW - x);
            logLine(`tiling/tile x=${x} y=${y} w=${tw} h=${th}`);
            const tileBuf = await (0, import_sharp.default)(baseData, {
              raw: { width: imgW, height: imgH, channels: ch }
            }).extract({ left: x, top: y, width: tw, height: th }).raw().toBuffer();
            const needPad = tiling?.padMode && (tw < tileW || th < tileH) ? true : false;
            const inferW = needPad ? tileW : tw;
            const inferH = needPad ? tileH : th;
            let tileInBuf = tileBuf;
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
                tileInBuf = await (0, import_sharp.default)(tileBuf, {
                  raw: { width: tw, height: th, channels: srcCh }
                }).extend({
                  top: 0,
                  left: 0,
                  right: tileW - tw,
                  bottom: tileH - th,
                  background: { r: 0, g: 0, b: 0, alpha: 0 },
                  extendWith
                }).raw().toBuffer();
              }
            }
            const tileFloat = new Float32Array(inferW * inferH * ch);
            const mean = pp?.normalize?.mean ?? [0, 0, 0];
            const std = pp?.normalize?.std ?? [1, 1, 1];
            const applyNorm = pp?.normalize?.apply === true;
            if (ch === srcCh) {
              for (let i = 0; i < inferW * inferH; i++) {
                for (let c = 0; c < ch; c++) {
                  const v = tileInBuf[i * srcCh + c] / 255;
                  tileFloat[i * ch + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
                }
              }
            } else if (ch === 1 && srcCh >= 3) {
              for (let i = 0; i < inferW * inferH; i++) {
                const r = tileInBuf[i * srcCh + 0] / 255;
                const g = tileInBuf[i * srcCh + 1] / 255;
                const b = tileInBuf[i * srcCh + 2] / 255;
                let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                if (applyNorm)
                  v = (v - (mean[0] ?? 0)) / (std[0] ?? 1);
                tileFloat[i] = v;
              }
            } else if (ch === 3 && srcCh === 1) {
              for (let i = 0; i < inferW * inferH; i++) {
                const v0 = tileInBuf[i] / 255;
                tileFloat[i * 3 + 0] = applyNorm ? (v0 - (mean[0] ?? 0)) / (std[0] ?? 1) : v0;
                tileFloat[i * 3 + 1] = applyNorm ? (v0 - (mean[1] ?? 0)) / (std[1] ?? 1) : v0;
                tileFloat[i * 3 + 2] = applyNorm ? (v0 - (mean[2] ?? 0)) / (std[2] ?? 1) : v0;
              }
            } else {
              const copyCh = Math.min(ch, srcCh);
              for (let i = 0; i < inferW * inferH; i++) {
                for (let c = 0; c < copyCh; c++) {
                  const v = tileInBuf[i * srcCh + c] / 255;
                  tileFloat[i * ch + c] = applyNorm ? (v - (mean[c] ?? 0)) / (std[c] ?? 1) : v;
                }
              }
            }
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
              ...this.config.model.inputName ? { inputName: this.config.model.inputName } : {},
              ...this.config.model.outputName ? { outputName: this.config.model.outputName } : {}
            });
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
                    if (v > maxVals[go + c])
                      maxVals[go + c] = v;
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
        out = (0, import_sharp.default)(outBuf, {
          raw: { width: imgW, height: imgH, channels: ch }
        });
        logLine("tiling/done");
      } else {
        let result;
        try {
          result = await backend.infer({
            data: inputTensor.data,
            width: inputTensor.width,
            height: inputTensor.height,
            channels: inputTensor.channels,
            layout: this.config.model.layout || "nhwc",
            ...this.config.model.inputName ? { inputName: this.config.model.inputName } : {},
            ...this.config.model.outputName ? { outputName: this.config.model.outputName } : {}
          });
        } catch (e) {
          const { InferenceError: InferenceError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
          throw new InferenceError2(e?.message || String(e));
        }
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
      logLine(`inference/done ms=${(tAfterInfer - tAfterPre).toFixed(2)}`);
      logMem("inference");
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
            const abs = import_path2.default.resolve(process.cwd(), p.file);
            if (import_fs3.default.existsSync(abs)) {
              const arr = JSON.parse(import_fs3.default.readFileSync(abs, "utf-8"));
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
        const mask = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const cls = classIdx[i];
            const leftDiff = x > 0 && classIdx[i - 1] !== cls;
            const topDiff = y > 0 && classIdx[i - width] !== cls;
            if (leftDiff || topDiff)
              mask[i] = 1;
          }
        }
        if (thickness > 1) {
          const r = thickness - 1;
          const dilated = new Uint8Array(width * height);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (!mask[y * width + x])
                continue;
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
          for (let i = 0; i < width * height; i++)
            if (dilated[i])
              mask[i] = 1;
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
    if (this.config.custom?.postprocessingFn) {
      try {
        const abs = import_path2.default.resolve(
          process.cwd(),
          this.config.custom.postprocessingFn
        );
        const mod = await import(abs);
        const fn = mod?.default || mod?.postprocess || mod?.run;
        if (typeof fn === "function") {
          const maybe = await fn(out.clone());
          if (maybe && typeof maybe.metadata === "function") {
            out = maybe;
          }
        }
      } catch {
      }
    }
    const tAfterPost = import_node_perf_hooks.performance.now();
    logLine(`postprocess/done ms=${(tAfterPost - tAfterInfer).toFixed(2)}`);
    logMem("postprocess");
    const output = this.config.output;
    if (output?.save?.apply) {
      const dir = import_path2.default.resolve(process.cwd(), output.save.path ?? "./outputs");
      if (!import_fs3.default.existsSync(dir))
        import_fs3.default.mkdirSync(dir, { recursive: true });
      const filename = (output.save.filename ?? "{model}_{timestamp}.png").replace(
        "{model}",
        this.config.model.name ?? import_path2.default.parse(this.config.model.path).name
      ).replace("{timestamp}", (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"));
      const target = import_path2.default.join(dir, filename);
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
        const base = import_path2.default.parse(target).name;
        const ext = format;
        for (let c = 0; c < channels; c++) {
          const chName = output.save.channelNames?.[c] ?? `C${c}`;
          const chBuf = Buffer.alloc(width * height);
          for (let i = 0; i < width * height; i++) {
            chBuf[i] = data[i * channels + c];
          }
          const chSharp = (0, import_sharp.default)(chBuf, { raw: { width, height, channels: 1 } });
          const chTarget = import_path2.default.join(dir, `${base}_${chName}.${ext}`);
          if (format === "png") {
            const bd = output.save.bitDepth;
            const pngOpts = { compressionLevel: 9 };
            if (bd === 8 || bd === 16)
              pngOpts.bitdepth = bd;
            await chSharp.png(pngOpts).toFile(chTarget);
          } else if (format === "jpeg") {
            await chSharp.jpeg({ quality: output.save.quality ?? 90 }).toFile(chTarget);
          } else if (format === "webp") {
            await chSharp.webp({ quality: output.save.quality ?? 90 }).toFile(chTarget);
          } else if (format === "tiff") {
            const bd = output.save.bitDepth;
            const tiffOpts = { quality: output.save.quality ?? 90 };
            if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
              tiffOpts.bitdepth = bd;
            await chSharp.tiff(tiffOpts).toFile(chTarget);
          } else {
            await chSharp.toFile(chTarget);
          }
        }
        if (format === "png") {
          const bd = output.save.bitDepth;
          const pngOpts = { compressionLevel: 9 };
          if (bd === 8 || bd === 16)
            pngOpts.bitdepth = bd;
          try {
            await out.png(pngOpts).toFile(target);
          } catch (e) {
            const { SaveError: SaveError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
            throw new SaveError2(e?.message || String(e));
          }
        } else if (format === "jpeg") {
          try {
            await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
          } catch (e) {
            const { SaveError: SaveError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
            throw new SaveError2(e?.message || String(e));
          }
        } else if (format === "webp") {
          try {
            await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
          } catch (e) {
            const { SaveError: SaveError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
            throw new SaveError2(e?.message || String(e));
          }
        } else if (format === "tiff") {
          const bd = output.save.bitDepth;
          const tiffOpts = { quality: output.save.quality ?? 90 };
          if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
            tiffOpts.bitdepth = bd;
          try {
            await out.tiff(tiffOpts).toFile(target);
          } catch (e) {
            const { SaveError: SaveError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
            throw new SaveError2(e?.message || String(e));
          }
        } else {
          try {
            await out.toFile(target);
          } catch (e) {
            const { SaveError: SaveError2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
            throw new SaveError2(e?.message || String(e));
          }
        }
        logLine(`save/done path=${target}`);
      } else {
        if (format === "png") {
          const bd = output.save.bitDepth;
          const pngOpts = { compressionLevel: 9 };
          if (bd === 8 || bd === 16)
            pngOpts.bitdepth = bd;
          await out.png(pngOpts).toFile(target);
        } else if (format === "jpeg") {
          await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "webp") {
          await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
        } else if (format === "tiff") {
          const bd = output.save.bitDepth;
          const tiffOpts = { quality: output.save.quality ?? 90 };
          if (bd === 1 || bd === 2 || bd === 4 || bd === 8)
            tiffOpts.bitdepth = bd;
          await out.tiff(tiffOpts).toFile(target);
        } else {
          await out.toFile(target);
        }
      }
      if (this.config.visualization?.apply) {
        const vizType = this.config.visualization.type ?? "sideBySide";
        const vizDir = import_path2.default.resolve(
          process.cwd(),
          this.config.visualization.outputPath || output.save.path || dir
        );
        if (!import_fs3.default.existsSync(vizDir))
          import_fs3.default.mkdirSync(vizDir, { recursive: true });
        const vizAlpha = Math.max(
          0,
          Math.min(1, this.config.visualization?.alpha ?? 0.5)
        );
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
          const vizName = import_path2.default.parse(target).name + "_viz.png";
          const vpath = import_path2.default.join(vizDir, vizName);
          await canvas.toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
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
          const vizName = import_path2.default.parse(target).name + "_diff.png";
          const vpath = import_path2.default.join(vizDir, vizName);
          await (0, import_sharp.default)(diff, { raw: { width: w, height: h, channels: 3 } }).png().toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
        } else if (vizType === "overlay") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const base = await (0, import_sharp.default)(inputAbs, { failOn: "none" }).resize({ width: w, height: h, fit: "fill" }).png().toBuffer();
          const overlay = await out.clone().ensureAlpha(vizAlpha).png().toBuffer();
          const viz = (0, import_sharp.default)(base).composite([{ input: overlay, blend: "over" }]).png();
          const vizName = import_path2.default.parse(target).name + "_overlay.png";
          const vpath = import_path2.default.join(vizDir, vizName);
          await viz.toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
        } else if (vizType === "heatmap") {
          const outMeta = await out.metadata();
          const w = outMeta.width ?? 0;
          const h = outMeta.height ?? 0;
          const left = await (0, import_sharp.default)(inputAbs, { failOn: "none" }).resize({ width: w, height: h, fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
          const right = await out.clone().raw().toBuffer({ resolveWithObject: true });
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
          const vizName = import_path2.default.parse(target).name + "_heatmap.png";
          const vpath = import_path2.default.join(vizDir, vizName);
          await (0, import_sharp.default)(heat, { raw: { width: w, height: h, channels: 3 } }).png().toFile(vpath);
          logLine(`viz/done type=${vizType} path=${vpath}`);
        }
      }
      if (this.config.output?.writeMeta?.apply) {
        const metaPath = this.config.output.writeMeta.jsonPath ? import_path2.default.resolve(process.cwd(), this.config.output.writeMeta.jsonPath) : import_path2.default.join(dir, "meta.json");
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
        import_fs3.default.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }
      if (this.config.logging?.saveLogs) {
        try {
          const logPath = this.config.logging.logPath ? import_path2.default.resolve(process.cwd(), this.config.logging.logPath) : import_path2.default.resolve(process.cwd(), "logs/inference.log");
          const ldir = import_path2.default.dirname(logPath);
          if (!import_fs3.default.existsSync(ldir))
            import_fs3.default.mkdirSync(ldir, { recursive: true });
          const totalMs = import_node_perf_hooks.performance.now() - tStart;
          logs.push(
            `[${(/* @__PURE__ */ new Date()).toISOString()}] total ms=${totalMs.toFixed(2)}`
          );
          try {
            const mu = process.memoryUsage();
            const rssMb = (mu.rss / (1024 * 1024)).toFixed(1);
            const heapMb = (mu.heapUsed / (1024 * 1024)).toFixed(1);
            logs.push(
              `[${(/* @__PURE__ */ new Date()).toISOString()}] mem/rss=${rssMb}MB heap=${heapMb}MB tag=end`
            );
          } catch {
          }
          const level = this.config.logging.level || "info";
          let lines = logs;
          if (level === "error") {
            lines = logs.filter((l) => l.includes("total ms="));
          } else if (level === "info") {
            lines = logs.filter(
              (l) => l.includes("/done") || l.includes("pipeline/start") || l.includes("total ms=")
            );
          }
          import_fs3.default.writeFileSync(logPath, lines.join("\n"), "utf-8");
        } catch {
        }
      }
      if (this.config.output?.saveRaw?.apply && this.config.output.saveRaw.path) {
        const rawDir = import_path2.default.resolve(
          process.cwd(),
          this.config.output.saveRaw.path
        );
        if (!import_fs3.default.existsSync(rawDir))
          import_fs3.default.mkdirSync(rawDir, { recursive: true });
        const format2 = (this.config.output.saveRaw.format || "npy").toLowerCase();
        const dtype = this.config.output.saveRaw.dtype || "uint8";
        const ext = format2 === "bin" ? ".bin" : ".npy";
        const rawPath = import_path2.default.join(rawDir, import_path2.default.parse(target).name + ext);
        const { data, info } = await out.clone().raw().toBuffer({ resolveWithObject: true });
        const arr = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength
        );
        if (format2 === "bin") {
          import_fs3.default.writeFileSync(
            rawPath,
            Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
          );
        } else if (format2 === "npz") {
          const { writeNpz: writeNpz2 } = await Promise.resolve().then(() => (init_npy(), npy_exports));
          if (dtype === "float32") {
            const float = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++)
              float[i] = arr[i] / 255;
            writeNpz2(rawPath.replace(/\.npy$/i, ".npz"), [
              {
                name: "output",
                data: float,
                shape: [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
                dtype: "float32"
              }
            ]);
          } else {
            writeNpz2(rawPath.replace(/\.npy$/i, ".npz"), [
              {
                name: "output",
                data: arr,
                shape: [info.height ?? 0, info.width ?? 0, info.channels ?? 3],
                dtype: "uint8"
              }
            ]);
          }
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
_ImageFlowPipeline.preprocCache = /* @__PURE__ */ new Map();
var ImageFlowPipeline = _ImageFlowPipeline;

// src/index.ts
init_errors();
init_tfjs();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BackendLoadError,
  ConfigValidationError,
  ImageFlowError,
  ImageFlowPipeline,
  InferenceError,
  NoopBackend,
  OnnxBackend,
  PipelineError,
  SaveError,
  TfjsBackend,
  nchwToNhwc,
  nhwcToNchw
});
//# sourceMappingURL=index.js.map