export function UltimateMeter({ charge, accent, fighter }: { charge: number; accent: string; fighter: string }) {
  const value = Math.max(0, Math.min(100, Math.floor(charge)));
  const ready = value === 100;
  return (
    <div className="match-ultimate" data-ready={ready}>
      <div className="match-ultimate-track" role="meter" aria-label={`Energía de la definitiva de ${fighter}`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="match-ultimate-fill" style={{ width: `${value}%`, backgroundColor: ready ? '#ffcc33' : accent }} />
      </div>
      <span className="match-ultimate-label">{ready ? 'ULT LISTA' : `ULT ${value}%`}</span>
    </div>
  );
}
