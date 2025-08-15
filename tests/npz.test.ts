import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { writeNpz } from "../src/utils/npy";

describe("NPZ writer", () => {
  it("creates a ZIP file with at least one entry and NPY header", async () => {
    const outRoot = path.join(process.cwd(), "testoutput");
    if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(outRoot, "npz-unit-"));
    const npzPath = path.join(tmpDir, "test.npz");
    const data = new Uint8Array([0, 1, 2, 3]);
    await writeNpz(npzPath, [
      { name: "arr0", data, shape: [4], dtype: "uint8" },
    ]);
    const buf = fs.readFileSync(npzPath);
    // ZIP local file header signature PK\x03\x04
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    // Check that the embedded NPY magic string appears somewhere
    const magicIndex = buf.indexOf(Buffer.from("\x93NUMPY", "binary"));
    expect(magicIndex).toBeGreaterThan(-1);
  });
});
