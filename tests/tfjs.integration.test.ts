import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { TfjsBackend } from "../src/backends/tfjs";

const distCliCjs = path.resolve(__dirname, "../dist/cli.js");
const distCliEsm = path.resolve(__dirname, "../dist/cli.mjs");
const distCli = fs.existsSync(distCliCjs) ? distCliCjs : distCliEsm;

describe("TFJS backend integration (guarded)", () => {
  let hasTfjs = false;

  beforeAll(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("@tensorflow/tfjs-node");
      hasTfjs = true;
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("@tensorflow/tfjs");
        hasTfjs = true;
      } catch {
        hasTfjs = false;
      }
    }
  });

  it("loads and runs with enhanced backend interface", async () => {
    if (!hasTfjs) {
      console.log(
        "Skipping TFJS integration test - TensorFlow.js not available"
      );
      return;
    }

    // Create a simple test model directory (this would be a real TFJS model in practice)
    const testModelDir = path.join(__dirname, "../examples/tfjs-test-model");

    // Skip if no test model exists
    if (
      !fs.existsSync(testModelDir) ||
      !fs.existsSync(path.join(testModelDir, "model.json"))
    ) {
      console.log("Skipping TFJS integration test - no test model found");
      return;
    }

    const backend = new TfjsBackend();

    // Test enhanced model config
    const modelConfig = {
      path: testModelDir,
      layout: "nhwc" as const,
      inputName: "input",
      outputName: "output",
    };

    await expect(backend.loadModel(modelConfig)).resolves.not.toThrow();

    // Test inference with enhanced input
    const testInput = {
      data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]), // 1x2x3 image
      width: 2,
      height: 1,
      channels: 3,
      layout: "nhwc" as const,
      inputName: "input",
    };

    const result = await backend.infer(testInput);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("width");
    expect(result).toHaveProperty("height");
    expect(result).toHaveProperty("channels");
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("handles CLI execution with enhanced model config", () => {
    if (!hasTfjs) {
      console.log("Skipping TFJS CLI test - TensorFlow.js not available");
      return;
    }

    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "tfjs-integration-"));

    // Create test input
    const inputPath = path.join(tmpDir, "in.png");
    fs.writeFileSync(
      inputPath,
      Buffer.from(
        "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c63600000020001a2fd0d0a0000000049454e44ae426082",
        "hex"
      )
    );

    // Create config with enhanced model settings
    const cfgPath = path.join(tmpDir, "config.json");
    fs.writeFileSync(
      cfgPath,
      JSON.stringify(
        {
          model: {
            path: "./examples/tfjs-test-model",
            layout: "nhwc",
            inputName: "input",
            outputName: "output",
          },
          input: { type: "image", source: inputPath },
          preprocessing: {
            format: { dataType: "float32", channels: 3 },
            normalize: {
              apply: true,
              mean: [0.5, 0.5, 0.5],
              std: [0.5, 0.5, 0.5],
            },
          },
          postprocessing: { denormalize: { apply: true, scale: 255 } },
          output: { save: { apply: false } },
          execution: { warmupRuns: 1 },
        },
        null,
        2
      )
    );

    const res = spawnSync(
      process.execPath,
      [distCli, "--config", cfgPath, "--backend", "tfjs"],
      { encoding: "utf-8", shell: false }
    );

    if (res.error && /EPERM|DENIED|SPAWN/i.test(String(res.error))) {
      console.log("Skipping TFJS CLI test - execution blocked");
      return;
    }

    // If model doesn't exist, expect a reasonable error
    if (res.status !== 0) {
      const combined = `${res.stderr || ""}${res.stdout || ""}`;
      expect(
        /Failed to load|not found|BackendLoadError|model\.json/i.test(combined)
      ).toBe(true);
    } else {
      // If it succeeds, that's great
      expect(res.status).toBe(0);
    }
  });

  it("supports layout conversion in enhanced interface", async () => {
    if (!hasTfjs) {
      console.log(
        "Skipping TFJS layout conversion test - TensorFlow.js not available"
      );
      return;
    }

    const testModelDir = path.join(__dirname, "../examples/tfjs-test-model");
    if (
      !fs.existsSync(testModelDir) ||
      !fs.existsSync(path.join(testModelDir, "model.json"))
    ) {
      console.log("Skipping TFJS layout conversion test - no test model found");
      return;
    }

    const backend = new TfjsBackend();

    // Test NCHW layout configuration
    const modelConfig = {
      path: testModelDir,
      layout: "nchw" as const,
      inputName: "input",
      outputName: "output",
    };

    await expect(backend.loadModel(modelConfig)).resolves.not.toThrow();

    // Test inference with NCHW input
    const testInput = {
      data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]), // 1x2x3 image in NCHW
      width: 2,
      height: 1,
      channels: 3,
      layout: "nchw" as const,
    };

    const result = await backend.infer(testInput);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("width");
    expect(result).toHaveProperty("height");
    expect(result).toHaveProperty("channels");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("handles model.json validation correctly", async () => {
    if (!hasTfjs) {
      console.log(
        "Skipping TFJS model validation test - TensorFlow.js not available"
      );
      return;
    }

    const backend = new TfjsBackend();

    // Test with invalid model path
    const invalidModelConfig = {
      path: "/nonexistent/path",
      layout: "nhwc" as const,
    };

    await expect(backend.loadModel(invalidModelConfig)).rejects.toThrow();
  });
});
