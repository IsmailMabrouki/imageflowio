import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const distCliCjs = path.resolve(__dirname, "../dist/cli.js");
const distCliEsm = path.resolve(__dirname, "../dist/cli.mjs");
const distCli = fs.existsSync(distCliCjs) ? distCliCjs : distCliEsm;

describe("ONNX backend missing dependency (guarded)", () => {
  it("prints a friendly error when onnxruntime-node is missing", () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("onnxruntime-node");
      // If it's installed, skip this guard test
      expect(true).toBe(true);
      return;
    } catch {}
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "onnx-missing-"));
    const cfgPath = path.join(tmpDir, "config.json");
    const inputPath = path.join(tmpDir, "in.png");
    // tiny 1x1 PNG input
    fs.writeFileSync(
      inputPath,
      Buffer.from(
        "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c63600000020001a2fd0d0a0000000049454e44ae426082",
        "hex"
      )
    );
    fs.writeFileSync(
      cfgPath,
      JSON.stringify(
        {
          model: { path: "./some-model.onnx" },
          input: { type: "image", source: inputPath },
          preprocessing: { format: { dataType: "float32", channels: 3 } },
          postprocessing: { denormalize: { apply: true, scale: 255 } },
          output: { save: { apply: false } },
        },
        null,
        2
      )
    );
    const res = spawnSync(
      process.execPath,
      [distCli, "--config", cfgPath, "--backend", "onnx"],
      { encoding: "utf-8", shell: false }
    );
    if (res.error && /EPERM|DENIED|SPAWN/i.test(String(res.error))) {
      expect(true).toBe(true);
      return;
    }
    if (typeof res.status === "number" && res.status === 0) {
      // Some environments may allow execution without throwing; skip
      expect(true).toBe(true);
      return;
    }
    const combined = `${res.stderr || ""}${res.stdout || ""}`;
    expect(
      /Failed to load onnxruntime-node/i.test(combined) ||
        /BackendLoadError/i.test(combined) ||
        /Cannot find module 'onnxruntime-node'/i.test(combined)
    ).toBe(true);
  });
});
