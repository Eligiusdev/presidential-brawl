import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function SelectionRail({ label, children, resetKey, variant, grid = false }: {
  label: string;
  children: ReactNode;
  resetKey?: string;
  grid?: boolean;
  variant: 'fighters' | 'stages';
}) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    track.current?.scrollTo({ left: 0, top: 0 });
  }, [resetKey, grid]);

  const scroll = (direction: number) => {
    const rail = track.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  return <section className="selection-rail" aria-label={label}>
    <div className="selection-rail-header">
      <h3>{label}</h3>
      {!grid && <div className="selection-rail-arrows">
        <button type="button" onClick={() => scroll(-1)} aria-label={`Desplazar ${label} a la izquierda`}><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => scroll(1)} aria-label={`Desplazar ${label} a la derecha`}><ChevronRight size={18} /></button>
      </div>}
    </div>
    <div ref={track} className={`selection-rail-track selection-rail-${variant}${grid ? ' selection-rail-grid' : ''}`}>
      {children}
    </div>
  </section>;
}
