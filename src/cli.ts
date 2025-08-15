#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "./pipeline";
import Ajv from "ajv";
import { ConfigValidationError } from "./errors";

function getHereDir(): string {
  try {
    const scriptPath = process.argv[1];
    if (scriptPath) return path.dirname(path.resolve(scriptPath));
  } catch {}
  // @ts-ignore __dirname exists in CJS
  if (typeof __dirname !== "undefined") return __dirname as unknown as string;
  return process.cwd();
}

type CliOptions = {
  configPath: string;
  validateOnly: boolean;
  verbose: boolean;
  version: boolean;
  dryRun: boolean;
  inputOverride?: string;
  outputOverride?: string;
  printSchema: boolean;
  backend?: "auto" | "onnx" | "noop" | "tfjs";
  threads?: number | "auto";
  jsonErrors?: boolean;
  logFile?: string;
  vizType?: "sideBySide" | "overlay" | "heatmap" | "difference";
  vizAlpha?: number;
  vizOut?: string;
  logLevel?: "debug" | "info" | "error";
  errorsMode?: "json" | "pretty";
  concurrency?: number;
  progress?: boolean;
  help: boolean;
  // Benchmark options
  benchmark?: boolean;
  benchmarkType?: "backend" | "pipeline" | "memory" | "scalability" | "all";
  benchmarkConfig?: string;
  benchmarkOutput?: string;
  benchmarkFormat?: "json" | "html" | "csv";
  benchmarkIterations?: number;
  benchmarkWarmup?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    configPath: "config.json",
    validateOnly: false,
    verbose: false,
    version: false,
    dryRun: false,
    printSchema: false,
    backend: undefined,
    threads: undefined,
    jsonErrors: false,
    logFile: undefined,
    vizType: undefined,
    vizAlpha: undefined,
    vizOut: undefined,
    logLevel: undefined,
    errorsMode: undefined,
    concurrency: undefined,
    progress: undefined,
    help: false,
  };

  const args = [...argv.slice(2)];
  while (args.length > 0) {
    const token = args.shift() as string;
    if (token === "--help" || token === "-h") defaults.help = true;
    else if (token === "--version" || token === "-V") defaults.version = true;
    else if (token === "--validate-only") defaults.validateOnly = true;
    else if (token === "--verbose" || token === "-v") defaults.verbose = true;
    else if (token === "--dry-run") defaults.dryRun = true;
    else if (token === "--print-schema") defaults.printSchema = true;
    else if (token.startsWith("--backend=")) {
      const val = token.split("=")[1] as any;
      if (val === "auto" || val === "onnx" || val === "noop" || val === "tfjs")
        defaults.backend = val;
    } else if (token === "--backend") {
      const val = args.shift() as any;
      if (val === "auto" || val === "onnx" || val === "noop" || val === "tfjs")
        defaults.backend = val;
    } else if (token.startsWith("--threads=")) {
      const val = token.split("=")[1];
      defaults.threads = val === "auto" ? "auto" : Number(val);
    } else if (token === "--threads") {
      const val = args.shift();
      if (val) defaults.threads = val === "auto" ? "auto" : Number(val);
    } else if (token === "--json-errors") {
      defaults.jsonErrors = true;
      defaults.errorsMode = "json";
    } else if (token.startsWith("--errors=")) {
      const val = token.split("=")[1] as any;
      if (val === "json" || val === "pretty") defaults.errorsMode = val;
    } else if (token === "--errors") {
      const val = args.shift() as any;
      if (val === "json" || val === "pretty") defaults.errorsMode = val;
    } else if (token.startsWith("--log-file=")) {
      defaults.logFile = token.split("=")[1];
    } else if (token === "--log-file") {
      defaults.logFile = args.shift();
    } else if (token.startsWith("--log-level=")) {
      const val = token.split("=")[1] as any;
      if (val === "debug" || val === "info" || val === "error")
        defaults.logLevel = val;
    } else if (token === "--log-level") {
      const val = args.shift() as any;
      if (val === "debug" || val === "info" || val === "error")
        defaults.logLevel = val;
    } else if (token.startsWith("--concurrency=")) {
      const val = Number(token.split("=")[1]);
      if (!Number.isNaN(val) && val > 0) defaults.concurrency = val;
    } else if (token === "--concurrency") {
      const val = Number(args.shift());
      if (!Number.isNaN(val) && val > 0) defaults.concurrency = val;
    } else if (token === "--progress") {
      defaults.progress = true;
    } else if (token.startsWith("--viz=")) {
      const val = token.split("=")[1] as any;
      if (
        val === "sideBySide" ||
        val === "overlay" ||
        val === "heatmap" ||
        val === "difference"
      )
        defaults.vizType = val;
    } else if (token === "--viz") {
      const val = args.shift() as any;
      if (
        val === "sideBySide" ||
        val === "overlay" ||
        val === "heatmap" ||
        val === "difference"
      )
        defaults.vizType = val;
    } else if (token.startsWith("--viz-alpha=")) {
      const val = Number(token.split("=")[1]);
      if (!Number.isNaN(val)) defaults.vizAlpha = val;
    } else if (token === "--viz-alpha") {
      const val = Number(args.shift());
      if (!Number.isNaN(val)) defaults.vizAlpha = val;
    } else if (token.startsWith("--viz-out=")) {
      defaults.vizOut = token.split("=")[1];
    } else if (token === "--viz-out") {
      defaults.vizOut = args.shift() as any;
    } else if (token.startsWith("--input="))
      defaults.inputOverride = token.split("=")[1];
    else if (token === "--input") defaults.inputOverride = args.shift();
    else if (token.startsWith("--output="))
      defaults.outputOverride = token.split("=")[1];
    else if (token === "--output") defaults.outputOverride = args.shift();
    else if (token.startsWith("--config="))
      defaults.configPath = token.split("=")[1] ?? defaults.configPath;
    else if (token === "--config" || token === "-c") {
      const next = args.shift();
      if (next) defaults.configPath = next;
    }
    // Benchmark options
    else if (token === "benchmark" || token === "--benchmark") {
      defaults.benchmark = true;
    } else if (token.startsWith("--benchmark-type=")) {
      const val = token.split("=")[1] as any;
      if (
        val === "backend" ||
        val === "pipeline" ||
        val === "memory" ||
        val === "scalability" ||
        val === "all"
      )
        defaults.benchmarkType = val;
    } else if (token === "--benchmark-type") {
      const val = args.shift() as any;
      if (
        val === "backend" ||
        val === "pipeline" ||
        val === "memory" ||
        val === "scalability" ||
        val === "all"
      )
        defaults.benchmarkType = val;
    } else if (token.startsWith("--benchmark-config=")) {
      defaults.benchmarkConfig = token.split("=")[1];
    } else if (token === "--benchmark-config") {
      defaults.benchmarkConfig = args.shift();
    } else if (token.startsWith("--benchmark-output=")) {
      defaults.benchmarkOutput = token.split("=")[1];
    } else if (token === "--benchmark-output") {
      defaults.benchmarkOutput = args.shift();
    } else if (token.startsWith("--benchmark-format=")) {
      const val = token.split("=")[1] as any;
      if (val === "json" || val === "html" || val === "csv")
        defaults.benchmarkFormat = val;
    } else if (token === "--benchmark-format") {
      const val = args.shift() as any;
      if (val === "json" || val === "html" || val === "csv")
        defaults.benchmarkFormat = val;
    } else if (token.startsWith("--benchmark-iterations=")) {
      const val = Number(token.split("=")[1]);
      if (!Number.isNaN(val) && val > 0) defaults.benchmarkIterations = val;
    } else if (token === "--benchmark-iterations") {
      const val = Number(args.shift());
      if (!Number.isNaN(val) && val > 0) defaults.benchmarkIterations = val;
    } else if (token.startsWith("--benchmark-warmup=")) {
      const val = Number(token.split("=")[1]);
      if (!Number.isNaN(val) && val >= 0) defaults.benchmarkWarmup = val;
    } else if (token === "--benchmark-warmup") {
      const val = Number(args.shift());
      if (!Number.isNaN(val) && val >= 0) defaults.benchmarkWarmup = val;
    }
  }
  return defaults;
}

