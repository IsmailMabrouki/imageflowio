/**
 * Custom preprocessing function example
 *
 * This function is called after standard preprocessing but before tensor conversion.
 * It receives a Sharp image object and should return a Sharp image object.
 *
 * @param {Object} image - Sharp image object
 * @returns {Object} Sharp image object
 */
export default async function customPreprocess(image) {
  // Example: Apply a custom filter or transformation
  // This could be any custom image processing logic

  // Example 1: Apply a simple brightness adjustment
  const adjusted = image.modulate({
    brightness: 1.2, // Increase brightness by 20%
    saturation: 0.8, // Reduce saturation by 20%
  });

  // Example 2: Apply a custom convolution filter
  // const filtered = image.convolve({
  //   width: 3,
  //   height: 3,
  //   kernel: [
  //     0, -1, 0,
  //     -1, 5, -1,
  //     0, -1, 0
  //   ]
  // });

  // Example 3: Apply a custom color transformation
  // const transformed = image.tint({ r: 255, g: 200, b: 100 });

  return adjusted;
}

// Alternative export names that are also supported:
// export const preprocess = customPreprocess;
// export const run = customPreprocess;
