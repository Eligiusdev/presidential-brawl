type Sample = 'frame' | 'render' | 'simulation' | 'touch' | 'ack' | 'snapshot' | 'rollback' | 'network';
const enabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('perf') === '1';
export const performanceMetricsEnabled = enabled;
const samples = new Map<Sample, number[]>();

export function samplePerformance(kind: Sample, ms: number) {
  if (!enabled || !Number.isFinite(ms) || ms < 0) return;
  let values = samples.get(kind);
  if (!values) samples.set(kind, values = []);
  if (values.length >= 240) values.shift();
  values.push(ms);
}

export function clearPerformanceSamples() { samples.clear(); }

export function performanceSummary() {
  return Object.fromEntries([...samples].map(([kind, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (fraction: number) => Math.round(sorted[Math.ceil(sorted.length * fraction) - 1] * 10) / 10;
    return [kind, { p50: at(.5), p95: at(.95), n: sorted.length }];
  }));
}
