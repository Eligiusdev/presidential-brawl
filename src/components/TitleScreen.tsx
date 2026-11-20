import { useEffect, type CSSProperties } from 'react';
import { Crown, Crosshair, Film, Play, Settings, Swords, UserPlus } from 'lucide-react';
import { stageArtUrl } from '../engine/stageAtmosphere';
import { sound } from '../audio/soundEngine';

interface TitleScreenProps {
  hasReplay: boolean;
  onQuickSelect: () => void;
  onStartCampaign: () => void;
  onStartTraining: () => void;
  onWatchLastReplay: () => void;
  onOpenCustomizer: () => void;
  onOpenConfig: () => void;
}

export function TitleScreen({
  hasReplay,
  onQuickSelect,
  onStartCampaign,
  onStartTraining,
  onWatchLastReplay,
  onOpenCustomizer,
  onOpenConfig,
}: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('button, input, select, textarea, a, [role=button]')) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sound.init();
        sound.uiConfirm();
        onQuickSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onQuickSelect]);

  return (
    <div className="apex-menu apex-title absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto p-5 sm:p-12"
      style={{ '--apex-cover': `url("${stageArtUrl('narino', 'night')}")` } as CSSProperties}>
      {/* Top quiet meta line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#9db0d4]">
          <span>61 luchadores · 12 arenas</span>
        </div>

        <button
          onClick={() => {
            sound.init();
            sound.uiClick();
            onOpenConfig();
          }}
          className="flex items-center gap-2 rounded-lg border border-[#314064] bg-[#111930]/92 px-4 py-2 text-xs font-semibold text-[#e2e8f0] transition-colors hover:border-[#ffcc33] hover:text-white whitespace-nowrap shrink-0"
        >
          <Settings className="h-4 w-4 text-[#ffcc33]" />
          Configuración
        </button>
      </div>

      {/* Main Title Lockup & Actions */}
      <div className="my-auto max-w-xl">
        {/* Bespoke inline SVG crest with subtle chromatic outline & glow */}
        <svg viewBox="0 0 64 40" className="mb-4 h-11 w-16 drop-shadow-[0_0_12px_rgba(255,204,51,0.35)]" aria-hidden="true">
          <rect x="4" y="18" width="56" height="4" fill="#ffcc33" />
          <polygon points="10,16 18,4 28,14 32,2 36,14 46,4 54,16" fill="#ffcc33" />
          <rect x="8" y="25" width="48" height="3" fill="#e03131" />
          <rect x="14" y="31" width="36" height="3" fill="#3b82f6" />
        </svg>

        <h1 className="font-display text-4xl font-bold uppercase leading-[1.02] tracking-tight text-white sm:text-6xl text-balance drop-shadow-[0_4px_18px_rgba(12,18,38,0.85)]">
          Presidential <span className="text-[#ffcc33]">Brawl</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#cbd5e1] sm:text-base">
          Elige a tu luchador y disputa el combate en un palacio presidencial.
        </p>

        {/* Primary CTA Stack */}
        <div className="mt-8 flex flex-col gap-3 sm:max-w-md">
          <button
            onClick={() => {
              sound.init();
              sound.uiConfirm();
              onQuickSelect();
            }}
            className="flex min-h-[48px] items-center justify-between rounded-lg bg-[#ffcc33] px-5 py-3 font-display text-base font-bold uppercase tracking-wide text-[#0b1020] shadow-[0_0_24px_rgba(255,204,51,0.28)] transition-transform active:scale-[0.98] hover:bg-[#ffd95e]"
          >
            <span className="flex items-center gap-3">
              <Swords className="h-5 w-5" />
              Combate Versus (1P / 2P)
            </span>
            <Play className="h-4 w-4 fill-current" />
          </button>

          <button
            onClick={() => {
              sound.init();
              sound.uiConfirm();
              onStartCampaign();
            }}
            className="flex min-h-[46px] items-center justify-between rounded-lg border border-[#ff8b33]/55 bg-[#19162a]/95 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-[#ffd27a] transition-colors hover:border-[#ffcc33] hover:bg-[#241d36]"
          >
            <span className="flex items-center gap-3">
              <Crown className="h-4 w-4 text-[#ffcc33]" />
              Modo Cumbre Mundial (7 Rondas)
            </span>
          </button>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              onClick={() => {
                sound.init();
                sound.uiClick();
                onOpenCustomizer();
              }}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#38bdf8]/45 bg-[#101c2e]/95 px-3 py-2 text-xs font-semibold text-[#7dd3fc] transition-colors hover:border-[#38bdf8] hover:text-white"
            >
              <UserPlus className="h-4 w-4 text-[#38bdf8]" />
              Personalizar
            </button>

            <button
              onClick={() => {
                sound.init();
                sound.uiClick();
                onStartTraining();
              }}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2a344d] bg-[#111726]/90 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition-colors hover:border-[#4b5c85] hover:text-white"
            >
              <Crosshair className="h-4 w-4 text-[#38bdf8]" />
              Entrenar
            </button>

            <button
              onClick={() => {
                sound.init();
                sound.uiClick();
                onOpenConfig();
              }}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2a344d] bg-[#111726]/90 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition-colors hover:border-[#4b5c85] hover:text-white"
            >
              <Settings className="h-4 w-4 text-[#94a3b8]" />
              Ajustes HD
            </button>
          </div>

          {hasReplay && (
            <button
              onClick={() => {
                sound.init();
                sound.uiClick();
                onWatchLastReplay();
              }}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#a855f7]/50 bg-[#181226]/95 px-4 py-2 text-xs font-bold text-[#e9d5ff] transition-colors hover:border-[#c084fc] hover:text-white"
            >
              <Film className="h-4 w-4 text-[#c084fc]" />
              Ver Última Repetición (JSON)
            </button>
          )}
        </div>
      </div>

      {/* Single flat control hint line */}
      <div className="text-xs font-medium text-[#94a3b8]">
        A/D Mover · W Saltar (x3) · J Ligero/Disparar · K Signature · L Dash · R Recargar · C Ultimate
      </div>
    </div>
  );
}