function printHelp(): void {
  const help = `
ImageFlowIO CLI

Usage:
  imageflowio --config <path/to/config.json> [--validate-only] [--verbose]
  imageflowio benchmark [--benchmark-type <type>] [options]

Options:
  -c, --config         Path to config.json (default: ./config.json)
  -V, --version        Print version and exit
      --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
      --input <path>   Override input.source
      --output <path>  Override output.save.path
      --backend <b>    Backend override: auto|onnx|noop|tfjs
      --threads <n>    Threads override: number|auto
      --json-errors    Print validation errors as JSON
      --errors <m>     Error output mode: json|pretty (default: pretty)
      --log-file <p>   Write errors/logs to file
      --log-level <l>  Override logging.level: debug|info|error
      --concurrency <n>  Max parallel workers for directory inputs (default: 1)
      --progress       Print progress updates for directory inputs
      --viz <t>        Visualization: sideBySide|overlay|heatmap|difference
      --viz-alpha <a>  Visualization overlay alpha (0..1)
      --viz-out <dir>  Visualization output directory
      --dry-run        Validate and print plan only
      --print-schema   Print packaged schema path

Benchmark Commands:
  benchmark            Run performance benchmarks
      --benchmark-type <type>  Benchmark type: backend|pipeline|memory|scalability|all
      --benchmark-config <path>  Path to benchmark configuration file
      --benchmark-output <path>  Output path for benchmark results
      --benchmark-format <fmt>  Output format: json|html|csv (default: json)
      --benchmark-iterations <n>  Number of benchmark iterations (default: 100)
      --benchmark-warmup <n>  Number of warmup runs (default: 10)

  -h, --help           Show this help
`;
  // eslint-disable-next-line no-console
  console.log(help);
}

