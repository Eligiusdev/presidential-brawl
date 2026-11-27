type Sample = 'frame' | 'render' | 'simulation' | 'touch' | 'ack' | 'snapshot' | 'rollback' | 'network' | 'unpack' | 'bridge' | 'bridgeFallback' | 'pixiDraw' | 'pixiFrame';
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

type OnlineEvent = { kind: string; at: number; bytes?: number; duration?: number };
type FrameSpike = { ms: number; at: number; events: OnlineEvent[] };
const onlineEvents: OnlineEvent[] = [];
const spikes: FrameSpike[] = [];
const eventCounts = new Map<string, number>();
const traffic = new Map<string, { messages: number; bytes: number }>();
let onlineSince = 0;
let longTasks: PerformanceObserver | undefined;

export function startOnlinePerformance() {
  if (!enabled) return () => {};
  onlineEvents.length = spikes.length = 0;
  traffic.clear();
  eventCounts.clear();
  onlineSince = performance.now();
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    longTasks?.disconnect();
    longTasks = new PerformanceObserver(list => {
      for (const task of list.getEntries()) {
        const item = { kind: 'long task', at: task.startTime, duration: task.duration };
        markOnlinePerformance(item.kind, undefined, item.duration, item.at);
        // The browser can deliver the observer entry after the next paint.
        for (const spike of spikes) {
          if (item.at <= spike.at && item.at + task.duration >= spike.at - spike.ms) spike.events.push(item);
        }
      }
    });
    longTasks.observe({ type: 'longtask' });
  }
  return () => longTasks?.disconnect();
}

export function markOnlinePerformance(kind: string, bytes?: number, duration?: number, at = performance.now()) {
  if (!enabled) return;
  eventCounts.set(kind, (eventCounts.get(kind) ?? 0) + 1);
  if (bytes !== undefined) {
    const counter = traffic.get(kind) ?? { messages: 0, bytes: 0 };
    counter.messages++;
    counter.bytes += bytes;
    traffic.set(kind, counter);
  }
  if (onlineEvents.length >= 256) onlineEvents.shift();
  onlineEvents.push({ kind, at, bytes, duration });
}

export function recordOnlineFrame(now: number, previous: number) {
  if (!enabled || now - previous <= 33) return;
  if (spikes.length >= 24) spikes.shift();
  spikes.push({ ms: now - previous, at: now,
    events: onlineEvents.filter(event => event.at >= previous - 1 && event.at <= now) });
}

export function onlinePerformanceSummary() {
  const seconds = onlineSince ? (performance.now() - onlineSince) / 1000 : 0;
  return { seconds, traffic: Object.fromEntries(traffic), events: Object.fromEntries(eventCounts), spikes: [...spikes] };
}
