import { useGame } from '../game/GameContext';

export function PlayPage() {
  const g = useGame();
  const { lesson, screen, mode, configOpen } = g;
  if (lesson === null || screen !== 'PLAYING' || mode !== 'training' || configOpen) return null;
  return (
    <aside aria-live="polite" style={{position:'absolute',top:'36%',left:'50%',transform:'translateX(-50%)',zIndex:12,
      maxWidth:'min(85vw, 28rem)',padding:'.45rem .8rem',borderRadius:8,background:'#101a30ec',color:'white',textAlign:'center',pointerEvents:'none'}}>
      <strong>{lesson < 3 ? `Tutorial · ${lesson + 1}/3` : '¡Tutorial completado!'}</strong>
      <div>{['Camina hacia el rival con el control de movimiento (teclado predeterminado: A / D).',
        'Salta con el botón de salto (teclado predeterminado: W).',
        'Acércate al rival y conecta un golpe (teclado predeterminado: J).',
        'Puedes seguir practicando o salir desde Pausa.'][lesson]}</div>
    </aside>
  );
}
