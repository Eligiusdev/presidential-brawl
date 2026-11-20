import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function SelectionRail({ label, children, resetKey, variant }: {
  label: string;
  children: ReactNode;
  resetKey?: string;
  variant: 'fighters' | 'stages';
}) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (track.current) track.current.scrollLeft = 0;
  }, [resetKey]);

  const scroll = (direction: number) => {
    const rail = track.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  return <section className="selection-rail" aria-label={label}>
    <div className="selection-rail-header">
      <h3>{label}</h3>
      <div className="selection-rail-arrows">
        <button type="button" onClick={() => scroll(-1)} aria-label={`Desplazar ${label} a la izquierda`}><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => scroll(1)} aria-label={`Desplazar ${label} a la derecha`}><ChevronRight size={18} /></button>
      </div>
    </div>
    <div ref={track} className={`selection-rail-track selection-rail-${variant}`}>
      {children}
    </div>
  </section>;
}
