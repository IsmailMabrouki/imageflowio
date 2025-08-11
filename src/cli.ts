#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { ImageFlowPipeline } from "./pipeline";

type CliOptions = {
  configPath: string;
  validateOnly: boolean;
  verbose: boolean;
  help: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    configPath: "config.json",
    validateOnly: false,
    verbose: false,
    help: false,
  };

  const args = [...argv.slice(2)];
  while (args.length > 0) {
    const token = args.shift() as string;
    if (token === "--help" || token === "-h") defaults.help = true;
    else if (token === "--validate-only" || token === "-V")
      defaults.validateOnly = true;
    else if (token === "--verbose" || token === "-v") defaults.verbose = true;
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
  -V, --validate-only  Validate config and exit (no execution)
  -v, --verbose        Verbose logs
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

  const Ajv = (await import("ajv")).default;
  const ajv = new Ajv({ allErrors: true, strict: false });
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
