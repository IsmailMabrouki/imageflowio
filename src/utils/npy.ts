import fs from "fs";
import zlib from "zlib";

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

export function writeNpz(
  filePath: string,
  arrays: Array<{
    name: string;
    data: Float32Array | Uint8Array;
    shape: number[];
    dtype: DType;
  }>
): void {
  // Minimal NPZ writer: ZIP with stored entries created from NPY buffers
  // We use no compression for simplicity and portability
  const files: { name: string; data: Buffer }[] = arrays.map((arr) => {
    const tmpPath = `${arr.name}.npy`;
    // build in-memory NPY
    const magic = Buffer.from("\x93NUMPY", "binary");
    const version = Buffer.from([0x01, 0x00]);
    const descr = arr.dtype === "float32" ? "<f4" : "|u1";
    const shapeStr = `(${arr.shape.join(", ")}${
      arr.shape.length === 1 ? "," : ""
    })`;
    const headerObj = `{ 'descr': '${descr}', 'fortran_order': False, 'shape': ${shapeStr}, }`;
    const baseLen = magic.length + version.length + 2;
    let headerText = headerObj;
    let totalLen = baseLen + headerText.length + 1;
    const pad = 16 - (totalLen % 16);
    if (pad > 0 && pad < 16) headerText = headerText + " ".repeat(pad - 1);
    headerText += "\n";
    const headerBuf = Buffer.from(headerText, "latin1");
    const headerSize = Buffer.alloc(2);
    headerSize.writeUInt16LE(headerBuf.length, 0);
    const payload = Buffer.from(
      arr.data.buffer,
      arr.data.byteOffset,
      arr.data.byteLength
    );
    const npy = Buffer.concat([magic, version, headerSize, headerBuf, payload]);
    return { name: tmpPath, data: npy };
  });

  // Build a minimal ZIP (no compression): local file headers + central directory + end of central dir
  const localHeaders: Buffer[] = [];
  const fileDatas: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf-8");
    const crc = zlib.crc32 ? (zlib as any).crc32(f.data) >>> 0 : 0; // fallback 0 if not available
    const compMethod = 0; // no compression
    const lastMod = 0;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(compMethod, 8);
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(f.data.length, 18); // comp size
    localHeader.writeUInt32LE(f.data.length, 22); // uncomp size
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len
    localHeaders.push(localHeader, nameBuf);
    fileDatas.push(f.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(compMethod, 10);
    central.writeUInt16LE(0, 12); // time
    central.writeUInt16LE(0, 14); // date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra len
    central.writeUInt16LE(0, 32); // comment len
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attribs
    central.writeUInt32LE(0, 38); // external attribs
    central.writeUInt32LE(offset, 42); // relative offset of local header
    centralHeaders.push(central, nameBuf);

    offset += localHeader.length + nameBuf.length + f.data.length;
  }
  const centralDir = Buffer.concat(centralHeaders);
  const localPart = Buffer.concat([...localHeaders, ...fileDatas]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(localPart.length, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(filePath, Buffer.concat([localPart, centralDir, end]));
}
