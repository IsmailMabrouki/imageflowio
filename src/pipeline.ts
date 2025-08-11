import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ImageFlowConfig, Size2 } from "./types";

export class ImageFlowPipeline {
  constructor(private readonly config: ImageFlowConfig) {}

  async run(): Promise<{ outputPath?: string }> {
    const { input } = this.config;
    if (input.type !== "image")
      throw new Error("Only image input is supported in this preview.");

    const inputAbs = path.resolve(process.cwd(), input.source);
    const image = sharp(inputAbs, { failOn: "none" });
    const originalMeta = await image.metadata();

    let work = image.clone();

    // Preprocessing: resize
    const pp = this.config.preprocessing;
    if (pp?.resize?.apply && pp.resize.imageSize) {
      const [w, h] = pp.resize.imageSize;
      if (pp.resize.keepAspectRatio) {
        const fit = pp.resize.resizeMode === "fill" ? "fill" : "inside"; // fit/inside mapping
        work = work.resize({
          width: w,
          height: h,
          fit: fit as any,
          withoutEnlargement: false,
        });
      } else {
        work = work.resize({ width: w, height: h, fit: "fill" });
      }
    }

    if (pp?.centerCrop?.apply && pp.centerCrop.size) {
      const [cw, ch] = pp.centerCrop.size;
      work = work.resize({
        width: cw,
        height: ch,
        fit: "cover",
        position: sharp.strategy.attention,
      });
    }

    if (pp?.grayscale?.apply) {
      work = work.grayscale();
    }

    // For now we skip explicit normalize/format at pixel level; sharp operates in sRGB by default.

    // Placeholder for inference: image-to-image identity transform (no-op)
    let out = work;

    // Postprocessing
    const post = this.config.postprocessing;
    // toneMap/activation/clamp/denormalize are not implemented in this preview

    // Resize back to input size on request
    if (
      post?.resizeTo === "input" &&
      originalMeta.width &&
      originalMeta.height
    ) {
      out = out.resize({
        width: originalMeta.width,
        height: originalMeta.height,
        fit: "fill",
      });
    } else if (Array.isArray(post?.resizeTo)) {
      const size = post?.resizeTo as Size2;
      out = out.resize({ width: size[0], height: size[1], fit: "fill" });
    }

    // Output saving
    const output = this.config.output;
    if (output?.save?.apply) {
      const dir = path.resolve(process.cwd(), output.save.path ?? "./outputs");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = (output.save.filename ?? "{model}_{timestamp}.png")
        .replace(
          "{model}",
          this.config.model.name ?? path.parse(this.config.model.path).name
        )
        .replace("{timestamp}", new Date().toISOString().replace(/[:.]/g, "-"));
      const target = path.join(dir, filename);

      const format = (output.save.format ?? "png").toLowerCase();
      if (format === "png") {
        await out.png({ compressionLevel: 9 }).toFile(target);
      } else if (format === "jpeg") {
        await out.jpeg({ quality: output.save.quality ?? 90 }).toFile(target);
      } else if (format === "webp") {
        await out.webp({ quality: output.save.quality ?? 90 }).toFile(target);
      } else if (format === "tiff") {
        await out
          .tiff({
            quality: output.save.quality ?? 90,
            bitdepth: (output.save.bitDepth as any) ?? 8,
          })
          .toFile(target);
      } else {
        await out.toFile(target);
      }
      return { outputPath: target };
    }

    return {};
  }
}
