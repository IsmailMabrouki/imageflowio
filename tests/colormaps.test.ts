import { describe, it, expect } from "vitest";
import { mapValueToColor } from "../src/utils/colormaps";

describe("colormaps", () => {
  it("grayscale maps value to identical RGB", () => {
    const [r, g, b] = mapValueToColor(128, "grayscale");
    expect(r).toBe(128);
    expect(g).toBe(128);
    expect(b).toBe(128);
  });

  it("viridis produces non-gray colors for mid values", () => {
    const [r, g, b] = mapValueToColor(128, "viridis");
    // Expect not all channels equal (likely colored)
    expect(r === g && g === b).toBe(false);
  });

  it("magma and plasma endpoints map within 0-255", () => {
    const modes: Array<"magma" | "plasma"> = ["magma", "plasma"];
    for (const m of modes) {
      const low = mapValueToColor(0, m);
      const high = mapValueToColor(255, m);
      for (const v of [...low, ...high]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
});
