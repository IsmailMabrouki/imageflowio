import { performance } from "perf_hooks";
import { pipeline } from "stream";
import { promisify } from "util";

export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupRuns: number;
  timeout: number;
  metrics: MetricType[];
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations/sec
  memoryUsage: MemoryUsage;
  cpuUsage: CPUUsage;
  errors: Error[];
  timestamp: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  peak: number;
}

export interface CPUUsage {
  user: number;
  system: number;
  total: number;
  cores: number;
}

export type MetricType = "memory" | "cpu" | "throughput" | "latency";

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  async runBenchmark(
    config: BenchmarkConfig,
    testFn: () => Promise<any>
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    const startCPU = this.getCPUUsage();

    // Warmup runs
    console.log(`Running ${config.warmupRuns} warmup runs...`);
    for (let i = 0; i < config.warmupRuns; i++) {
      try {
        await testFn();
      } catch (error) {
        console.warn(`Warmup run ${i + 1} failed:`, error);
      }
    }

    // Actual benchmark runs
    console.log(`Running ${config.iterations} benchmark iterations...`);
    const times: number[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const iterationStart = performance.now();
      try {
        await testFn();
        const iterationTime = performance.now() - iterationStart;
        times.push(iterationTime);
      } catch (error) {
        errors.push(error as Error);
        console.warn(`Iteration ${i + 1} failed:`, error);
      }
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const endCPU = this.getCPUUsage();

    // Calculate statistics
    const totalTime = endTime - startTime;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const minTime = times.length > 0 ? Math.min(...times) : 0;
    const maxTime = times.length > 0 ? Math.max(...times) : 0;
    const throughput = times.length > 0 ? (times.length / totalTime) * 1000 : 0;

    const result: BenchmarkResult = {
      name: config.name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        rss: endMemory.rss,
        peak: Math.max(endMemory.heapUsed, startMemory.heapUsed),
      },
      cpuUsage: {
        user: endCPU.user - startCPU.user,
        system: endCPU.system - startCPU.system,
        total: endCPU.total - startCPU.total,
        cores: endCPU.cores,
      },
      errors,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);
    return result;
  }

  private getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      peak: memUsage.heapUsed,
    };
  }

  private getCPUUsage(): CPUUsage {
    const cpuUsage = process.cpuUsage();
    return {
      user: cpuUsage.user,
      system: cpuUsage.system,
      total: cpuUsage.user + cpuUsage.system,
      cores: require("os").cpus().length,
    };
  }

  async generateReport(
    results: BenchmarkResult[],
    options: {
      format: "json" | "html" | "csv";
      outputPath?: string;
    }
  ): Promise<string> {
    const report = {
      benchmark: {
        name: "ImageFlowIO Performance Benchmark",
        timestamp: new Date().toISOString(),
        environment: this.getEnvironmentInfo(),
        results,
      },
    };

    if (options.format === "json") {
      const jsonReport = JSON.stringify(report, null, 2);
      if (options.outputPath) {
        const fs = require("fs").promises;
        await fs.writeFile(options.outputPath, jsonReport);
      }
      return jsonReport;
    }

    if (options.format === "html") {
      return this.generateHTMLReport(report);
    }

    if (options.format === "csv") {
      return this.generateCSVReport(results);
    }

    throw new Error(`Unsupported format: ${options.format}`);
  }

  private getEnvironmentInfo() {
    const os = require("os");
    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpuCores: os.cpus().length,
      memoryGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      uptime: process.uptime(),
    };
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>ImageFlowIO Benchmark Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .results { margin: 20px 0; }
        .result { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .metric { display: inline-block; margin: 5px 10px; }
        .chart { width: 100%; max-width: 800px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ImageFlowIO Performance Benchmark Report</h1>
        <p><strong>Generated:</strong> ${report.benchmark.timestamp}</p>
        <p><strong>Environment:</strong> ${
          report.benchmark.environment.nodeVersion
        } on ${report.benchmark.environment.platform}</p>
    </div>

    <div class="results">
        <h2>Benchmark Results</h2>
        ${report.benchmark.results
          .map(
            (result: any) => `
            <div class="result">
                <h3>${result.name}</h3>
                <div class="metric"><strong>Throughput:</strong> ${result.throughput.toFixed(
                  2
                )} ops/sec</div>
                <div class="metric"><strong>Average Time:</strong> ${result.averageTime.toFixed(
                  2
                )} ms</div>
                <div class="metric"><strong>Memory Peak:</strong> ${(
                  result.memoryUsage.peak /
                  1024 /
                  1024
                ).toFixed(2)} MB</div>
                <div class="metric"><strong>Errors:</strong> ${
                  result.errors.length
                }</div>
            </div>
        `
          )
          .join("")}
    </div>

    <div class="chart">
        <canvas id="throughputChart"></canvas>
    </div>

    <script>
        const ctx = document.getElementById('throughputChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(
                  report.benchmark.results.map((r: any) => r.name)
                )},
                datasets: [{
                    label: 'Throughput (ops/sec)',
                    data: ${JSON.stringify(
                      report.benchmark.results.map((r: any) => r.throughput)
                    )},
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  private generateCSVReport(results: BenchmarkResult[]): string {
    const headers = [
      "Name",
      "Iterations",
      "Total Time (ms)",
      "Average Time (ms)",
      "Throughput (ops/sec)",
      "Memory Peak (MB)",
      "Errors",
    ];
    const rows = results.map((result) => [
      result.name,
      result.iterations,
      result.totalTime.toFixed(2),
      result.averageTime.toFixed(2),
      result.throughput.toFixed(2),
      (result.memoryUsage.peak / 1024 / 1024).toFixed(2),
      result.errors.length,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  clearResults(): void {
    this.results = [];
  }
}
