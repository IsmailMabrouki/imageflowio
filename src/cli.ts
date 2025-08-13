#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "./pipeline";
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
  backend?: "auto" | "onnx" | "noop";
  threads?: number | "auto";
  jsonErrors?: boolean;
  logFile?: string;
  help: boolean;
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
      if (val === "auto" || val === "onnx" || val === "noop")
        defaults.backend = val;
    } else if (token === "--backend") {
      const val = args.shift() as any;
      if (val === "auto" || val === "onnx" || val === "noop")
        defaults.backend = val;
    } else if (token.startsWith("--threads=")) {
      const val = token.split("=")[1];
      defaults.threads = val === "auto" ? "auto" : Number(val);
    } else if (token === "--threads") {
      const val = args.shift();
      if (val) defaults.threads = val === "auto" ? "auto" : Number(val);
    } else if (token === "--json-errors") {
      defaults.jsonErrors = true;
    } else if (token.startsWith("--log-file=")) {
      defaults.logFile = token.split("=")[1];
    } else if (token === "--log-file") {
      defaults.logFile = args.shift();
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
  }
  return defaults;
}

function printHelp(): void {
  const help = `
ImageFlowIO CLI

Usage:
  imageflowio --config <path/to/config.json> [--validate-only] [--verbose]

Options:
  -c, --config         Path to config.json (default: ./config.json)
  -V, --version        Print version and exit
      --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
      --input <path>   Override input.source
      --output <path>  Override output.save.path
      --backend <b>    Backend override: auto|onnx|noop
      --threads <n>    Threads override: number|auto
      --json-errors    Print validation errors as JSON
      --log-file <p>   Write errors/logs to file
      --dry-run        Validate and print plan only
      --print-schema   Print packaged schema path
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

  // Use Ajv 2020 via require to avoid d.ts resolution issues in bundlers
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Ajv2020 = require("ajv/dist/2020")
    .default as typeof import("ajv/dist/2020").default;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  try {
    const meta2020 = require("ajv/dist/refs/json-schema-2020-12.json");
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

  const { valid, errors, errorsText } = await validateConfig(
    options.configPath,
    options.verbose
  );
  if (!valid) {
    if (options.jsonErrors) {
      const payload = { ok: false, error: "config/invalid", errors };
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
  if (options.inputOverride) {
    config.input = config.input ?? {};
    config.input.source = options.inputOverride;
  }
  if (options.outputOverride) {
    config.output = config.output ?? {};
    config.output.save = config.output.save ?? {};
    config.output.save.path = options.outputOverride;
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
  const pipeline = new ImageFlowPipeline(config);
  const result = await pipeline.run({
    backend:
      options.backend ?? (process.env.IMAGEFLOWIO_BACKEND as any) ?? "auto",
    threads:
      options.threads ??
      (process.env.IMAGEFLOWIO_THREADS === "auto"
        ? "auto"
        : process.env.IMAGEFLOWIO_THREADS
        ? Number(process.env.IMAGEFLOWIO_THREADS)
        : undefined),
  });
  if (result.outputPath) {
    // eslint-disable-next-line no-console
    console.log(`Output saved to: ${result.outputPath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log("Pipeline completed with no file output.");
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
