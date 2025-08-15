import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const distCliCjs = path.resolve(__dirname, "../dist/cli.js");
const distCliEsm = path.resolve(__dirname, "../dist/cli.mjs");
const distCli = fs.existsSync(distCliCjs) ? distCliCjs : distCliEsm;

describe("TFJS backend (guarded)", () => {
  it("runs a tiny TFJS model when TFJS_TEST=1 and tfjs-node is installed", async () => {
    if (process.env.TFJS_TEST !== "1") {
      expect(true).toBe(true);
      return;
    }
    let tf: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      tf = require("@tensorflow/tfjs-node");
    } catch (e) {
      expect(true).toBe(true);
      return;
    }
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "tfjs-"));
    const modelDir = path.join(tmpDir, "model");
    fs.mkdirSync(modelDir);
    const inputPath = path.join(tmpDir, "in.png");
    const outDir = path.join(tmpDir, "out");
    const cfgPath = path.join(tmpDir, "config.json");

    // create tiny identity model: input->linear activation
    const input = tf.input({ shape: [2, 2, 3] });
    const out = tf.layers
      .activation({ activation: "linear" })
      .apply(input) as any;
    const model = tf.model({ inputs: input, outputs: out });
    await model.save(`file://${modelDir}`);

    // tiny 2x2 input PNG
    const sharpMod = (await import("sharp")).default;
    await sharpMod(
      Buffer.from([
        0,
        0,
        0,
        255,
        255,
        255, // row 0
        255,
        0,
        0,
        0,
        255,
        0, // row 1
      ]),
      { raw: { width: 2, height: 2, channels: 3 } }
    )
      .png()
      .toFile(inputPath);

    fs.writeFileSync(
      cfgPath,
      JSON.stringify(
        {
          $schema: path.resolve(process.cwd(), "config.schema.json"),
          model: { path: modelDir },
          input: { type: "image", source: inputPath },
          preprocessing: { format: { dataType: "float32", channels: 3 } },
          postprocessing: { denormalize: { apply: true, scale: 255 } },
          output: { save: { apply: true, path: outDir, format: "png" } },
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
      expect(true).toBe(true);
      return;
    }
    const ok = fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0;
    const text = `${res.stdout || ""}${res.stderr || ""}`;
    expect(ok || /Output saved to/.test(text)).toBe(true);
  });
});
