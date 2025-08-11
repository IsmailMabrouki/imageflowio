import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const distCli = path.resolve(__dirname, "../dist/cli.js");

describe("CLI", () => {
  it("prints help", () => {
    const out = execFileSync(process.execPath, [distCli, "--help"], {
      encoding: "utf-8",
    });
    expect(out).toMatch(/ImageFlowIO CLI/);
  });

  it("prints version", () => {
    const out = execFileSync(process.execPath, [distCli, "--version"], {
      encoding: "utf-8",
    }).trim();
    expect(out).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("validates a minimal config", () => {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-config-"));
    const cfgPath = path.join(tmpDir, "config.json");
    fs.writeFileSync(
      cfgPath,
      JSON.stringify(
        {
          $schema: path.relative(
            tmpDir,
            path.resolve(process.cwd(), "config.schema.json")
          ),
          model: { path: "./assets/unet.onnx" },
          input: {
            type: "image",
            source: path.relative(
              tmpDir,
              path.resolve(process.cwd(), "README.md")
            ),
          },
          output: { save: { apply: false } },
        },
        null,
        2
      )
    );
    const out = execFileSync(
      process.execPath,
      [distCli, "--config", cfgPath, "--validate-only"],
      { encoding: "utf-8" }
    );
    expect(out).toMatch(/Validation successful/);
  });
});
