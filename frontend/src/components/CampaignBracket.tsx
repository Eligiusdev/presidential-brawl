import { Crown, Skull, Swords, Trophy } from 'lucide-react';
import type { CampaignState, PresidentData } from '../types/game';
import { PortraitCanvas } from './PortraitCanvas';

interface Props {
  campaign: CampaignState;
  roster: PresidentData[];
  state: 'active' | 'lost' | 'won';
}

export function CampaignBracket({ campaign, roster, state }: Props) {
  const hero = roster[campaign.hero] || roster[0];
  const rounds = campaign.ladder.map((idx, round) => {
    const fighter = roster[idx] || roster[0];
    const isCurrent = round === campaign.round;
    const isDone = round < campaign.round || (state === 'won' && round <= campaign.round);
    const isLost = isCurrent && state === 'lost';
    const isActive = isCurrent && state === 'active';
    return { fighter, round, isCurrent, isDone, isLost, isActive, isFuture: !isDone && !isLost && !isActive };
  });

  return (
    <div className="w-full mx-auto">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="overflow-hidden rounded-lg border-2 border-[#ffcc33] w-10 h-10 shrink-0"><PortraitCanvas president={hero} className="h-full w-full" /></div>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-bold">Tu campaña</div>
          <div className="font-display text-sm font-bold text-white">{hero.name}</div>
        </div>
        <div className="ml-auto font-mono-num text-xs text-[#94a3b8]">Puntos: <span className="text-[#ffcc33] font-bold">{campaign.score}</span></div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch min-w-max gap-0 px-2">
          {/* Hero start node */}
          <div className="flex flex-col items-center justify-center shrink-0 w-[92px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffcc33] mb-1">Tú</div>
            <div className="w-11 h-11 rounded-md border-2 border-[#ffcc33] overflow-hidden bg-[#1a1f2e]">
              <PortraitCanvas president={hero} className="h-full w-full" />
            </div>
            <div className="text-[10px] font-bold text-white mt-1 truncate w-full text-center">{hero.name}</div>
          </div>

          {rounds.map((r, i) => {
            const color = r.isDone ? '#22c55e' : r.isLost ? '#ef4444' : r.isActive ? '#ffcc33' : '#475569';
            const bg = r.isDone ? '#0f1f16' : r.isLost ? '#1f1010' : r.isActive ? '#212942' : '#111827';
            const border = r.isDone ? '#22c55e66' : r.isLost ? '#ef444466' : r.isActive ? '#ffcc33' : '#334155';
            return (
              <div key={`${r.fighter.id}-${r.round}`} className="flex items-stretch shrink-0">
                {/* connector */}
                <div className="flex items-center w-8 shrink-0">
                  <div className="h-[3px] w-full rounded-full" style={{ background: r.isDone || r.isActive || r.isLost ? color : '#334155', opacity: r.isFuture ? 0.4 : 1 }} />
                </div>
                {/* node */}
                <div className="flex flex-col items-center justify-start w-[96px] rounded-lg border p-1.5" style={{ borderColor: border, background: bg, opacity: r.isFuture ? 0.65 : 1, boxShadow: r.isActive ? '0 0 16px rgba(255,204,51,0.18)' : 'none' }}>
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color }}>
                    {r.isDone ? <Trophy className="h-3 w-3" /> : r.isLost ? <Skull className="h-3 w-3" /> : r.isActive ? <Swords className="h-3 w-3" /> : <span>•</span>}
                    R{r.round + 1}
                  </div>
                  <div className="w-11 h-11 rounded-md border overflow-hidden bg-[#0d1322]" style={{ borderColor: border }}>
                    <PortraitCanvas president={r.fighter} className={`h-full w-full ${r.isFuture ? 'grayscale' : ''}`} />
                  </div>
                  <div className={`text-[10px] font-bold mt-1 truncate w-full text-center ${r.isFuture ? 'text-[#94a3b8]' : 'text-white'}`}>{r.fighter.name}</div>
                  <div className="text-[9px] mt-0.5" style={{ color }}>
                    {r.isDone ? 'Victoria' : r.isLost ? 'Derrota' : r.isActive ? 'Ahora' : 'Pendiente'}
                  </div>
                  {r.round === 6 && <div className="text-[9px] text-[#ffcc33] flex items-center gap-0.5 mt-0.5"><Crown className="h-2.5 w-2.5" />Final</div>}
                </div>
              </div>
            );
          })}

          {/* Champion end node */}
          <div className="flex items-stretch shrink-0">
            <div className="flex items-center w-8 shrink-0">
              <div className="h-[3px] w-full rounded-full" style={{ background: state === 'won' ? '#22c55e' : '#334155', opacity: state === 'won' ? 1 : 0.4 }} />
            </div>
            <div className="flex flex-col items-center justify-center w-[92px] rounded-lg border p-1.5" style={{ borderColor: state === 'won' ? '#ffcc33' : '#334155', background: state === 'won' ? '#212942' : '#111827', opacity: state === 'won' ? 1 : 0.6 }}>
              <Crown className={`h-6 w-6 mb-1 ${state === 'won' ? 'text-[#ffcc33]' : 'text-[#64748b]'}`} />
              <div className={`text-[10px] font-bold uppercase ${state === 'won' ? 'text-[#ffcc33]' : 'text-[#64748b]'}`}>Campeón</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
