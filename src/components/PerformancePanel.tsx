import { useEffect, useState } from 'react';
import { clearPerformanceSamples, performanceSummary } from '../engine/performanceMetrics';

const labels = {
  frame: 'Intervalo entre cuadros', render: 'CPU de render', simulation: 'CPU de simulación',
  touch: 'Toque a cuadro procesado', ack: 'Toque a confirmación del servidor', snapshot: 'Intervalo de snapshots',
} as const;

export function PerformancePanel() {
  const [summary, setSummary] = useState(performanceSummary);
  useEffect(() => {
    const timer = window.setInterval(() => setSummary(performanceSummary()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <aside className="performance-panel" aria-label="Diagnóstico de rendimiento">
    <strong>Rendimiento · p50 / p95 (ms)</strong>
    {Object.entries(summary).map(([key, s]) => <div key={key}>
      {labels[key as keyof typeof labels]}: {s.p50} / {s.p95} ({s.n})
    </div>)}
    <button type="button" onClick={() => { clearPerformanceSamples(); setSummary({}); }}>Reiniciar medición</button>
  </aside>;
}
