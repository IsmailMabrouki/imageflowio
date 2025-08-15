# Backend Comparison Guide

This document provides a comprehensive comparison of ImageFlowIO's inference backends to help you choose the right one for your use case.

## Backend Overview

ImageFlowIO supports three inference backends, each with different capabilities and performance characteristics:

| Backend           | Status        | Model Format  | Performance | Memory Usage | Features                           |
| ----------------- | ------------- | ------------- | ----------- | ------------ | ---------------------------------- |
| **ONNX Runtime**  | ✅ Production | `.onnx` files | High        | Low          | Session caching, layout conversion |
| **TensorFlow.js** | ⚠️ Preview    | TFJS models   | Medium      | Medium       | Graph/Layers models                |
| **Noop**          | ✅ Production | None          | N/A         | Minimal      | Testing, preprocessing validation  |

## Detailed Backend Comparison

### ONNX Runtime Backend

**Best for**: Production deployments, high-performance inference, ONNX models

#### Capabilities

- ✅ **Model Format**: ONNX files (`.onnx`)
- ✅ **Performance**: High (optimized C++ runtime)
- ✅ **Memory**: Efficient memory management
- ✅ **Session Caching**: Automatic session reuse
- ✅ **Layout Conversion**: Automatic NHWC ↔ NCHW conversion
- ✅ **Tensor Names**: Support for custom input/output names
- ✅ **Error Handling**: Comprehensive error messages

#### Installation

```bash
npm install onnxruntime-node
```

#### Configuration

```json
{
  "execution": {
    "backend": "onnx"
  },
  "model": {
    "path": "./model.onnx",
    "layout": "nhwc", // or "nchw"
    "inputName": "input", // optional
    "outputName": "output" // optional
  }
}
```

#### Performance Characteristics

- **Inference Speed**: Fastest among all backends
- **Memory Usage**: Low and predictable
- **Startup Time**: Moderate (model loading)
- **Warmup**: 2-3 runs recommended for stable timing

#### Use Cases

- Production image processing pipelines
- High-throughput inference
- ONNX models from PyTorch, TensorFlow, etc.
- Real-time applications

---

### TensorFlow.js Backend

**Best for**: TFJS models, web deployment, prototyping

#### Capabilities

- ✅ **Model Format**: TensorFlow.js models (Graph/Layers)
- ⚠️ **Performance**: Moderate (JavaScript runtime)
- ⚠️ **Memory**: Higher than ONNX
- ✅ **Layout Conversion**: Automatic NHWC ↔ NCHW conversion
- ✅ **Model Types**: Graph models and Layers models
- ⚠️ **Error Handling**: Basic error messages

#### Installation

```bash
# Preferred (faster)
npm install @tensorflow/tfjs-node

# Alternative (slower)
npm install @tensorflow/tfjs
```

#### Configuration

```json
{
  "execution": {
    "backend": "tfjs"
  },
  "model": {
    "path": "./tfjs-model/", // directory with model.json
    "layout": "nhwc"
  }
}
```

#### Performance Characteristics

- **Inference Speed**: Moderate (slower than ONNX)
- **Memory Usage**: Higher than ONNX
- **Startup Time**: Slow (model loading + initialization)
- **Warmup**: 3-5 runs recommended

#### Use Cases

- TensorFlow.js models
- Web deployment scenarios
- Prototyping and experimentation
- Models exported from TensorFlow

---

### Noop Backend

**Best for**: Testing, validation, preprocessing verification

#### Capabilities

- ✅ **Model Format**: None required
- ✅ **Performance**: N/A (identity transform)
- ✅ **Memory**: Minimal
- ✅ **Testing**: Perfect for pipeline validation
- ✅ **Preprocessing**: Validates preprocessing pipeline
- ✅ **Postprocessing**: Validates postprocessing pipeline

#### Installation

```bash
# No additional installation required
```

#### Configuration

