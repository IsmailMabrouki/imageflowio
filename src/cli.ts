#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "./pipeline";

type CliOptions = {
  configPath: string;
  validateOnly: boolean;
  verbose: boolean;
  version: boolean;
  dryRun: boolean;
  inputOverride?: string;
  outputOverride?: string;
  printSchema: boolean;
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
    else if (token.startsWith("--input="))
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
): Promise<{ valid: boolean; errorsText?: string }> {
  const schemaPath = path.resolve(__dirname, "../config.schema.json");
  const existsSchema = fs.existsSync(schemaPath);
  if (!existsSchema) {
    return {
      valid: false,
      errorsText: `Schema not found at ${schemaPath}. Ensure 'config.schema.json' is packaged.`,
    };
  }

  const Ajv2020 = (await import("ajv/dist/2020")).default;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const validate = ajv.compile(schema);

  if (!fs.existsSync(configPath)) {
    return { valid: false, errorsText: `Config file not found: ${configPath}` };
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const valid = validate(config) as boolean;
  if (!valid) {
    const errorsText = ajv.errorsText(validate.errors, { separator: "\n" });
    return { valid: false, errorsText };
  }

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`Config '${configPath}' is valid.`);
  }
  return { valid: true };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  if (options.version) {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    // eslint-disable-next-line no-console
    console.log(pkg.version ?? "0.0.0");
    process.exit(0);
  }
  if (options.printSchema) {
    const schemaPath = path.resolve(__dirname, "../config.schema.json");
    // eslint-disable-next-line no-console
    console.log(schemaPath);
    process.exit(0);
  }

  const { valid, errorsText } = await validateConfig(
    options.configPath,
    options.verbose
  );
  if (!valid) {
    // eslint-disable-next-line no-console
    console.error(`Invalid config:\n${errorsText}`);
    process.exit(1);
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
  const result = await pipeline.run();
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
  console.error(err);
  process.exit(1);
});
