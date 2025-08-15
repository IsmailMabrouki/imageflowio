# Error Handling Examples

This guide demonstrates common ImageFlowIO errors and how to resolve them.

## Common Error Scenarios

### 1. Configuration Validation Errors

**Error**: Invalid JSON schema

```bash
$ imageflowio --config invalid-config.json
Error: Config validation failed
/input/source: should be string (missing)
```

**Solution**: Fix the configuration

```json
{
  "$schema": "../config.schema.json",
  "model": { "name": "test", "path": "./model.onnx" },
  "input": {
    "type": "image",
    "source": "./images/sample.png" // Add missing source
  }
}
```

**Error**: Missing required fields

```bash
$ imageflowio --config missing-fields.json
Error: Config validation failed
/model: should have required property 'path'
```

**Solution**: Add required model path

```json
{
  "model": {
    "name": "test",
    "path": "./assets/models/model.onnx" // Add missing path
  }
}
```

### 2. Backend Loading Errors

**Error**: ONNX Runtime not installed

```bash
$ imageflowio --config config.json --backend onnx
Error: Failed to load onnxruntime-node. Install 'onnxruntime-node' to use the ONNX backend.
```

**Solution**: Install the required dependency

```bash
npm install onnxruntime-node
```

**Error**: TensorFlow.js not installed

```bash
$ imageflowio --config config.json --backend tfjs
Error: Failed to load TensorFlow.js backend. Install '@tensorflow/tfjs-node' (preferred) or '@tensorflow/tfjs'.
```

**Solution**: Install TensorFlow.js

```bash
npm install @tensorflow/tfjs-node
# or
npm install @tensorflow/tfjs
```

### 3. Input File Errors

**Error**: Input file not found

```bash
$ imageflowio --config config.json --input ./nonexistent.png
Error: Input file not found: ./nonexistent.png
```

**Solution**: Check file path and ensure file exists

```bash
# Verify file exists
ls -la ./images/sample.png

# Use correct path
imageflowio --config config.json --input ./images/sample.png
```

**Error**: Unsupported image format

```bash
$ imageflowio --config config.json --input ./document.pdf
Error: Unsupported input format: pdf
```

**Solution**: Use supported image formats (PNG, JPG, JPEG, WebP, TIFF)

```bash
# Convert to supported format
convert document.pdf document.png
imageflowio --config config.json --input ./document.png
```

### 4. Model Loading Errors

**Error**: Model file not found

```bash
$ imageflowio --config config.json
Error: Model file not found: ./assets/models/model.onnx
```

**Solution**: Ensure model file exists and path is correct

```bash
# Check if model exists
ls -la ./assets/models/

# Update config with correct path
{
  "model": {
    "name": "test",
    "path": "./correct/path/to/model.onnx"
  }
}
```

**Error**: Invalid model format

```bash
$ imageflowio --config config.json
Error: Invalid model format or corrupted file
```

**Solution**: Verify model file integrity and format

```bash
# Check file size and format
file ./assets/models/model.onnx

# Re-download or re-export model if corrupted
```

### 5. Output Directory Errors

**Error**: Output directory not writable

```bash
$ imageflowio --config config.json --output /root/protected/
Error: Cannot write to output directory: /root/protected/
```

**Solution**: Use writable directory or fix permissions

```bash
# Use writable directory
imageflowio --config config.json --output ./outputs/

# Or fix permissions (if you have access)
chmod 755 /root/protected/
```

### 6. Memory and Performance Errors

**Error**: Out of memory during processing

```bash
$ imageflowio --config config.json --input large-image.tiff
Error: JavaScript heap out of memory
```

**Solution**: Enable tiling for large images

```json
{
  "inference": {
    "tiling": {
      "apply": true,
      "tileSize": [256, 256],
      "overlap": 32
    }
  }
}
```

**Error**: Slow performance

```bash
# Processing takes too long
```

**Solution**: Optimize configuration

```json
{
  "execution": {
    "threads": { "apply": true, "count": "auto" },
    "useCaching": "memory",
    "warmupRuns": 2
  }
}
```

## Debugging Techniques

### 1. Enable Verbose Logging

```bash
# Enable debug logging
imageflowio --config config.json --log-level debug --log-file debug.log

# Check logs for detailed information
cat debug.log
```

### 2. Validate Configuration Only

```bash
# Validate without running
imageflowio --config config.json --validate-only

# Get JSON error format
imageflowio --config config.json --validate-only --errors json
```

### 3. Use Noop Backend for Testing

```bash
# Test preprocessing/postprocessing without model
imageflowio --config config.json --backend noop
```

### 4. Check File Permissions

```bash
# Verify input file is readable
ls -la ./images/sample.png

# Verify output directory is writable
ls -la ./outputs/
```

## Error Prevention Tips

### 1. Use JSON Schema Validation

Add schema reference to your config:

```json
{
  "$schema": "https://raw.githubusercontent.com/IsmailMabrouki/imageflowio/main/config.schema.json",
  "model": { "name": "test", "path": "./model.onnx" }
}
```

### 2. Test with Small Images First

```bash
# Test with small image before processing large dataset
imageflowio --config config.json --input small-test.png
```

### 3. Use Environment Variables for Paths

```bash
# Set model path via environment
export IMAGEFLOWIO_MODEL_PATH="./assets/models/model.onnx"
imageflowio --config config.json
```

### 4. Enable Caching for Repeated Runs

```json
{
  "execution": {
    "useCaching": "disk",
    "cacheDir": ".imageflowio-cache"
  }
}
```

## Getting Help

### 1. Check Logs

```bash
# Enable comprehensive logging
imageflowio --config config.json --log-level debug --log-file full.log

# Review logs for errors
grep -i error full.log
```

### 2. Use CLI Help

```bash
# Get help on all options
imageflowio --help

# Validate config with detailed errors
imageflowio --config config.json --validate-only --errors json
```

### 3. Common Debugging Commands

```bash
# Check if dependencies are installed
npm list onnxruntime-node
npm list @tensorflow/tfjs-node

# Verify file paths
find . -name "*.onnx" -o -name "*.json"

# Test with minimal config
echo '{"model":{"name":"test","path":"./model.onnx"},"input":{"type":"image","source":"./test.png"}}' > minimal.json
imageflowio --config minimal.json --backend noop
```
