# Caching Guide

ImageFlowIO provides multiple caching mechanisms to optimize performance for repeated operations. This guide explains how to use caching effectively.

## Caching Overview

ImageFlowIO supports three types of caching:

| Cache Type        | Location    | Performance | Persistence      | Use Case               |
| ----------------- | ----------- | ----------- | ---------------- | ---------------------- |
| **Memory Cache**  | RAM         | Fastest     | Process lifetime | Repeated processing    |
| **Disk Cache**    | File system | Medium      | Across restarts  | Long-running processes |
| **Session Cache** | RAM         | Fast        | Process lifetime | Model sessions (ONNX)  |

## Preprocessing Caching

### Memory Caching

Memory caching stores preprocessed images in RAM for the fastest possible access.

#### Configuration

```json
{
  "execution": {
    "useCaching": "memory"
  }
}
```

#### CLI Usage

```bash
imageflowio --config config.json --cache memory
```

#### Performance Characteristics

- **Speed**: Fastest (RAM access)
- **Memory Usage**: High (stores full images in memory)
- **Persistence**: Lost on process restart
- **Best For**: Repeated processing of same images

### Disk Caching

Disk caching stores preprocessed images to the file system for persistence across process restarts.

#### Configuration

```json
{
  "execution": {
    "useCaching": "disk",
    "cacheDir": "./my-cache"
  }
}
```

#### CLI Usage

```bash
imageflowio --config config.json --cache disk --cache-dir ./my-cache
```

#### Performance Characteristics

- **Speed**: Medium (disk I/O)
- **Disk Usage**: High (stores binary files)
- **Persistence**: Survives process restarts
- **Best For**: Long-running processes, shared cache

### Cache Key Generation

The cache key is automatically generated based on:

- Input file path
- Input file modification time
- Preprocessing configuration (JSON stringified)

This ensures cache invalidation when:

- Input file changes
- Preprocessing settings change
- Different input files are used

### Cache Storage Format

#### Memory Cache

- **Storage**: JavaScript Map in memory
- **Key**: Cache key string
- **Value**: Raw image buffer + metadata

#### Disk Cache

- **Directory Structure**:
  ```
  cache-dir/
  ├── <base64-key>.json    # Metadata (width, height, channels)
  └── <base64-key>.bin     # Raw image data
  ```
- **Key Encoding**: Base64URL encoding of cache key
- **Metadata**: JSON file with image dimensions
- **Data**: Raw binary file with image pixels

## Session Caching (ONNX Backend)

The ONNX backend automatically caches model sessions for optimal performance.

### Automatic Session Caching

- **Storage**: In-memory Map
- **Key**: Model file path
- **Value**: ONNX InferenceSession
- **Lifetime**: Process lifetime

### Benefits

- Avoids repeated model loading
- Faster subsequent inferences
- Automatic cleanup on process exit

## Performance Optimization

### When to Use Caching

#### Use Memory Caching When:

- ✅ Processing same images repeatedly
- ✅ High-performance requirements
- ✅ Sufficient RAM available
- ✅ Single process execution

#### Use Disk Caching When:

- ✅ Long-running processes
- ✅ Multiple process restarts
- ✅ Shared cache across runs
- ✅ Sufficient disk space available

#### Avoid Caching When:

- ❌ Processing unique images only
- ❌ Memory/disk constraints
- ❌ Single-pass processing
- ❌ Testing/debugging

### Performance Benchmarks

_Note: Actual performance depends on image size, preprocessing complexity, and hardware._

| Scenario        | No Cache | Memory Cache | Disk Cache |
| --------------- | -------- | ------------ | ---------- |
| First run       | 100%     | 100%         | 100%       |
| Repeated run    | 100%     | 20-30%       | 40-60%     |
| Process restart | 100%     | 100%         | 40-60%     |

### Memory Usage Estimation

#### Memory Cache

```
Memory Usage = Number of cached images × Average image size
```

#### Disk Cache

```
Disk Usage = Number of cached images × (Image size + Metadata overhead)
```

## Cache Management

### Manual Cache Cleanup

#### Memory Cache

- Automatically cleared on process exit
- No manual cleanup needed

#### Disk Cache

```bash
# Remove entire cache directory
rm -rf .imageflowio-cache

# Remove specific cache files
rm .imageflowio-cache/*.json
rm .imageflowio-cache/*.bin
```

### Cache Monitoring

#### Enable Debug Logging

```json
{
  "logging": {
    "level": "debug"
  }
}
```

#### Cache Hit/Miss Logs

- `cache/memory hit` - Memory cache hit
- `cache/disk hit` - Disk cache hit
- `cache/disk write` - Disk cache write

### Cache Invalidation

Cache is automatically invalidated when:

- Input file modification time changes
- Preprocessing configuration changes
- Different input file is used

## Best Practices

### Performance Optimization

1. **Use memory cache** for repeated processing
2. **Use disk cache** for long-running processes
3. **Monitor cache hit rates** with debug logging
4. **Clean up disk cache** periodically
5. **Size cache appropriately** for your use case

### Memory Management

1. **Monitor memory usage** with large caches
2. **Limit cache size** for memory-constrained environments
3. **Use disk cache** for large datasets
4. **Restart processes** to clear memory cache when needed

### Disk Management

1. **Monitor disk usage** for disk caches
2. **Use dedicated cache directories** for organization
3. **Implement cache cleanup** strategies
4. **Consider cache location** (SSD vs HDD)

## Troubleshooting

### Common Issues

#### High Memory Usage

- **Problem**: Memory cache consuming too much RAM
- **Solution**: Switch to disk cache or reduce cache size

#### Slow Performance

- **Problem**: Disk cache on slow storage
- **Solution**: Use SSD storage or memory cache

#### Cache Not Working

- **Problem**: No cache hits despite repeated runs
- **Solution**: Check cache configuration and debug logs

#### Disk Space Issues

- **Problem**: Disk cache consuming too much space
- **Solution**: Implement cache cleanup or use memory cache

### Debug Commands

```bash
# Check cache directory size
du -sh .imageflowio-cache

# List cache files
ls -la .imageflowio-cache/

# Monitor cache hits
imageflowio --config config.json --log-level debug

# Clear cache
rm -rf .imageflowio-cache
```

## Advanced Configuration

### Custom Cache Directory

```json
{
  "execution": {
    "useCaching": "disk",
    "cacheDir": "/path/to/custom/cache"
  }
}
```

### Environment Variables

```bash
# Set cache directory via environment
export IMAGEFLOWIO_CACHE_DIR="/path/to/cache"
imageflowio --config config.json
```

### Cache with Tiling

```json
{
  "inference": {
    "tiling": {
      "apply": true,
      "tileSize": [256, 256]
    }
  },
  "execution": {
    "useCaching": "memory"
  }
}
```

## Future Enhancements

Planned caching improvements:

- **LRU Cache**: Automatic cache size management
- **Compression**: Reduce disk cache size
- **Distributed Cache**: Shared cache across processes
- **Cache Statistics**: Detailed performance metrics
- **Smart Invalidation**: More granular cache invalidation
