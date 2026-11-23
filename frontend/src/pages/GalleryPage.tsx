import { useMemo, useState } from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRESIDENTS_DATA } from '../data/presidents';
import { FighterPreview } from '../components/FighterPreview';
import { PortraitCanvas } from '../components/PortraitCanvas';
import { movesFor } from '../combat/roster.js';
import { ultimateText } from '../engine/presidentUltimates';
import { fighterArtPath } from '../engine/fighterSprites';
import { sound } from '../audio/soundEngine';

export function GalleryPage() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const p = PRESIDENTS_DATA[idx] ?? PRESIDENTS_DATA[0];
  const moves = useMemo(() => movesFor(p), [p]);
  const ultimate = useMemo(() => ultimateText(p), [p]);
  const artPath = fighterArtPath(p);

  return (
    <div className="apex-menu apex-selector absolute inset-0 z-20 flex flex-col p-3 sm:p-6 overflow-y-auto arcade-scroll">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#222d4a]">
        <div className="flex items-center gap-3">
          <button onClick={() => { sound.uiClick(); navigate('/'); }} className="flex h-10 items-center gap-1.5 rounded-lg border border-[#2a344d] bg-[#131929] px-3 text-xs font-semibold text-[#cbd5e1] hover:text-white whitespace-nowrap shrink-0">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-2xl">Visualizar personajes</h2>
        </div>
        <div className="text-xs text-[#94a3b8]">{idx + 1} / {PRESIDENTS_DATA.length}</div>
      </div>

      <div className="mx-auto my-4 grid w-full max-w-6xl flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-[#232c44] bg-[#101524] p-4 flex flex-col gap-3">
          <div className="rounded-lg border border-[#2a344d] bg-[#0d1322] overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {artPath ? <FighterPreview president={p} selected large /> : <PortraitCanvas president={p} className="h-full w-full" animate />}
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-white">{p.name}</h3>
            <p className="text-sm text-[#ffcc33]">{p.title}</p>
            <p className="text-xs text-[#94a3b8] mt-1">{p.role} · {p.era}</p>
          </div>
          <p className="text-sm text-[#cbd5e1] italic">“{p.taunt}”</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {([['Velocidad', p.stats.speed, 6.5], ['Peso', p.stats.weight, 1.6], ['Salto', p.stats.jumpForce, 14.5], ['Potencia', p.stats.power, 1.3]] as const).map(([name, val, max]) => (
              <div key={name} className="rounded border border-[#25304d] bg-[#11182c] p-2">
                <div className="flex justify-between text-[#94a3b8]"><span>{name}</span><span className="text-white">{val}</span></div>
                <div className="mt-1 h-1.5 rounded bg-[#1e293b]"><div className="h-full rounded bg-[#38bdf8]" style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-[#25304d] bg-[#11182c] p-3 text-xs space-y-1">
            <div className="font-bold text-[#ffcc33] flex items-center gap-1"><Crown size={14} /> {ultimate.name}</div>
            <p className="text-[#cbd5e1]">{ultimate.ultDesc}</p>
            {moves && <p className="text-[#94a3b8]"><span className="text-white">Especiales:</span> ↑ {moves.specialUp().name} · ↓ {moves.specialDown().name}</p>}
          </div>
        </section>

        <section className="rounded-xl border border-[#232c44] bg-[#101524] p-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {PRESIDENTS_DATA.map((d, i) => {
              const selected = i === idx;
              return (
                <button key={d.id} type="button" onClick={() => { sound.uiClick(); setIdx(i); }}
                  className={`rounded-lg border p-2 text-left transition-all ${selected ? 'border-[#ffcc33] bg-[#212026] shadow-[0_0_16px_rgba(255,204,51,0.24)]' : 'border-[#25304d] bg-[#11182c] hover:border-[#4b5f94]'}`}>
                  <div className="mb-1.5 overflow-hidden rounded border border-[#2a344d]">
                    <FighterPreview president={d} selected={selected} />
                  </div>
                  <div className="font-display text-[11px] font-bold text-white leading-tight truncate">{d.name}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
