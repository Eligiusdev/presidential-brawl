import { useEffect, useRef, useState, type RefObject } from 'react';
import { roomEvents, roomRequest, type RoomSession } from '../network/roomClient';
import type { PlayerAction } from '../types/game';

const controls: [PlayerAction,string][] = [['left','Izquierda'],['right','Derecha'],['jump','Saltar'],['down','Abajo'],['light','Golpe'],['heavy','Especial'],['dash','Esquivar'],['ult','Ultimate'],['reload','Recargar']];
export function NetworkPanel({canvas,onInput}:{canvas:RefObject<HTMLCanvasElement|null>;onInput:(actions:PlayerAction[])=>void}) {
  const [open,setOpen]=useState(()=>new URLSearchParams(location.search).has('room'));
  const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')||'');
  const [session,setSession]=useState<RoomSession|null>(null);
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [image,setImage]=useState(''); const held=useRef(new Set<PlayerAction>());
  const inputCallback=useRef(onInput); inputCallback.current=onInput;
  const queue=useRef(Promise.resolve());
  const send=(s:RoomSession,actions:PlayerAction[])=>{
    queue.current=queue.current.then(()=>roomRequest(`/${s.code}/input`,s,{actions})).catch(e=>setError(e.message));
  };
  useEffect(()=>{
    if(!session)return;
    const abort=new AbortController(); let sending=false;
    roomEvents(session,abort.signal,a=>inputCallback.current(a),setImage).catch(e=>{if(!abort.signal.aborted){held.current.clear();inputCallback.current([]);setError(e.message);}});
    const timer=window.setInterval(()=>{
      if(session.role==='guest'){send(session,[...held.current]);return;}
      if(!canvas.current||sending)return;
      sending=true;
      roomRequest(`/${session.code}/frame`,session,{image:canvas.current.toDataURL('image/jpeg',0.42)}).catch(e=>setError(e.message)).finally(()=>{sending=false;});
    },session.role==='guest'?200:150);
    const release=()=>{held.current.clear(); if(session.role==='guest')send(session,[]);else inputCallback.current([]);};
    const visibility=()=>{if(document.hidden)release();};
    window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);
    return()=>{abort.abort();clearInterval(timer);release();window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);};
  },[session,canvas]);
  const connect=async(host:boolean)=>{setBusy(true);setError('');try{setSession(await roomRequest(host?'':`/${code.trim().toUpperCase()}/join`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const leave=async()=>{if(!session)return;setBusy(true);try{await roomRequest(`/${session.code}`,session,undefined,'DELETE');setSession(null);held.current.clear();setImage('');inputCallback.current([]);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const press=(action:PlayerAction,active:boolean)=>{if(!session)return;if(active)held.current.add(action);else held.current.delete(action);send(session,[...held.current]);};
  if(!open)return <button className="network-launch" onClick={()=>setOpen(true)}>Conectar otra pantalla</button>;
  const link=session?`${location.origin}${import.meta.env.BASE_URL}?room=${session.code}`:'';
  return <section className={`network-panel ${session?.role==='guest'?'network-controller':''}`} aria-label="Sala entre pantallas">
    <div className="network-heading"><strong>APEX · MULTIPANTALLA</strong>{session?.role!=='guest'&&<button aria-label="Cerrar panel" onClick={()=>setOpen(false)}>×</button>}</div>
    {!session?<><p>Juega desde el equipo principal y conecta un móvil como mando de J2.</p><button disabled={busy} onClick={()=>connect(true)}>Crear sala</button><label>Código de sala<input value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="Código de 10 caracteres"/></label><button disabled={busy||code.trim().length!==10} onClick={()=>connect(false)}>Conectar como J2</button></>:<>
      <p>Sala <strong>{session.code}</strong> · {session.role==='host'?'Equipo principal':'Mando J2'}</p>
      {session.role==='host'?<><p>Abre este enlace en el móvil. En selección activa J1 vs J2 y comienza la partida; mantén esta pestaña visible.</p><input readOnly aria-label="Enlace para conectar el móvil" value={link} onFocus={e=>e.target.select()}/><button onClick={()=>navigator.clipboard?.writeText(link).catch(()=>setError('Selecciona y copia el enlace.'))}>Copiar enlace</button></>:<><p>El equipo principal inicia la partida en J1 vs J2. La vista remota se actualiza aproximadamente 6 veces por segundo.</p>{image?<img src={image} alt="Partida en el equipo principal" draggable={false}/>:<p>Esperando imagen del equipo principal…</p>}<div className="network-buttons">{controls.map(([action,label])=><button key={action} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);press(action,true);}} onPointerUp={()=>press(action,false)} onPointerCancel={()=>press(action,false)} onLostPointerCapture={()=>press(action,false)}>{label}</button>)}</div></>}
      <button disabled={busy} onClick={leave}>Salir de la sala</button>
    </>}
    {error&&<p role="alert" className="network-error">{error}</p>}
  </section>;
}
