import fs from "fs";

type DType = "float32" | "uint8";

function getDescr(dtype: DType): string {
  switch (dtype) {
    case "float32":
      return "<f4"; // little-endian float32
    case "uint8":
      return "|u1"; // not endian-dependent
    default:
      throw new Error(`Unsupported dtype for NPY: ${dtype}`);
  }
}

export function writeNpy(
  filePath: string,
  data: Float32Array | Uint8Array,
  shape: number[],
  dtype: DType
): void {
  const magic = Buffer.from("\x93NUMPY", "binary");
  const version = Buffer.from([0x01, 0x00]);
  const descr = getDescr(dtype);
  const shapeStr = `(${shape.join(", ")}${shape.length === 1 ? "," : ""})`;
  const headerObj = `{ 'descr': '${descr}', 'fortran_order': False, 'shape': ${shapeStr}, }`;
  // Pad header to 16-byte alignment ending with newline
  const headerLen = 10 + 2 + 2; // magic + version + headerLen field sizes (for calculation reference)
  let headerText = headerObj;
  const baseLen = magic.length + version.length + 2; // +2 for header length field
  let totalLen = baseLen + headerText.length + 1; // +1 for newline
  const pad = 16 - (totalLen % 16);
  if (pad > 0 && pad < 16) headerText = headerText + " ".repeat(pad - 1);
  headerText += "\n";

  const headerBuf = Buffer.from(headerText, "latin1");
  const headerSize = Buffer.alloc(2);
  headerSize.writeUInt16LE(headerBuf.length, 0);

  const payload = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const out = Buffer.concat([magic, version, headerSize, headerBuf, payload]);
  fs.writeFileSync(filePath, out);
}
