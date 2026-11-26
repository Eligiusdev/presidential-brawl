import { UltimateMeter } from './UltimateMeter';
import { FighterName } from './FighterName';
import { Landmark, Radio } from 'lucide-react';
import { PRESIDENTS_DATA } from '../data/presidents';
import { STAGES_DATA } from '../data/stages';
import type { MatchSnapshot, RoomState } from '../network/matchState';
import { fighterArtPath, fighterAsset } from '../engine/fighterSprites';
import { PortraitCanvas } from './PortraitCanvas';

const pctColor = (pct: number) => (pct >= 140 ? '#ff4d5e' : pct >= 90 ? '#ff8a1e' : '#ffd23f');

/** HUD del combate online con el mismo aspecto que el HUD local (match-hud). */
export function OnlineMatchHUD({ snap, room, localSlot, crtClass }: {
  snap: MatchSnapshot | null; room: RoomState; localSlot: number; crtClass?: string;
}) {
  const players = snap?.players ?? [];
  const w = (snap as any)?.world ?? {};
  const stage = STAGES_DATA[snap?.stage ?? 0] ?? STAGES_DATA[0];
  const tick = snap?.tick ?? 0;
  const time = Math.floor(tick / 60);
  const hazardName = stage.hazardName ?? '';
  const warning = w.hzPhase === 1 ? `⚠ ${hazardName || 'PELIGRO'}` : null;
  const active = w.hzPhase === 2 ? (stage.hazardMsg || hazardName || 'PELIGRO ACTIVO') : null;
  const ping = room.players[localSlot]?.ping ?? 0;
  const maxStocks = Math.max(1, Math.min(5, room.stocks ?? 3));
  const leftSlots = room.players.map((p, i) => (p ? -1 : i)).filter(i => i >= 0);

  return <div className={`match-hud pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 ${crtClass ?? ''}`}>
    <div className="match-toolbar flex items-start justify-between gap-2 sm:gap-3">
      <div className="relative flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-[#2c3959] bg-[#0c1224]/88 px-3 py-1.5 text-xs font-semibold text-[#e2e8f0] shadow-[0_4px_14px_rgba(8,12,26,0.5)]">
          <span className="font-mono-num text-[#ffcc33]">
            {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
          </span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span className="whitespace-nowrap text-[#9ecbff]">ONLINE</span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span className="hidden sm:inline text-[#7dd3fc] truncate max-w-[180px]">{stage.name}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2c3959] bg-[#0c1224]/88 px-2.5 py-1.5 text-[11px] font-semibold text-[#94a3b8]">
          <Landmark className="h-3.5 w-3.5 text-[#ffcc33]" />
          <span className="hidden md:inline">{stage.country}</span>
          <span className="font-mono-num">{stage.id}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-1">
        {leftSlots.length > 0 && (
          <div className="rounded-md border border-[#f59e0b]/70 bg-[#0b0f1b]/92 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-[#fcd34d]">
            {leftSlots.map(i => `J${i + 1}`).join(', ')} ha{leftSlots.length > 1 ? 'n' : ''} salido · terminando partida
          </div>
        )}
        {warning && (
          <div className="rounded-md border border-[#ef4444] bg-[#7f1d1d]/95 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
            {warning}
          </div>
        )}
        {!warning && active && (
          <div className="rounded-md border border-[#f59e0b]/70 bg-[#0b0f1b]/90 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-[#fcd34d] sm:text-sm">
            {active}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-lg border border-[#2c3959] bg-[#0c1224]/88 px-2.5 py-1.5 text-[11px] font-semibold text-[#7dd3fc]">
          <Radio className="h-3.5 w-3.5" />
          <span className="font-mono-num">{ping} ms</span>
        </div>
      </div>
    </div>

    <div className="match-fighter-cards flex items-end justify-between gap-3">
      {players.map(p => {
        const pres = PRESIDENTS_DATA.find(d => d.id === p.fighterId) ?? PRESIDENTS_DATA[0];
        const art = fighterArtPath(pres);
        const pct = Math.floor(p.damage);
        const stocks = p.stocks ?? 0;
        const ultReady = p.ultCharge >= 100;
        const hit = (p.hitFlash ?? 0) > 0;
        const isYou = p.slot === localSlot;
        const accent = room.players[p.slot]?.color ?? pres.palette.accent.base;
        const weapon = p.wk || '';
        return (
          <div key={p.slot}
            className={`match-fighter-card relative flex w-[150px] flex-col gap-1.5 overflow-hidden rounded-xl border p-2 transition-transform duration-100 sm:w-[214px] sm:p-2.5 ${hit ? 'scale-[1.02]' : ''} ${art ? 'has-art' : ''}`}
            style={{
              ['--pc' as any]: accent,
              borderColor: hit ? '#ff5c6c' : ultReady ? '#ffcc33' : `${accent}bb`,
              boxShadow: hit ? '0 0 22px rgba(255,77,94,.55)' : ultReady ? '0 0 18px rgba(255,204,51,.32)' : '0 8px 22px rgba(6,10,22,.7)',
              background: art
                ? `linear-gradient(135deg, rgba(8,14,26,.95) 0%, rgba(10,18,34,.84) 42%, rgba(10,18,34,.48) 100%), right center/cover no-repeat url("${fighterAsset(art, 'selection.webp')}")`
                : 'linear-gradient(180deg,#10192c,#0b1222)',
            }}>
            <div className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r" style={{ background: accent }} />
            <div className="relative z-[1] flex items-start justify-between gap-2 pl-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="shrink-0 overflow-hidden rounded-lg border bg-[#0d1628]/90"
                  style={{ borderColor: ultReady ? '#ffcc33' : `${accent}88` }}>
                  <PortraitCanvas president={pres} className="match-portrait h-10 w-10 sm:h-12 sm:w-12" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-display text-[10px] font-extrabold uppercase tracking-[.14em]">
                    <span style={{ color: accent }}>J{p.slot + 1}{isYou ? ' · TÚ' : ''}</span>
                  </div>
                  <div className="truncate font-display text-xs font-bold leading-tight text-white sm:text-sm"><FighterName fighter={pres} /></div>
                  <div className="match-stocks mt-1 flex items-center gap-1">
                    {Array.from({ length: maxStocks }).map((_, i) => (
                      <span key={i} className="h-2.5 w-2.5 rotate-45 rounded-[2px] border border-[#0b1222]"
                        style={{ backgroundColor: i < stocks ? accent : '#1a2740' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="match-damage font-mono-num text-2xl font-black leading-none sm:text-4xl" style={{ color: pctColor(pct) }}>
                  {pct}<span className="ml-0.5 text-[0.45em] font-extrabold text-[#cbd5e1]/80 align-top">%</span>
                </div>
              </div>
            </div>
            {(p.stun > 0 || p.floating || weapon || p.combo >= 2) && (
              <div className="match-fighter-badges relative z-[1] flex flex-wrap items-center gap-1.5 pl-1.5 text-[10px] font-semibold">
                {p.stun > 0 && <span className="rounded border border-[#ff5c6c]/70 bg-[#4c1220]/90 px-1.5 py-0.5 text-[#fecaca]">STUN</span>}
                {p.floating && p.stun <= 0 && <span className="rounded border border-[#34d399]/65 bg-[#083d33]/85 px-1.5 py-0.5 text-[#a7f3d0]">LEVITANDO</span>}
                {p.combo >= 2 && <span className="rounded border border-[#fb923c]/70 bg-[#2c170b]/90 px-1.5 py-0.5 text-[#ffd23f]">{p.combo} HITS</span>}
                {weapon && <span className="font-mono-num text-[#ffd23f]">{weapon === 'mg' ? 'METRALLETA' : weapon === 'rocket' ? 'COHETE' : 'MALETÍN'}</span>}
              </div>
            )}
            <UltimateMeter charge={p.ultCharge} fighter={pres.name} accent={accent} />
          </div>
        );
      })}
    </div>
  </div>;
}