```json
{
  "execution": {
    "backend": "noop"
  }
  // No model configuration needed
}
```

#### Performance Characteristics

- **Inference Speed**: N/A (identity transform)
- **Memory Usage**: Minimal
- **Startup Time**: Instant
- **Warmup**: Not applicable

#### Use Cases

- Testing preprocessing/postprocessing pipelines
- Validating configuration files
- Debugging pipeline issues
- CI/CD testing without models

## Backend Selection Guide

### Choose ONNX Runtime when:

- ✅ You have ONNX models
- ✅ Performance is critical
- ✅ Memory usage is a concern
- ✅ Production deployment
- ✅ High-throughput requirements

### Choose TensorFlow.js when:

- ✅ You have TFJS models
- ✅ Web deployment is planned
- ✅ ONNX conversion is not possible
- ✅ Prototyping with TFJS models

### Choose Noop when:

- ✅ Testing preprocessing/postprocessing
- ✅ Validating configuration
- ✅ Debugging pipeline issues
- ✅ CI/CD without models

## Performance Benchmarks

_Note: These are approximate benchmarks. Actual performance depends on model size, input resolution, and hardware._

| Backend       | Small Model (224x224) | Large Model (512x512) | Memory Usage |
| ------------- | --------------------- | --------------------- | ------------ |
| ONNX Runtime  | ~50ms                 | ~200ms                | ~100MB       |
| TensorFlow.js | ~150ms                | ~600ms                | ~300MB       |
| Noop          | ~5ms                  | ~10ms                 | ~10MB        |

## Migration Guide

### From TensorFlow.js to ONNX

1. Convert your TFJS model to ONNX:
   ```bash
   # Using tf2onnx or similar tools
   tf2onnx.convert(model_path, output_path)
   ```
2. Update configuration:
   ```json
   {
     "execution": {
       "backend": "onnx"
     },
     "model": {
       "path": "./model.onnx"
     }
   }
   ```

### From ONNX to TensorFlow.js

1. Convert your ONNX model to TFJS:
   ```bash
   # Using onnx2tf or similar tools
   onnx2tf model.onnx --output tfjs-model/
   ```
2. Update configuration:
   ```json
   {
     "execution": {
       "backend": "tfjs"
     },
     "model": {
       "path": "./tfjs-model/"
     }
   }
   ```

## Troubleshooting

### ONNX Runtime Issues

- **Missing dependency**: `npm install onnxruntime-node`
- **Model loading errors**: Check model file integrity
- **Layout issues**: Set `model.layout` explicitly
- **Memory errors**: Enable tiling for large images

### TensorFlow.js Issues

- **Missing dependency**: `npm install @tensorflow/tfjs-node`
- **Model format**: Ensure model directory contains `model.json`
- **Performance**: Use `@tensorflow/tfjs-node` instead of `@tensorflow/tfjs`
- **Memory errors**: Reduce batch size or enable tiling

### Noop Backend Issues

- **No issues expected**: This backend is designed for testing
- **Validation errors**: Check preprocessing/postprocessing configuration

## Best Practices

### Performance Optimization

1. **Use ONNX Runtime** for production deployments
2. **Enable session caching** (automatic in ONNX)
3. **Set correct layout hints** to avoid conversions
4. **Use appropriate tile sizes** for large images
5. **Enable warmup runs** for stable timing

### Memory Management

1. **Monitor memory usage** with debug logging
2. **Use tiling** for large images
3. **Dispose of unused models** in long-running processes
4. **Consider model quantization** for memory-constrained environments

### Error Handling

1. **Validate configurations** before running
2. **Test with noop backend** first
3. **Check model compatibility** with backend
4. **Monitor logs** for performance issues

## Future Backends

Planned backends for future releases:

- **TensorRT**: NVIDIA GPU acceleration
- **OpenVINO**: Intel optimization
- **CoreML**: Apple ecosystem
- **TFLite**: Mobile optimization
