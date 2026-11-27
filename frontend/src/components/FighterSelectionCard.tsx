import { fighterArtPath, fighterAsset } from '../engine/fighterSprites';
import type { PresidentData } from '../types/game';
import { FighterName } from './FighterName';

export function FighterSelectionCard({ fighter, label, selected, onSelect }: {
  fighter: PresidentData; label: string; selected?: boolean; onSelect?: () => void;
}) {
  const path = fighterArtPath(fighter);
  const content = <>
    <span className="block text-xs font-semibold text-sky-200">{label}</span>
    <span className="grid h-28 place-items-center sm:h-36">
      {path && <img key={path} src={fighterAsset(path, 'selection.webp')} alt=""
        className="h-auto max-h-full w-auto max-w-full object-contain" draggable={false}
        style={{ maxHeight: 'min(100%, 144px)', imageRendering: 'auto' }} />}
    </span>
    <span className="block text-sm font-bold"><FighterName fighter={fighter} /></span>
    <span className="block text-xs text-sky-200">{fighter.title} · {fighter.era}</span>
    <span className="block text-xs text-slate-300">{fighter.role}</span>
  </>;
  const style = `min-w-0 rounded-lg border p-2 text-left ${selected ? 'border-sky-400 bg-[#142b43]' : 'border-[#31486f] bg-[#0c1526]'}`;
  return onSelect
    ? <button type="button" className={style} aria-pressed={selected} onClick={onSelect}>{content}</button>
    : <article className={style}>{content}</article>;
}
