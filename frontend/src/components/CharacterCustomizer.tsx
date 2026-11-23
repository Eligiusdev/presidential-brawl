import { ArrowLeft, Dices, FlipHorizontal, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/soundEngine';
import { BODY_BUILD_PRESETS, makeColorRamp, PRESIDENTS_DATA, SKIN_PRESETS } from '../data/presidents';
import { fighterAsset, fighterArtPath, paintSprite } from '../engine/fighterSprites';
import { PreviewAnimState, renderCharacterPreview } from '../engine/pixelRenderer';
import {
  BodyBuild,
  EyeStyle,
  FaceShape,
  FacialHairStyle,
  HatOrHairStyle,
  MouthStyle,
  NoseStyle,
  OutfitStyle,
  PresidentData,
  TieOrSashStyle,
  WeaponType,
} from '../types/game';
import { PortraitCanvas } from './PortraitCanvas';

interface CharacterCustomizerProps {
  initialBase?: PresidentData;
  onSave: (fighter: PresidentData) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

type StudioTab = 'body' | 'face' | 'gear' | 'combat';

const ANIM_OPTIONS: Array<{ id: PreviewAnimState; label: string }> = [
  { id: 'idle', label: 'Reposo' },
  { id: 'walk', label: 'Caminar' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Saltar' },
  { id: 'shoot', label: 'Disparar' },
  { id: 'reload', label: 'Recargar' },
  { id: 'sig', label: 'Signature' },
  { id: 'victory', label: 'Victoria' },
];

const ATLAS_PREVIEW_CLIPS = {
  idle: 'guard', walk: 'walk', run: 'walk', jump: 'jump', sig: 'slash', victory: 'victory',
  shoot: 'fire', reload: 'magazine',
} as const;

const FACE_SHAPES: Array<{ id: FaceShape; label: string }> = [
  { id: 'square', label: 'Cuadrada' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'angular', label: 'Angular' },
  { id: 'broad', label: 'Ancha' },
];

const EYE_STYLES: Array<{ id: EyeStyle; label: string }> = [
  { id: 'determined', label: 'Decididos' },
  { id: 'sharp', label: 'Afilados' },
  { id: 'wide', label: 'Intensivos' },
  { id: 'shades', label: 'Gafas Negras' },
  { id: 'visor', label: 'Visor Táctico' },
];

const NOSE_STYLES: Array<{ id: NoseStyle; label: string }> = [
  { id: 'straight', label: 'Recta' },
  { id: 'aquiline', label: 'Aguileña' },
  { id: 'broad', label: 'Ancha' },
  { id: 'small', label: 'Fina' },
];

const MOUTH_STYLES: Array<{ id: MouthStyle; label: string }> = [
  { id: 'serious', label: 'Seria' },
  { id: 'smirk', label: 'Sarcástica' },
  { id: 'fierce', label: 'Feroz' },
  { id: 'calm', label: 'Serena' },
];

const FACIAL_HAIR_STYLES: Array<{ id: FacialHairStyle; label: string }> = [
  { id: 'none', label: 'Afeitado' },
  { id: 'stubble', label: 'Barba 3 días' },
  { id: 'mustache', label: 'Bigote' },
  { id: 'goatee', label: 'Candado' },
  { id: 'full_beard', label: 'Barba Completa' },
];

const OUTFIT_STYLES: Array<{ id: OutfitStyle; label: string }> = [
  { id: 'suit', label: 'Traje Presidencial' },
  { id: 'tactical', label: 'Chaleco Táctico' },
  { id: 'gala', label: 'Uniforme de Gala' },
  { id: 'leather', label: 'Chaqueta Cuero' },
  { id: 'robe', label: 'Toga / Abrigo' },
  { id: 'armored', label: 'Blindaje Pesado' },
];

const HAT_OR_HAIR_STYLES: Array<{ id: HatOrHairStyle; label: string }> = [
  { id: 'combover', label: 'Copete Clásico' },
  { id: 'wild', label: 'Melena Salvaje' },
  { id: 'cap', label: 'Gorra Táctica' },
  { id: 'ponytail', label: 'Coleta Alta' },
  { id: 'fedora', label: 'Sombrero Fedora' },
  { id: 'tophat', label: 'Sombrero de Copa' },
  { id: 'bicorne_hair', label: 'Patillas Históricas' },
  { id: 'grey_short', label: 'Corte Veterano' },
  { id: 'beret', label: 'Boina Comandante' },
  { id: 'helmet', label: 'Casco Balístico' },
];

const TIE_OR_SASH_STYLES: Array<{ id: TieOrSashStyle; label: string }> = [
  { id: 'red_tie', label: 'Corbata Clásica' },
  { id: 'yellow_tie', label: 'Corbata Dorada' },
  { id: 'bowtie', label: 'Corbatín' },
  { id: 'black_tie', label: 'Corbata Oscura' },
  { id: 'tricolor_sash', label: 'Banda Soberana' },
  { id: 'gold_sash', label: 'Banda Áurea' },
  { id: 'medal_sash', label: 'Banda Medallas' },
  { id: 'tactical', label: 'Sin Corbata (Táctico)' },
];

const WEAPON_TYPES: Array<{ id: WeaponType; label: string }> = [
  { id: 'baton', label: 'Bastón Táctico' },
  { id: 'saber', label: 'Sable Andino' },
  { id: 'gavel', label: 'Mazo Dorado' },
  { id: 'chainsaw', label: 'Motosierra' },
  { id: 'staff', label: 'Báculo Energía' },
  { id: 'claws', label: 'Garras / Mazo' },
  { id: 'axe', label: 'Hacha Colosal' },
  { id: 'gloves', label: 'Guanteletes' },
];

const SUIT_COLOR_PRESETS = ['#1e3068', '#1e242e', '#46387c', '#1a1b22', '#1e3e8e', '#7f1d1d', '#14532d', '#d9842b'];
const ACCENT_COLOR_PRESETS = ['#ffcc33', '#38bdf8', '#e02d2d', '#25d999', '#a855f7', '#fb923c', '#f43f5e', '#e2e8f0'];
const HAIR_COLOR_PRESETS = ['#1c1d24', '#4d3020', '#92400e', '#f5c63d', '#d4d8e0', '#b91c1c', '#0f766e'];
const EYE_COLOR_PRESETS = ['#1e293b', '#2563eb', '#10b981', '#eab308', '#dc2626', '#7c3aed'];

function darkenSimple(hex: string, amt = 45): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = Math.max(0, ((num >> 16) & 255) - amt);
  const g = Math.max(0, ((num >> 8) & 255) - amt);
  const b = Math.max(0, (num & 255) - amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createInitialDraft(base?: PresidentData): PresidentData {
  if (base && base.isCustom) {
    return structuredClone(base);
  }
  const tpl = structuredClone(base || PRESIDENTS_DATA[2]);
  return {
    ...tpl,
    id: `custom_${Date.now()}`,
    isCustom: true,
    spriteSourceId: tpl.id,
    powerSourceId: tpl.powerSourceId || tpl.id,
    name: base ? `${base.name} Apex` : 'Agente Soberano',
    title: base ? `${base.title} Custom` : 'Operativo Élite',
    era: 'Personalizado',
    role: 'Luchador Custom',
    taunt: '¡Mi diseño dicta las reglas del combate!',
  };
}

export function CharacterCustomizer({ initialBase, onSave, onDelete, onClose }: CharacterCustomizerProps) {
  const [draft, setDraft] = useState<PresidentData>(() => createInitialDraft(initialBase));
  const [tab, setTab] = useState<StudioTab>(() => fighterArtPath(draft) ? 'combat' : 'body');
  const [animMode, setAnimMode] = useState<PreviewAnimState>('idle');
  const [faceDir, setFaceDir] = useState<1 | -1>(1);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const artPath = fighterArtPath(draft);
  const [previewKey, setPreviewKey] = useState('');
  const currentPreview = [artPath, animMode, faceDir].join(':');

  const changeAppearance = (spriteSourceId: string) => {
    sound.uiClick();
    setDraft(prev => ({ ...prev, spriteSourceId: spriteSourceId || undefined }));
    setPreviewKey('');
    setAnimMode('idle');
    setTab(spriteSourceId ? 'combat' : 'body');
  };

  const isEditingExisting = Boolean(initialBase?.isCustom);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let hasDrawn = false;
    const start = performance.now();
    const renderLoop = (now: number) => {
      const tick = Math.floor((now - start) * 0.06);
      if (artPath) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height * 0.91);
        const clip = ATLAS_PREVIEW_CLIPS[animMode];
        const time = animMode === 'run' ? tick * 2 : tick % 72;
        const drawn = paintSprite(ctx, draft, clip, time, faceDir, 2.5)
          || paintSprite(ctx, draft, 'guard', time, faceDir, 2.5);
        ctx.restore();
        if (drawn && !hasDrawn) {
          hasDrawn = true;
          setPreviewKey(currentPreview);
        }
      } else {
        renderCharacterPreview(canvas, draft, animMode, tick, faceDir);
      }
      raf = requestAnimationFrame(renderLoop);
    };
    raf = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(raf);
  }, [draft, animMode, faceDir, artPath, currentPreview]);

  const updateAnatomy = (patch: Partial<PresidentData['anatomy']>) => {
    setDraft((prev) => ({
      ...prev,
      anatomy: { ...prev.anatomy, ...patch },
    }));
  };

  const updateFace = (patch: Partial<PresidentData['anatomy']['face']>) => {
    setDraft((prev) => ({
      ...prev,
      anatomy: {
        ...prev.anatomy,
        face: { ...prev.anatomy.face, ...patch },
      },
    }));
  };

  const applyBodyBuild = (build: BodyBuild) => {
    sound.uiClick();
    const preset = BODY_BUILD_PRESETS[build];
    updateAnatomy({
      bodyBuild: build,
      heightScale: preset.heightScale,
      shoulderWidth: preset.shoulderWidth,
      chestWidth: preset.chestWidth,
      waistWidth: preset.waistWidth,
      armThickness: preset.armThickness,
      legThickness: preset.legThickness,
      headRadius: preset.headRadius,
    });
  };

  const applyPowerSource = (source: PresidentData) => {
    sound.uiClick();
    setDraft((prev) => ({
      ...prev,
      powerSourceId: source.id,
      signatureType: source.signatureType,
      sigName: source.sigName,
      sig: structuredClone(source.sig),
      ult: structuredClone(source.ult),
      stats: { ...source.stats },
    }));
  };

  const handleRandomize = () => {
    sound.uiConfirm();
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const build = pick<BodyBuild>(['lean', 'athletic', 'heavy', 'titan']);
    const bp = BODY_BUILD_PRESETS[build];
    const skin = pick(SKIN_PRESETS).base;
    const suit = pick(SUIT_COLOR_PRESETS);
    const accent = pick(ACCENT_COLOR_PRESETS);
    const hair = pick(HAIR_COLOR_PRESETS);
    const src = pick(PRESIDENTS_DATA);

    setDraft((prev) => ({
      ...prev,
      spriteSourceId: fighterArtPath(prev) ? src.id : undefined,
      powerSourceId: src.id,
      signatureType: src.signatureType,
      sigName: src.sigName,
      sig: structuredClone(src.sig),
      ult: structuredClone(src.ult),
      stats: { ...src.stats },
      palette: {
        skin: makeColorRamp(skin),
        suit: makeColorRamp(suit),
        accent: makeColorRamp(accent),
        hair,
        hairShadow: darkenSimple(hair),
        boots: '#11141c',
      },
      anatomy: {
        ...prev.anatomy,
        bodyBuild: build,
        heightScale: bp.heightScale,
        shoulderWidth: bp.shoulderWidth,
        chestWidth: bp.chestWidth,
        waistWidth: bp.waistWidth,
        armThickness: bp.armThickness,
        legThickness: bp.legThickness,
        headRadius: bp.headRadius,
        outfitStyle: pick(OUTFIT_STYLES).id,
        hasCapeOrCoat: Math.random() > 0.45,
        capeColor: suit,
        capeShadow: darkenSimple(suit, 32),
        weaponType: pick(WEAPON_TYPES).id,
        hatOrHair: pick(HAT_OR_HAIR_STYLES).id,
        tieOrSash: pick(TIE_OR_SASH_STYLES).id,
        glasses: Math.random() > 0.7,
        holster: Math.random() > 0.4,
        kneepads: Math.random() > 0.5,
        face: {
          faceShape: pick(FACE_SHAPES).id,
          eyeStyle: pick(EYE_STYLES).id,
          eyeColor: pick(EYE_COLOR_PRESETS),
          noseStyle: pick(NOSE_STYLES).id,
          mouthStyle: pick(MOUTH_STYLES).id,
          facialHair: pick(FACIAL_HAIR_STYLES).id,
        },
      },
    }));
  };

  const handleSave = () => {
    sound.uiConfirm();
    const cleanedName = draft.name.trim() || 'Luchador Élite';
    const cleanedTitle = draft.title.trim() || 'Agente Soberano';
    const cleanedTaunt = draft.taunt.trim() || '¡Victoria asegurada!';
    onSave({
      ...draft,
      name: cleanedName,
      title: cleanedTitle,
      taunt: cleanedTaunt,
    });
  };

  return (
    <div className="apex-menu absolute inset-0 z-30 flex flex-col p-4 sm:p-6 overflow-y-auto arcade-scroll">
      {/* Top Studio Header */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-[#1f2840] pb-3.5">
        <div className="flex items-center gap-3">
          <button
            data-gamepad-back
            onClick={() => {
              sound.uiClick();
              onClose();
            }}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-[#2a344d] bg-[#131929] px-3 text-xs font-semibold text-[#cbd5e1] hover:text-white whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white sm:text-2xl">
              Taller Anatómico de Luchadores
            </h2>
            <p className="text-[11px] text-[#94a3b8]">
              Motor procedural de píxeles HD · Esqueleto articulado IK y rostro detallado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRandomize}
            className="flex h-10 items-center gap-2 rounded-lg border border-[#2f3b57] bg-[#161e31] px-3.5 text-xs font-bold text-[#38bdf8] hover:border-[#38bdf8] whitespace-nowrap shrink-0"
          >
            <Dices className="h-4 w-4" />
            Aleatorio
          </button>
          {isEditingExisting && onDelete && (
            <button
              onClick={() => {
                sound.uiClick();
                onDelete(draft.id);
              }}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-[#ef4444]/50 bg-[#2a1218] px-3.5 text-xs font-bold text-[#fca5a5] hover:border-[#ef4444] hover:text-white whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#ffcc33] px-5 font-display text-xs font-bold uppercase tracking-wider text-[#0b0e17] hover:bg-[#ffd95e] whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4" />
            Guardar Luchador
          </button>
        </div>
      </div>

      {/* Main 2-Column Studio Body */}
      <div className="mx-auto mt-4 grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 lg:grid-cols-12 min-h-0">
        {/* Left: Live Anatomical Pixel Viewport & Identity */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#222c46] bg-[#0d121f] p-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-lg border border-[#2e3b59]">
                <PortraitCanvas president={draft} className="h-12 w-12" animate />
              </div>
              <div>
                <div className="font-display text-base font-bold text-white leading-tight">{draft.name || 'Sin Nombre'}</div>
                <div className="text-xs text-[#94a3b8]">{draft.title}</div>
              </div>
            </div>
            <button
              onClick={() => {
                sound.uiClick();
                setFaceDir((d) => (d === 1 ? -1 : 1));
              }}
              className="flex items-center gap-1.5 rounded-md border border-[#2a344d] bg-[#141b2d] px-2.5 py-1.5 text-[11px] font-semibold text-[#cbd5e1] hover:border-[#ffcc33] hover:text-white"
            >
              <FlipHorizontal className="h-3.5 w-3.5 text-[#ffcc33]" />
              Girar
            </button>
          </div>

          <label className="block text-xs font-semibold text-[#cbd5e1]">
            Apariencia
            <select value={artPath ? draft.spriteSourceId : ''} onChange={e => changeAppearance(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#2a344d] bg-[#131a2b] px-2.5 py-2 text-white">
              <option value="">Diseño manual</option>
              <optgroup label="Atlas ilustrados">
                {PRESIDENTS_DATA.filter(fighterArtPath).map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
              </optgroup>
            </select>
          </label>
          {artPath && <p className="text-xs text-[#94a3b8]">
            El atlas define el aspecto del luchador. Elige Diseño manual para editar cuerpo, rostro y vestuario.
          </p>}
          <div className="relative flex items-center justify-center rounded-lg border border-[#25304d] bg-[#0b101b] p-2">
            {artPath && previewKey !== currentPreview && <img
              key={artPath} src={fighterAsset(artPath, 'thumb.webp')} alt="" className="pointer-events-none absolute h-[220px] w-[220px] object-contain sm:h-[256px] sm:w-[256px]"
              style={{ transform: `scaleX(${faceDir})` }} />}
            <canvas
              key={currentPreview}
              aria-label={`Vista previa de ${draft.name}`}
              ref={previewCanvasRef}
              width={288}
              height={288}
              className={`pixel-canvas block h-[220px] w-[220px] sm:h-[256px] sm:w-[256px] ${artPath && previewKey !== currentPreview ? "invisible" : ""}`}
            />
            <span className="absolute bottom-2 left-2.5 font-mono-num text-[10px] font-semibold text-[#64748b]">
              {artPath ? 'Atlas ilustrado' : BODY_BUILD_PRESETS[draft.anatomy.bodyBuild].label}
            </span>
          </div>

          {/* Animation Test Selector */}
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Animaciones
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {ANIM_OPTIONS.filter(opt => !artPath || (opt.id !== 'shoot' && opt.id !== 'reload')).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    sound.uiClick();
                    setAnimMode(opt.id);
                  }}
                  className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    animMode === opt.id
                      ? 'border-[#ffcc33] bg-[#242118] text-[#ffcc33]'
                      : 'border-[#222c46] bg-[#131929] text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Identity Inputs */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-[#1c2438]">
            <label className="block">
              <span className="text-[11px] font-semibold text-[#94a3b8]">Nombre</span>
              <input
                type="text"
                maxLength={22}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-[#2a344d] bg-[#131a2b] px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc33] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-[#94a3b8]">Título</span>
              <input
                type="text"
                maxLength={26}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 w-full rounded-md border border-[#2a344d] bg-[#131a2b] px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc33] focus:outline-none"
              />
            </label>
            <label className="col-span-2 block">
              <span className="text-[11px] font-semibold text-[#94a3b8]">Frase de Victoria / Taunt</span>
              <input
                type="text"
                maxLength={54}
                value={draft.taunt}
                onChange={(e) => setDraft({ ...draft, taunt: e.target.value })}
                className="mt-1 w-full rounded-md border border-[#2a344d] bg-[#131a2b] px-2.5 py-1.5 text-xs text-white focus:border-[#ffcc33] focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Right: Tabbed Studio Editor */}
        <div className="flex flex-col rounded-xl border border-[#222c46] bg-[#0d121f] p-4 lg:col-span-7">
          {/* Tabs */}
          <div className={`grid ${artPath ? "grid-cols-1" : "grid-cols-4"} gap-1.5 rounded-lg border border-[#1f2840] bg-[#090d17] p-1`}>
            {(
              [
                { id: 'body', label: '1. Cuerpo' },
                { id: 'face', label: '2. Rostro' },
                { id: 'gear', label: '3. Ropa y Equipo' },
                { id: 'combat', label: '4. Arsenal' },
              ] as const
            ).filter(t => !artPath || t.id === 'combat').map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  sound.uiClick();
                  setTab(t.id);
                }}
                className={`rounded-md py-2 font-display text-xs font-bold uppercase tracking-wide transition-colors ${
                  tab === t.id ? 'bg-[#ffcc33] text-[#0b0e17]' : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Scrollable Tab Content */}
          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 arcade-scroll max-h-[500px]">
            {tab === 'body' && (
              <>
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                    Tipo de Cuerpo (Arquetipo Anatómico)
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(BODY_BUILD_PRESETS) as BodyBuild[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => applyBodyBuild(b)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          draft.anatomy.bodyBuild === b
                            ? 'border-[#ffcc33] bg-[#211f1b] text-white'
                            : 'border-[#232c44] bg-[#131929] text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        <div className="font-display text-xs font-bold">{BODY_BUILD_PRESETS[b].label}</div>
                        <div className="mt-0.5 font-mono-num text-[10px] opacity-80">
                          Alt. {Math.round(BODY_BUILD_PRESETS[b].heightScale * 100)}%
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SliderControl
                    label="Estatura"
                    value={draft.anatomy.heightScale}
                    min={0.88}
                    max={1.18}
                    step={0.01}
                    display={`${Math.round(draft.anatomy.heightScale * 100)}%`}
                    onChange={(v) => updateAnatomy({ heightScale: v })}
                  />
                  <SliderControl
                    label="Ancho de Hombros"
                    value={draft.anatomy.shoulderWidth}
                    min={11}
                    max={20}
                    step={0.5}
                    display={draft.anatomy.shoulderWidth.toFixed(1)}
                    onChange={(v) => updateAnatomy({ shoulderWidth: v })}
                  />
                  <SliderControl
                    label="Volumen de Torso"
                    value={draft.anatomy.chestWidth}
                    min={10}
                    max={18}
                    step={0.5}
                    display={draft.anatomy.chestWidth.toFixed(1)}
                    onChange={(v) => updateAnatomy({ chestWidth: v })}
                  />
                  <SliderControl
                    label="Cintura"
                    value={draft.anatomy.waistWidth}
                    min={8}
                    max={16}
                    step={0.5}
                    display={draft.anatomy.waistWidth.toFixed(1)}
                    onChange={(v) => updateAnatomy({ waistWidth: v })}
                  />
                  <SliderControl
                    label="Grosor de Brazos"
                    value={draft.anatomy.armThickness}
                    min={3.6}
                    max={6.2}
                    step={0.1}
                    display={draft.anatomy.armThickness.toFixed(1)}
                    onChange={(v) => updateAnatomy({ armThickness: v })}
                  />
                  <SliderControl
                    label="Grosor de Piernas"
                    value={draft.anatomy.legThickness}
                    min={4.2}
                    max={6.8}
                    step={0.1}
                    display={draft.anatomy.legThickness.toFixed(1)}
                    onChange={(v) => updateAnatomy({ legThickness: v })}
                  />
                  <SliderControl
                    label="Tamaño de Cabeza"
                    value={draft.anatomy.headRadius}
                    min={7.0}
                    max={9.2}
                    step={0.1}
                    display={draft.anatomy.headRadius.toFixed(1)}
                    onChange={(v) => updateAnatomy({ headRadius: v })}
                  />
                </div>
              </>
            )}

            {tab === 'face' && (
              <>
                {/* Skin Tone */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">Tono de Piel</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {SKIN_PRESETS.map((sp) => (
                      <button
                        key={sp.name}
                        onClick={() => {
                          sound.uiClick();
                          setDraft((prev) => ({
                            ...prev,
                            palette: { ...prev.palette, skin: makeColorRamp(sp.base) },
                          }));
                        }}
                        title={sp.name}
                        className={`h-8 w-8 rounded-md border-2 transition-transform ${
                          draft.palette.skin.base.toLowerCase() === sp.base.toLowerCase()
                            ? 'scale-110 border-[#ffcc33]'
                            : 'border-[#2c3752]'
                        }`}
                        style={{ backgroundColor: sp.base }}
                      />
                    ))}
                    <label className="flex items-center gap-2 rounded-md border border-[#2c3752] bg-[#141b2d] px-2.5 py-1 text-[11px] text-[#cbd5e1]">
                      <span>Libre</span>
                      <input
                        type="color"
                        value={draft.palette.skin.base}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            palette: { ...prev.palette, skin: makeColorRamp(e.target.value) },
                          }))
                        }
                        className="h-5 w-6 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Face Shape */}
                <OptionGrid
                  title="Forma de la Cara"
                  options={FACE_SHAPES}
                  value={draft.anatomy.face.faceShape}
                  onSelect={(faceShape) => updateFace({ faceShape })}
                />

                {/* Eyes + Eye Color */}
                <OptionGrid
                  title="Ojos / Expresión"
                  options={EYE_STYLES}
                  value={draft.anatomy.face.eyeStyle}
                  onSelect={(eyeStyle) => updateFace({ eyeStyle })}
                />

                <div>
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">Color de Ojos</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {EYE_COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          sound.uiClick();
                          updateFace({ eyeColor: c });
                        }}
                        className={`h-7 w-7 rounded-md border-2 ${
                          draft.anatomy.face.eyeColor === c ? 'border-[#ffcc33] scale-110' : 'border-[#2c3752]'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={draft.anatomy.face.eyeColor}
                      onChange={(e) => updateFace({ eyeColor: e.target.value })}
                      className="h-7 w-8 cursor-pointer rounded border border-[#2c3752] bg-[#141b2d]"
                    />
                  </div>
                </div>

                {/* Nose, Mouth, Facial Hair */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <OptionGrid
                    title="Nariz"
                    options={NOSE_STYLES}
                    value={draft.anatomy.face.noseStyle}
                    onSelect={(noseStyle) => updateFace({ noseStyle })}
                    cols={2}
                  />
                  <OptionGrid
                    title="Boca"
                    options={MOUTH_STYLES}
                    value={draft.anatomy.face.mouthStyle}
                    onSelect={(mouthStyle) => updateFace({ mouthStyle })}
                    cols={2}
                  />
                </div>

                <OptionGrid
                  title="Vello Facial"
                  options={FACIAL_HAIR_STYLES}
                  value={draft.anatomy.face.facialHair}
                  onSelect={(facialHair) => updateFace({ facialHair })}
                />
              </>
            )}

            {tab === 'gear' && (
              <>
                <OptionGrid
                  title="Estilo de Vestimenta"
                  options={OUTFIT_STYLES}
                  value={draft.anatomy.outfitStyle}
                  onSelect={(outfitStyle) => updateAnatomy({ outfitStyle })}
                  cols={3}
                />

                {/* Palette Pickers */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ColorRow
                    label="Color Traje"
                    presets={SUIT_COLOR_PRESETS}
                    value={draft.palette.suit.base}
                    onChange={(hex) =>
                      setDraft((prev) => ({ ...prev, palette: { ...prev.palette, suit: makeColorRamp(hex) } }))
                    }
                  />
                  <ColorRow
                    label="Color Acento"
                    presets={ACCENT_COLOR_PRESETS}
                    value={draft.palette.accent.base}
                    onChange={(hex) =>
                      setDraft((prev) => ({ ...prev, palette: { ...prev.palette, accent: makeColorRamp(hex) } }))
                    }
                  />
                  <ColorRow
                    label="Pelo y Barba"
                    presets={HAIR_COLOR_PRESETS}
                    value={draft.palette.hair}
                    onChange={(hex) =>
                      setDraft((prev) => ({
                        ...prev,
                        palette: { ...prev.palette, hair: hex, hairShadow: darkenSimple(hex) },
                      }))
                    }
                  />
                </div>

                <OptionGrid
                  title="Cabello y Sombreros"
                  options={HAT_OR_HAIR_STYLES}
                  value={draft.anatomy.hatOrHair}
                  onSelect={(hatOrHair) => updateAnatomy({ hatOrHair })}
                  cols={3}
                />

                <OptionGrid
                  title="Corbata / Banda Presidencial"
                  options={TIE_OR_SASH_STYLES}
                  value={draft.anatomy.tieOrSash}
                  onSelect={(tieOrSash) => updateAnatomy({ tieOrSash })}
                  cols={3}
                />

                {/* Accessories & Cape Toggles */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                    Accesorios Tácticos y Capa
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ToggleTile
                      label="Gabardina / Capa"
                      active={draft.anatomy.hasCapeOrCoat}
                      onToggle={() =>
                        updateAnatomy({
                          hasCapeOrCoat: !draft.anatomy.hasCapeOrCoat,
                          capeColor: draft.anatomy.capeColor || draft.palette.suit.base,
                          capeShadow: draft.anatomy.capeShadow || draft.palette.suit.shadow,
                        })
                      }
                    />
                    <ToggleTile
                      label="Gafas Oscuras"
                      active={draft.anatomy.glasses}
                      onToggle={() => updateAnatomy({ glasses: !draft.anatomy.glasses })}
                    />
                    <ToggleTile
                      label="Funda / Pistolera"
                      active={draft.anatomy.holster}
                      onToggle={() => updateAnatomy({ holster: !draft.anatomy.holster })}
                    />
                    <ToggleTile
                      label="Rodilleras"
                      active={draft.anatomy.kneepads}
                      onToggle={() => updateAnatomy({ kneepads: !draft.anatomy.kneepads })}
                    />
                  </div>
                  {draft.anatomy.hasCapeOrCoat && (
                    <label className="mt-2 inline-flex items-center gap-2 rounded-md border border-[#2a344d] bg-[#131929] px-3 py-1.5 text-xs text-[#cbd5e1]">
                      <span>Color de Capa / Abrigo</span>
                      <input
                        type="color"
                        value={draft.anatomy.capeColor || draft.palette.suit.base}
                        onChange={(e) =>
                          updateAnatomy({
                            capeColor: e.target.value,
                            capeShadow: darkenSimple(e.target.value, 36),
                          })
                        }
                        className="h-5 w-7 cursor-pointer bg-transparent"
                      />
                    </label>
                  )}
                </div>
              </>
            )}

            {tab === 'combat' && (
              <>
                <OptionGrid
                  title="Arma Cuerpo a Cuerpo"
                  options={WEAPON_TYPES}
                  value={draft.anatomy.weaponType}
                  onSelect={(weaponType) => updateAnatomy({ weaponType })}
                  cols={4}
                />

                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                    <Sparkles className="h-3.5 w-3.5 text-[#ffcc33]" />
                    Estilo de Combate (Signature y Decreto Supremo)
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-[210px] overflow-y-auto pr-1 arcade-scroll">
                    {PRESIDENTS_DATA.map((src) => {
                      const active = (draft.powerSourceId || draft.id) === src.id;
                      return (
                        <button
                          key={src.id}
                          onClick={() => applyPowerSource(src)}
                          className={`rounded-lg border p-2.5 text-left transition-colors ${
                            active
                              ? 'border-[#ffcc33] bg-[#211f1b] text-white'
                              : 'border-[#232c44] bg-[#131929] text-[#cbd5e1] hover:border-[#4b5c85]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs font-bold text-[#ffcc33] truncate">{src.sigName}</span>
                            <span className="text-[10px] text-[#94a3b8] shrink-0">{src.name}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#38bdf8] font-semibold truncate">Ult: {src.ult.name}</div>
                          <div className="mt-0.5 text-[10px] text-[#94a3b8] line-clamp-1">{src.ult.sigDesc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fine Combat Stats */}
                <div className="grid grid-cols-1 gap-3 border-t border-[#1e273d] pt-3 sm:grid-cols-2">
                  <SliderControl
                    label="Velocidad"
                    value={draft.stats.speed}
                    min={3.2}
                    max={6.2}
                    step={0.1}
                    display={draft.stats.speed.toFixed(1)}
                    onChange={(v) => setDraft({ ...draft, stats: { ...draft.stats, speed: v } })}
                  />
                  <SliderControl
                    label="Peso / Estabilidad"
                    value={draft.stats.weight}
                    min={0.8}
                    max={1.55}
                    step={0.05}
                    display={draft.stats.weight.toFixed(2)}
                    onChange={(v) => setDraft({ ...draft, stats: { ...draft.stats, weight: v } })}
                  />
                  <SliderControl
                    label="Fuerza de Salto"
                    value={draft.stats.jumpForce}
                    min={11.0}
                    max={14.5}
                    step={0.2}
                    display={draft.stats.jumpForce.toFixed(1)}
                    onChange={(v) => setDraft({ ...draft, stats: { ...draft.stats, jumpForce: v } })}
                  />
                  <SliderControl
                    label="Potencia"
                    value={draft.stats.power}
                    min={0.9}
                    max={1.3}
                    step={0.02}
                    display={`${Math.round(draft.stats.power * 100)}%`}
                    onChange={(v) => setDraft({ ...draft, stats: { ...draft.stats, power: v } })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionGrid<T extends string>({
  title,
  options,
  value,
  onSelect,
  cols = 4,
}: {
  title: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onSelect: (val: T) => void;
  cols?: 2 | 3 | 4;
}) {
  const gridClass =
    cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">{title}</div>
      <div className={`grid gap-1.5 ${gridClass}`}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              sound.uiClick();
              onSelect(opt.id);
            }}
            className={`rounded-md border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
              value === opt.id
                ? 'border-[#ffcc33] bg-[#211f1b] text-[#ffcc33]'
                : 'border-[#232c44] bg-[#131929] text-[#cbd5e1] hover:border-[#4b5c85] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (val: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-[#1f2840] bg-[#111726] p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#cbd5e1]">{label}</span>
        <span className="font-mono-num font-bold text-[#ffcc33]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5 w-full accent-[#ffcc33]"
      />
    </label>
  );
}

function ColorRow({
  label,
  presets,
  value,
  onChange,
}: {
  label: string;
  presets: string[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="rounded-lg border border-[#1f2840] bg-[#111726] p-2.5">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#cbd5e1]">
        <span>{label}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-6 cursor-pointer bg-transparent"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => (
          <button
            key={c}
            onClick={() => {
              sound.uiClick();
              onChange(c);
            }}
            className={`h-5 w-5 rounded border ${value.toLowerCase() === c.toLowerCase() ? 'border-[#ffcc33] scale-110' : 'border-[#2c3752]'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function ToggleTile({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={() => {
        sound.uiClick();
        onToggle();
      }}
      className={`rounded-md border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
        active
          ? 'border-[#38bdf8] bg-[#13263a] text-white'
          : 'border-[#232c44] bg-[#131929] text-[#94a3b8] hover:text-white'
      }`}
    >
      <div className="truncate">{label}</div>
      <div className="mt-0.5 text-[10px] font-bold">{active ? 'ACTIVO' : 'NO'}</div>
    </button>
  );
}
