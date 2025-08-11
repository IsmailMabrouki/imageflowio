export type RGB = [number, number, number];

const PASCAL_VOC: RGB[] = [
  [0, 0, 0],
  [128, 0, 0],
  [0, 128, 0],
  [128, 128, 0],
  [0, 0, 128],
  [128, 0, 128],
  [0, 128, 128],
  [128, 128, 128],
  [64, 0, 0],
  [192, 0, 0],
  [64, 128, 0],
  [192, 128, 0],
  [64, 0, 128],
  [192, 0, 128],
  [64, 128, 128],
  [192, 128, 128],
  [0, 64, 0],
  [128, 64, 0],
  [0, 192, 0],
  [128, 192, 0],
  [0, 64, 128],
];

export function getPresetPalette(name: string): RGB[] {
  switch (name.toLowerCase()) {
    case "pascal_voc":
      return PASCAL_VOC;
    default:
      return PASCAL_VOC;
  }
}
