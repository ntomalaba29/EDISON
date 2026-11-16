export type CircuitState = 'closed' | 'open' | 'half_open';

export interface DependencyCircuitStatus {
  dependency: 'postgres_primary' | 'ffmpeg_worker' | 'cdn_manifest_origin';
  state: CircuitState;
  consecutiveFailures: number;
  lastError: string | null;
  lastTrippedAt: string | null;
  lastRecoveredAt: string | null;
  fallbackActive: string;
}

export interface ObservabilityMetricsSnapshot {
  generatedAt: string;
  uptimeSeconds: number;
  totalHttpRequests: number;
  totalHttp5xx: number;
  averageRequestLatencyMs: number;
  p95RequestLatencyMs: number;
  qrRedirectCount: number;
  qrRedirectP95Ms: number;
  circuits: DependencyCircuitStatus[];
  lkgConfigBackupActive: boolean;
}

export class ReliabilityMonitor {
  private readonly startedAt = Date.now();
  private totalHttpRequests = 0;
  private totalHttp5xx = 0;
  private readonly requestLatencies: number[] = [];
  private readonly qrLatencies: number[] = [];
  private readonly circuits: Record<
    DependencyCircuitStatus['dependency'],
    DependencyCircuitStatus
  > = {
    postgres_primary: {
      dependency: 'postgres_primary',
      state: 'closed',
      consecutiveFailures: 0,
      lastError: null,
      lastTrippedAt: null,
      lastRecoveredAt: null,
      fallbackActive: 'atomic_json_store_and_lkg_cache',
    },
    ffmpeg_worker: {
      dependency: 'ffmpeg_worker',
      state: 'closed',
      consecutiveFailures: 0,
      lastError: null,
      lastTrippedAt: null,
      lastRecoveredAt: null,
      fallbackActive: 'text_only_commercial_or_skip_break',
    },
    cdn_manifest_origin: {
      dependency: 'cdn_manifest_origin',
      state: 'closed',
      consecutiveFailures: 0,
      lastError: null,
      lastTrippedAt: null,
      lastRecoveredAt: null,
      fallbackActive: 'offline_intel_lkg_bundle',
    },
  };

  recordHttpRequest(statusCode: number, durationMs: number, isQrRedirect = false): void {
    this.totalHttpRequests += 1;
    if (statusCode >= 500) this.totalHttp5xx += 1;
    this.requestLatencies.push(durationMs);
    if (this.requestLatencies.length > 500) this.requestLatencies.shift();
    if (isQrRedirect) {
      this.qrLatencies.push(durationMs);
      if (this.qrLatencies.length > 500) this.qrLatencies.shift();
    }
  }

  recordDependencyFailure(
    dep: DependencyCircuitStatus['dependency'],
    errorMessage: string,
    threshold = 3
  ): DependencyCircuitStatus {
    const c = this.circuits[dep];
    c.consecutiveFailures += 1;
    c.lastError = errorMessage;
    if (c.consecutiveFailures >= threshold) {
      c.state = 'open';
      c.lastTrippedAt = new Date().toISOString();
    }
    return { ...c };
  }

  recordDependencySuccess(dep: DependencyCircuitStatus['dependency']): DependencyCircuitStatus {
    const c = this.circuits[dep];
    const wasOpen = c.state !== 'closed';
    c.state = 'closed';
    c.consecutiveFailures = 0;
    c.lastError = null;
    if (wasOpen) {
      c.lastRecoveredAt = new Date().toISOString();
    }
    return { ...c };
  }

  private percentile95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return Number(sorted[idx].toFixed(2));
  }

  getMetricsSnapshot(): ObservabilityMetricsSnapshot {
    const avg =
      this.requestLatencies.length === 0
        ? 0
        : Number(
            (
              this.requestLatencies.reduce((s, n) => s + n, 0) / this.requestLatencies.length
            ).toFixed(2)
          );
    return {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      totalHttpRequests: this.totalHttpRequests,
      totalHttp5xx: this.totalHttp5xx,
      averageRequestLatencyMs: avg,
      p95RequestLatencyMs: this.percentile95(this.requestLatencies),
      qrRedirectCount: this.qrLatencies.length,
      qrRedirectP95Ms: this.percentile95(this.qrLatencies),
      circuits: Object.values(this.circuits).map((c) => ({ ...c })),
      lkgConfigBackupActive: true,
    };
  }
}

export const reliabilityMonitor = new ReliabilityMonitor();
