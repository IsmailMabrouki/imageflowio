export function nhwcToNchw(
  data: Float32Array,
  width: number,
  height: number,
  channels: number
): Float32Array {
  const out = new Float32Array(channels * height * width);
  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nhwcIndex = (y * width + x) * channels + c;
        const nchwIndex = c * height * width + y * width + x;
        out[nchwIndex] = data[nhwcIndex];
      }
    }
  }
  return out;
}

export function nchwToNhwc(
  data: Float32Array,
  width: number,
  height: number,
  channels: number
): Float32Array {
  const out = new Float32Array(height * width * channels);
  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nchwIndex = c * height * width + y * width + x;
        const nhwcIndex = (y * width + x) * channels + c;
        out[nhwcIndex] = data[nchwIndex];
      }
    }
  }
  return out;
}
