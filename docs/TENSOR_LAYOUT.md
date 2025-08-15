# Tensor Layouts in ImageFlowIO

This document explains how ImageFlowIO handles tensor layouts, primarily NHWC (channels-last) and NCHW (channels-first).

## Background

- NHWC: [N, H, W, C] — common for image libraries and many ONNX models exported from TensorFlow.
- NCHW: [N, C, H, W] — common in PyTorch and some ONNX models.

ImageFlowIO preprocesses images with Sharp, which naturally yields NHWC buffers ([H, W, C] for single images). Some backends prefer NCHW. The pipeline and backends cooperate to convert when needed.

## Configuration

`model.layout?: "nhwc" | "nchw"` in `config.json` is an optional hint. When set to `"nchw"`, and when the backend supports it, a conversion will be applied automatically.

## Conversion utilities

The public API exports two helpers:

- `nhwcToNchw(data: Float32Array, width: number, height: number, channels: number): Float32Array`
- `nchwToNhwc(data: Float32Array, width: number, height: number, channels: number): Float32Array`

These functions are used by the ONNX backend and can be used by downstream consumers as needed.

## ONNX backend behavior

- Input: If `model.layout` is `"nchw"`, or the output tensor dims look like NCHW, inputs are converted from NHWC to NCHW before inference.
- Output: If the output dims indicate NCHW, the backend converts back to NHWC for downstream processing and saving.

Heuristics are applied when explicit layout hints are not provided (e.g., dims `[1, C, H, W]` with small `C`).

## Pipeline defaults

- The preprocessing path produces NHWC float tensors when `preprocessing.format.dataType` is `"float32"` or `preprocessing.normalize.apply` is true.
- Postprocessing and saving assume NHWC (image buffers).

## Tips

- Set `model.layout` to improve performance and avoid extra copies.
- Ensure `preprocessing.format.channels` matches your model (1 for grayscale, 3 for RGB/BGR), and set `channelOrder: "bgr"` if your model expects BGR.