async function validateConfig(
  configPath: string,
  verbose: boolean
): Promise<{ valid: boolean; errors?: any[]; errorsText?: string }> {
  const here = getHereDir();
  const schemaPath = path.resolve(here, "../config.schema.json");
  const existsSchema = fs.existsSync(schemaPath);
  if (!existsSchema) {
    return {
      valid: false,
      errors: [],
      errorsText: `Schema not found at ${schemaPath}. Ensure 'config.schema.json' is packaged.`,
    };
  }

  // Prefer Ajv 2020 class when available; otherwise fall back to Ajv core and add metaschema
  let ajv: Ajv;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Ajv2020 = require("ajv/dist/2020").default as typeof Ajv;
    ajv = new Ajv2020({ allErrors: true, strict: false }) as unknown as Ajv;
  } catch {
    ajv = new Ajv({ allErrors: true, strict: false });
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const meta2020 = require("ajv/dist/refs/json-schema-2020-12.json");
    // @ts-ignore Ajv typings don't include addMetaSchema overload
    ajv.addMetaSchema(meta2020);
  } catch {}
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const validate = ajv.compile(schema);

  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: [],
      errorsText: `Config file not found: ${configPath}`,
    };
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const valid = validate(config) as boolean;
  if (!valid) {
    const errors = (validate.errors || []).map((e) => ({
      instancePath: e.instancePath,
      schemaPath: e.schemaPath,
      keyword: e.keyword,
      message: e.message,
      params: e.params,
    }));
    const errorsText = errors
      .map((e) => `${e.instancePath || "/"}: ${e.message} (${e.schemaPath})`)
      .join("\n");
    return { valid: false, errors, errorsText };
  }

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`Config '${configPath}' is valid.`);
  }
  return { valid: true, errors: [] };
}

