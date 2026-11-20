import { useEffect, useRef, useState, type RefObject } from 'react';
import { roomEvents, roomRequest, type RoomSession } from '../network/roomClient';
import { TouchControls } from './TouchControls';
import type { PlayerAction } from '../types/game';

const keyboard: Record<string, PlayerAction> = {
  ArrowLeft:'left', ArrowRight:'right', ArrowUp:'jump', ArrowDown:'down',
  KeyU:'light', KeyI:'heavy', KeyO:'dash', KeyM:'ult', Slash:'reload',
};
const FRAME_INTERVAL = 62;

export function NetworkPanel({canvas,onInput}:{canvas:RefObject<HTMLCanvasElement|null>;onInput:(actions:PlayerAction[])=>void}) {
  const [open,setOpen]=useState(()=>new URLSearchParams(location.search).has('room'));
  const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')||'');
  const [session,setSession]=useState<RoomSession|null>(null);
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [guestConnected,setGuestConnected]=useState(false);
  const [image,setImage]=useState(''); const held=useRef(new Set<PlayerAction>());
  const touchHeld=useRef(new Set<PlayerAction>());
  const activeActions=()=>[...new Set([...held.current,...touchHeld.current])];
  const inputCallback=useRef(onInput); inputCallback.current=onInput;
  const queue=useRef(Promise.resolve());
  const pendingInputs=useRef(0);
  const send=(s:RoomSession,actions:PlayerAction[])=>{
    pendingInputs.current++;
    queue.current=queue.current.then(()=>roomRequest(`/${s.code}/input`,s,{actions}))
      .catch(e=>setError(e.message)).finally(()=>{pendingInputs.current--;});
  };
  useEffect(()=>{
    if(!session)return;
    const abort=new AbortController();
    let sending=false;
    let connected=false;
    let retry: number | undefined;
    const frame=document.createElement('canvas');
    const ctx=frame.getContext('2d');
    const listen=()=>{
      roomEvents(session,abort.signal,a=>inputCallback.current(a),image=>{
        setImage(image);
        setError('');
      },presence=>{
        connected=presence;
        setGuestConnected(presence);
        setError('');
      }).catch(e=>{
        if(abort.signal.aborted)return;
        connected=false;
        setGuestConnected(false);
        held.current.clear(); touchHeld.current.clear();
        inputCallback.current([]);
        setError(e.message);
        retry=window.setTimeout(listen,2000);
      });
    };
    listen();
    const timer=window.setInterval(()=>{
      if(session.role==='guest'){if(!pendingInputs.current)send(session,activeActions());return;}
      const source=canvas.current;
      if(!source||!ctx||!connected||sending||!source.width||!source.height)return;
      const width=Math.min(800,source.width);
      const height=Math.max(1, Math.round(source.height*width/source.width));
      if(frame.width!==width||frame.height!==height){frame.width=width;frame.height=height;}
      ctx.drawImage(source,0,0,width,height);
      sending=true;
      roomRequest(`/${session.code}/frame`,session,{image:frame.toDataURL('image/jpeg',0.52)})
        .catch(e=>setError(e.message)).finally(()=>{sending=false;});
    },session.role==='guest'?200:FRAME_INTERVAL);
    const release=()=>{held.current.clear(); touchHeld.current.clear(); if(session.role==='guest')send(session,[]);else inputCallback.current([]);};
    const visibility=()=>{if(document.hidden)release();};
    const handleKey=(event:KeyboardEvent)=>{
      if(session.role!=='guest'||event.repeat||!keyboard[event.code]) return;
      event.preventDefault();
      const action=keyboard[event.code];
      if(event.type==='keydown') held.current.add(action);
      else held.current.delete(action);
      send(session,activeActions());
    };
    window.addEventListener('keydown',handleKey);
    window.addEventListener('keyup',handleKey);
    window.addEventListener('blur',release);
    document.addEventListener('visibilitychange',visibility);
    return()=>{
      abort.abort();
      clearTimeout(retry);
      clearInterval(timer);
      held.current.clear(); touchHeld.current.clear();
      inputCallback.current([]);
      window.removeEventListener('keydown',handleKey);
      window.removeEventListener('keyup',handleKey);
      window.removeEventListener('blur',release);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[session,canvas]);
  const connect=async(host:boolean)=>{setBusy(true);setError('');try{setSession(await roomRequest(host?'':`/${code.trim().toUpperCase()}/join`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const leave=async()=>{if(!session)return;setBusy(true);try{await roomRequest(`/${session.code}`,session,undefined,'DELETE');setSession(null);setGuestConnected(false);held.current.clear(); touchHeld.current.clear();setImage('');inputCallback.current([]);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const press=(action:PlayerAction,active:boolean)=>{if(!session)return;if(active)touchHeld.current.add(action);else touchHeld.current.delete(action);send(session,activeActions());};
  if(!open)return <button className="network-launch" onClick={()=>setOpen(true)}>Jugar en línea</button>;
  const link=session?`${location.origin}${import.meta.env.BASE_URL}?room=${session.code}`:'';
  return <section className={`network-panel ${session?.role==='guest'?'network-controller':''}`} aria-label="Sala en línea">
    <div className="network-heading"><strong>APEX · SALA EN LÍNEA</strong>{session?.role!=='guest'&&<button aria-label="Cerrar panel" onClick={()=>setOpen(false)}>×</button>}</div>
    {!session?<><p>Crea un duelo para dos jugadores y comparte el enlace con tu rival.</p><button disabled={busy} onClick={()=>connect(true)}>Crear sala</button><label>Código de sala<input value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="Código de 10 caracteres"/></label><button disabled={busy||code.trim().length!==10} onClick={()=>connect(false)}>Conectar como J2</button></>:<>
      <p>Sala <strong>{session.code}</strong> · {session.role==='host'?'Equipo principal':'Mando J2'}</p>
      {session.role==='host'?<><p>Comparte el enlace y comienza una partida J1 vs J2. Mantén esta pestaña visible. {guestConnected?'J2 conectado.':'Esperando a J2.'}</p><input readOnly aria-label="Enlace de invitación" value={link} onFocus={e=>e.target.select()}/><button onClick={()=>navigator.clipboard?.writeText(link).catch(()=>setError('Selecciona y copia el enlace.'))}>Copiar enlace</button></>:<><p>El anfitrión inicia la partida. Usa los controles táctiles o las flechas y U, I, O, M y /.</p>{image?<img src={image} alt="Partida en el equipo principal" draggable={false}/>:<p>Esperando imagen del equipo principal…</p>}<TouchControls inline onAction={press} /></>}
      <button disabled={busy} onClick={leave}>Salir de la sala</button>
    </>}
    {error&&<p role="alert" className="network-error">{error}</p>}
  </section>;
}
