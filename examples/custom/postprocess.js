/**
 * Custom postprocessing function example
 *
 * This function is called after model inference but before output saving.
 * It receives a Sharp image object and should return a Sharp image object.
 *
 * @param {Object} image - Sharp image object
 * @returns {Object} Sharp image object
 */
export default async function customPostprocess(image) {
  // Example: Apply custom postprocessing transformations
  // This could be any custom image processing logic

  // Example 1: Apply a custom color correction
  const corrected = image.modulate({
    brightness: 1.1, // Slight brightness boost
    contrast: 1.2, // Increase contrast
    saturation: 1.1, // Slight saturation boost
  });

  // Example 2: Apply a custom blur effect
  // const blurred = image.blur(2);

  // Example 3: Apply a custom sharpening filter
  // const sharpened = image.sharpen({
  //   sigma: 1,
  //   flat: 1,
  //   jagged: 2
  // });

  // Example 4: Apply a custom watermark or overlay
  // const watermarked = image.composite([{
  //   input: Buffer.from('<svg>...</svg>'),
  //   top: 10,
  //   left: 10
  // }]);

  return corrected;
}

// Alternative export names that are also supported:
// export const postprocess = customPostprocess;
// export const run = customPostprocess;