async function runBenchmarks(options: CliOptions): Promise<void> {
  try {
    // Import benchmark suite
    const { BackendComparisonSuite } = await import('./benchmark/suites/backend-comparison.js');
    
    const suite = new BackendComparisonSuite();
    const benchmarkType = options.benchmarkType || 'backend';
    const iterations = options.benchmarkIterations || 100;
    const warmup = options.benchmarkWarmup || 10;
    const format = options.benchmarkFormat || 'json';
    const outputPath = options.benchmarkOutput || `./benchmark-results-${Date.now()}.${format}`;

    console.log(`Running ${benchmarkType} benchmarks...`);
    console.log(`Iterations: ${iterations}, Warmup: ${warmup}, Format: ${format}`);

    let results: any[] = [];

    switch (benchmarkType) {
      case 'backend':
        results = await suite.runClassificationBenchmarks({
          models: ['resnet50', 'mobilenet'],
          backends: ['onnx', 'tfjs', 'noop'],
          imageSizes: [[224, 224], [512, 512]],
          iterations,
          warmupRuns: warmup
        });
        break;
      
      case 'pipeline':
        results = await suite.runPreprocessingBenchmarks();
        break;
      
      case 'all':
        const backendResults = await suite.runClassificationBenchmarks({
          models: ['resnet50', 'mobilenet'],
          backends: ['onnx', 'tfjs', 'noop'],
          imageSizes: [[224, 224], [512, 512]],
          iterations,
          warmupRuns: warmup
        });
        const pipelineResults = await suite.runPreprocessingBenchmarks();
        results = [...backendResults, ...pipelineResults];
        break;
      
      default:
        console.error(`Unknown benchmark type: ${benchmarkType}`);
        process.exit(1);
    }

    // Generate report
    const report = await suite.generateComparisonReport(results, {
      format: format as 'json' | 'html' | 'csv',
      outputPath
    });

    console.log(`Benchmark completed. Results saved to: ${outputPath}`);
    
    if (format === 'json') {
      console.log('\nSummary:');
      results.forEach(result => {
        console.log(`${result.name}: ${result.throughput.toFixed(2)} ops/sec, ${result.averageTime.toFixed(2)}ms avg`);
      });
    }

  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  if (options.version) {
    const here = getHereDir();
    const pkgPath = path.resolve(here, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    // eslint-disable-next-line no-console
    console.log(pkg.version ?? "0.0.0");
    process.exit(0);
  }
  if (options.printSchema) {
    const here = getHereDir();
    const schemaPath = path.resolve(here, "../config.schema.json");
    // eslint-disable-next-line no-console
    console.log(schemaPath);
    process.exit(0);
  }

  // Handle benchmark commands
  if (options.benchmark) {
    await runBenchmarks(options);
    process.exit(0);
  }

  const { valid, errors, errorsText } = await validateConfig(
    options.configPath,
    options.verbose
  );
  if (!valid) {
    if (options.errorsMode === "json" || options.jsonErrors) {
      const payload = {
        ok: false,
        error: "config/invalid",
        errors: errors?.map((e) => ({
          instancePath: e.instancePath,
          schemaPath: e.schemaPath,
          keyword: e.keyword,
          message: e.message,
          params: e.params,
        })),
      };
      const out = JSON.stringify(payload, null, 2);
      // eslint-disable-next-line no-console
      console.error(out);
      if (options.logFile) {
        try {
          fs.writeFileSync(options.logFile, out, "utf-8");
        } catch {}
      }
    } else {
      const out = `Invalid config\n${errorsText}`;
      // eslint-disable-next-line no-console
      console.error(out);
      if (options.logFile) {
        try {
          fs.writeFileSync(options.logFile, out, "utf-8");
        } catch {}
      }
    }
    throw new ConfigValidationError("Invalid configuration");
  }

  if (options.validateOnly) {
    // eslint-disable-next-line no-console
    console.log("Validation successful.");
    process.exit(0);
  }

  const config = JSON.parse(fs.readFileSync(options.configPath, "utf-8"));
  if ((options as any).cacheMode) {
    config.execution = config.execution ?? {};
    config.execution.useCaching = (options as any).cacheMode;
  }
  if ((options as any).cacheDir) {
    config.execution = config.execution ?? {};
    config.execution.cacheDir = (options as any).cacheDir;
  }
  if (options.logLevel) {
    config.logging = config.logging ?? {};
    config.logging.level = options.logLevel;
  }
  if (options.logFile) {
    config.logging = config.logging ?? {};
    config.logging.saveLogs = true;
    config.logging.logPath = options.logFile;
  }
  if (options.inputOverride) {
    config.input = config.input ?? {};
    config.input.source = options.inputOverride;
  }
  if (options.outputOverride) {
    config.output = config.output ?? {};
    config.output.save = config.output.save ?? {};
    config.output.save.path = options.outputOverride;
  }
  if (options.vizType || options.vizAlpha != null || options.vizOut) {
    config.visualization = config.visualization ?? {};
    if (options.vizType) config.visualization.type = options.vizType;
    if (options.vizAlpha != null) config.visualization.alpha = options.vizAlpha;
    if (options.vizOut) config.visualization.outputPath = options.vizOut;
    config.visualization.apply = true;
  }
  if (options.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        { plan: { input: config.input, output: config.output } },
        null,
        2
      )
    );
    process.exit(0);
  }
  // Batch: if input.source is a directory, process all images inside
  const srcPath = path.resolve(process.cwd(), config.input?.source || "");
  const isDir =
    srcPath && fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory();
  const backendOpt =
    options.backend ?? (process.env.IMAGEFLOWIO_BACKEND as any) ?? "auto";
  const threadsOpt =
    options.threads ??
    (process.env.IMAGEFLOWIO_THREADS === "auto"
      ? "auto"
      : process.env.IMAGEFLOWIO_THREADS
      ? Number(process.env.IMAGEFLOWIO_THREADS)
      : undefined);
  if (isDir) {
    const startedAt = Date.now();
    const entries = fs
      .readdirSync(srcPath)
      .filter((f) => /\.(png|jpg|jpeg|webp|tif|tiff)$/i.test(f));
    let saved = 0;
    const items: Array<{ input: string; output?: string | null }> = [];
    const limit = Math.max(1, Number((options as any).concurrency || 1));
    let idx = 0;
    const showProgress = !!(options as any).progress;
    const total = entries.length;
    let done = 0;
    const processOne = async (file: string) => {
      const cfg = JSON.parse(JSON.stringify(config));
      cfg.input = cfg.input || { type: "image" };
      cfg.input.source = path.join(srcPath, file);
      const pipeline = new ImageFlowPipeline(cfg);
      const result = await pipeline.run({
        backend: backendOpt,
        threads: threadsOpt,
      });
      if (result.outputPath) saved++;
      items.push({
        input: cfg.input.source,
        output: result.outputPath || null,
      });
      done++;
      if (showProgress && (done % 10 === 0 || done === total)) {
        // eslint-disable-next-line no-console
        console.log(`Progress: ${done}/${total}`);
      }
    };
    const worker = async () => {
      while (true) {
        const i = idx++;
        if (i >= entries.length) break;
        const f = entries[i];
        try {
          await processOne(f);
        } catch {}
      }
    };
    const workers: Array<Promise<void>> = [];
    for (let i = 0; i < Math.min(limit, entries.length); i++)
      workers.push(worker());
    await Promise.all(workers);
    // eslint-disable-next-line no-console
    console.log(`Processed ${entries.length} files. Saved: ${saved}.`);

    // Write batch summary next to output path if available
    try {
      const outPathDir =
        (config.output?.save?.path &&
          path.resolve(process.cwd(), config.output.save.path)) ||
        null;
      const durationMs = Date.now() - startedAt;
      const summary = {
        ok: true,
        processed: entries.length,
        saved,
        durationMs,
        items,
      };
      const summaryJson = JSON.stringify(summary, null, 2);
      if (outPathDir) {
        if (!fs.existsSync(outPathDir))
          fs.mkdirSync(outPathDir, { recursive: true });
        fs.writeFileSync(
          path.join(outPathDir, "summary.json"),
          summaryJson,
          "utf-8"
        );
      } else {
        fs.writeFileSync(
          path.join(process.cwd(), `batch-summary-${Date.now()}.json`),
          summaryJson,
          "utf-8"
        );
      }
    } catch {}
  } else {
    const pipeline = new ImageFlowPipeline(config);
    const result = await pipeline.run({
      backend: backendOpt,
      threads: threadsOpt,
    });
    if (result.outputPath) {
      // eslint-disable-next-line no-console
      console.log(`Output saved to: ${result.outputPath}`);
    } else {
      // eslint-disable-next-line no-console
      console.log("Pipeline completed with no file output.");
    }
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
