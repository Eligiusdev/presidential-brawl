import { Crown, Skull, Swords, Trophy } from 'lucide-react';
import type { CampaignState, PresidentData } from '../types/game';
import { PortraitCanvas } from './PortraitCanvas';

interface Props {
  campaign: CampaignState;
  roster: PresidentData[];
  /** 'active' = about to fight round, 'lost' = lost at round, 'won' = completed */
  state: 'active' | 'lost' | 'won';
}

export function CampaignBracket({ campaign, roster, state }: Props) {
  const hero = roster[campaign.hero] || roster[0];
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="overflow-hidden rounded-lg border-2 border-[#ffcc33] w-12 h-12 shrink-0">
          <PortraitCanvas president={hero} className="h-full w-full" />
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-bold">Tu campaña</div>
          <div className="font-display text-sm font-bold text-white">{hero.name}</div>
        </div>
        <div className="ml-auto text-right font-mono-num text-xs text-[#94a3b8]">
          <div>Puntos: <span className="text-[#ffcc33] font-bold">{campaign.score}</span></div>
          <div>Continues: {campaign.continues}</div>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {campaign.ladder.map((idx, round) => {
          const fighter = roster[idx] || roster[0];
          const isCurrent = round === campaign.round;
          const isDone = round < campaign.round || (state === 'won' && round <= campaign.round);
          const isLost = isCurrent && state === 'lost';
          const isActive = isCurrent && state === 'active';
          const isFuture = round > campaign.round;
          return (
            <div key={`${fighter.id}-${round}`} className={`relative rounded-lg border p-2 text-center transition-all ${
              isDone ? 'border-[#22c55e]/50 bg-[#0f1f16]' :
              isLost ? 'border-[#ef4444]/60 bg-[#1f1010]' :
              isActive ? 'border-[#ffcc33] bg-[#212942] shadow-[0_0_18px_rgba(255,204,51,0.18)]' :
              'border-[#252f47] bg-[#111827] opacity-70'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                {isDone ? <Trophy className="h-3 w-3 text-[#22c55e]" /> : isLost ? <Skull className="h-3 w-3 text-[#ef4444]" /> : isActive ? <Swords className="h-3 w-3 text-[#ffcc33]" /> : <span className="text-[#64748b]">•</span>}
                <span className={isDone ? 'text-[#22c55e]' : isLost ? 'text-[#ef4444]' : isActive ? 'text-[#ffcc33]' : 'text-[#64748b]'}>
                  Ronda {round + 1}{round === 6 ? ' · Final' : ''}
                </span>
              </div>
              <div className={`mx-auto mb-1.5 overflow-hidden rounded-md border w-12 h-12 ${isDone ? 'border-[#22c55e]/40' : isLost ? 'border-[#ef4444]/40' : isActive ? 'border-[#ffcc33]' : 'border-[#334155]'}`}>
                <PortraitCanvas president={fighter} className={`h-full w-full ${isFuture ? 'grayscale' : ''}`} />
              </div>
              <div className={`text-[11px] font-bold leading-tight truncate ${isFuture ? 'text-[#94a3b8]' : 'text-white'}`}>{fighter.name}</div>
              <div className={`text-[10px] mt-0.5 ${isDone ? 'text-[#22c55e]' : isLost ? 'text-[#ef4444]' : isActive ? 'text-[#ffcc33]' : 'text-[#64748b]'}`}>
                {isDone ? 'Victoria' : isLost ? 'Derrota' : isActive ? 'Próximo rival' : 'Pendiente'}
                {round === 6 && !isDone && !isLost ? ' 👑' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
