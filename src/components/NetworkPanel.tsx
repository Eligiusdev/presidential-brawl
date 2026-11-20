import { useEffect, useRef, useState, type RefObject } from 'react';
import { roomEvents, roomRequest, type RoomSession, type RoomLobby } from '../network/roomClient';
import { PRESIDENTS_DATA } from '../data/presidents';
import { RoomCharacterSelect } from './CharacterSelect';
import { TouchControls } from './TouchControls';
import type { PlayerAction } from '../types/game';

const keyboard: Record<string, PlayerAction> = {
  ArrowLeft:'left', ArrowRight:'right', ArrowUp:'jump', ArrowDown:'down',
  KeyU:'light', KeyI:'heavy', KeyO:'dash', KeyM:'ult', Slash:'reload',
};
const FRAME_INTERVAL = 62;

export function NetworkPanel({canvas,onInput,hideLaunch,matchActive,onHostRoom,stage,onStage,onStart,showHostLobby,hostError}:{matchActive:boolean;stage:number;onStage:(index:number)=>void;onStart:()=>void;showHostLobby:boolean;hostError:string;onHostRoom:(room:RoomSession|null,lobby:RoomLobby)=>void;hideLaunch?:boolean;canvas:RefObject<HTMLCanvasElement|null>;onInput:(actions:PlayerAction[])=>void}) {
  const [lobby,setLobby]=useState<RoomLobby>({fighterId:null,hostFighterId:null,playing:false});
  const [pick,setPick]=useState("");
  const runningLobby=useRef(lobby.playing); runningLobby.current=lobby.playing;
  const running=useRef(matchActive); running.current=matchActive;
  const [open,setOpen]=useState(()=>new URLSearchParams(location.search).has('room'));
  const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')||'');
  const [session,setSession]=useState<RoomSession|null>(null);
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [image,setImage]=useState(''); const held=useRef(new Set<PlayerAction>());
  const touchHeld=useRef(new Set<PlayerAction>());
  const activeActions=()=>[...new Set([...held.current,...touchHeld.current])];
  const inputCallback=useRef(onInput); inputCallback.current=onInput;
  const sendingInput=useRef(false);
  const inputQueue=useRef<Array<{ session: RoomSession; actions: PlayerAction[] }>>([]);
  const autoStarted = useRef('');
  useEffect(() => {
    if (session?.role !== 'host' || lobby.playing || !lobby.hostFighterId || !lobby.fighterId) {
      autoStarted.current = '';
      return;
    }
    if (!showHostLobby) return;
    const key = [session.code, lobby.hostFighterId, lobby.fighterId].join(':');
    if (autoStarted.current === key) return;
    autoStarted.current = key;
    onStart();
  }, [session, lobby, showHostLobby, onStart]);
  useEffect(()=>onHostRoom(session?.role==='host'?session:null,lobby),[session,lobby,onHostRoom]);
  const send=(s:RoomSession,actions:PlayerAction[])=>{
    const pending=inputQueue.current;
    if(pending.length>=4) pending.splice(1,pending.length-1);
    pending.push({session:s,actions});
    if(sendingInput.current) return;
    sendingInput.current=true;
    void (async()=>{
      try {
        while(pending.length) {
          const next=pending.shift()!;
          await roomRequest(`/${next.session.code}/input`,next.session,{actions:next.actions});
        }
      } catch(e) {
        pending.length=0;
        setError((e as Error).message);
      } finally { sendingInput.current=false; }
    })();
  };
  useEffect(()=>{
    if(!session)return;
    const abort=new AbortController();
    let sending=false;
    let connected=false;
    let frameRtt=80;
    let retry: number | undefined;
    const frame=document.createElement('canvas');
    const ctx=frame.getContext('2d');
    const listen=()=>{
      roomEvents(session,abort.signal,a=>inputCallback.current(a),image=>{
        setImage(image);
        setError('');
      },presence=>{
        connected=presence;
        setError('');
      },next=>{
        setLobby(next);
        if(!next.playing) setImage('');
      }).catch(e=>{
        if(abort.signal.aborted)return;
        connected=false;
        held.current.clear(); touchHeld.current.clear();
        inputCallback.current([]);
        setError(e.message);
        retry=window.setTimeout(listen,2000);
      });
    };
    listen();
    const timer=window.setInterval(()=>{
      if(session.role==='guest'){if(runningLobby.current&&!sendingInput.current)send(session,activeActions());return;}
      const source=canvas.current;
      if(!source||!ctx||!connected||!running.current||sending||!source.width||!source.height)return;
      const width=Math.min(frameRtt>160 ? 440 : 640,source.width);
      const height=Math.max(1, Math.round(source.height*width/source.width));
      if(frame.width!==width||frame.height!==height){frame.width=width;frame.height=height;}
      ctx.drawImage(source,0,0,width,height);
      sending=true;
      const start=performance.now();
      frame.toBlob(blob=>{
        if(!blob || abort.signal.aborted || !running.current) { sending=false; return; }
        const reader=new FileReader();
        reader.onerror=()=>{sending=false;};
        reader.onload=()=>{
          if(abort.signal.aborted || !running.current) { sending=false; return; }
          roomRequest(`/${session.code}/frame`,session,{image:reader.result})
            .then(()=>{frameRtt=frameRtt*.75+(performance.now()-start)*.25;})
            .catch(e=>setError(e.message)).finally(()=>{sending=false;});
        };
        reader.readAsDataURL(blob);
      },'image/jpeg',frameRtt>160 ? 0.41 : 0.5);
    },session.role==='guest'?200:FRAME_INTERVAL);
    const release=()=>{held.current.clear(); touchHeld.current.clear(); if(session.role==='guest')send(session,[]);else inputCallback.current([]);};
    const visibility=()=>{if(document.hidden)release();};
    const handleKey=(event:KeyboardEvent)=>{
      if(session.role!=='guest'||!runningLobby.current||event.repeat||!keyboard[event.code]) return;
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
      inputQueue.current.length=0;
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
  const leave=async()=>{if(!session)return;setBusy(true);try{await roomRequest(`/${session.code}`,session,undefined,'DELETE');setSession(null);setLobby({fighterId:null,hostFighterId:null,playing:false});setPick('');held.current.clear(); touchHeld.current.clear();setImage('');inputCallback.current([]);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const confirmFighter=async()=>{
    if(!session || !pick) return;
    setBusy(true);
    setError('');
    try { setLobby(await roomRequest(`/${session.code}/fighter`,session,{fighterId:pick})); }
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };
  const press=(action:PlayerAction,active:boolean)=>{if(!session)return;if(active)touchHeld.current.add(action);else touchHeld.current.delete(action);send(session,activeActions());};
  if(!open)return hideLaunch ? null : <button className="network-launch" onClick={()=>setOpen(true)}>Jugar en línea</button>;
  const link=session?`${location.origin}${import.meta.env.BASE_URL}?room=${session.code}`:'';
  if(session&&!lobby.playing&&(session.role==='guest'||showHostLobby)) {
    const isHost=session.role==='host';
    return <RoomCharacterSelect roster={PRESIDENTS_DATA} roomCode={session.code} seat={isHost?1:2}
      pickedId={pick} confirmedId={isHost?lobby.hostFighterId:lobby.fighterId}
      otherId={isHost?lobby.fighterId:lobby.hostFighterId} busy={busy} error={error||(isHost?hostError:'')}
      onPick={setPick} onConfirm={confirmFighter} onLeave={leave}
      hostOptions={isHost?{link,stage,onStage,onStart,onCopy:()=>{
        navigator.clipboard?.writeText(link).catch(()=>setError('Selecciona y copia el enlace.'));
      }}:undefined} />;
  }
  if(session?.role==='host') return null;
  return <section className={`network-panel ${session?.role==='guest'&&lobby.playing?'network-controller':''}`} aria-label="Sala en línea">
    <div className="network-heading"><strong>APEX · SALA EN LÍNEA</strong>{session?.role!=='guest'&&<button aria-label="Cerrar panel" onClick={()=>setOpen(false)}>×</button>}</div>
    {!session?<><p>Crea un duelo para dos jugadores y comparte el enlace con tu rival.</p><button disabled={busy} onClick={()=>connect(true)}>Crear sala</button><label>Código de sala<input value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="Código de 10 caracteres"/></label><button disabled={busy||code.trim().length!==10} onClick={()=>connect(false)}>Conectar como J2</button></>:<>
      <p>Sala <strong>{session.code}</strong> · {session.role==='host'?'Equipo principal':'Mando J2'}</p>
<><p>El anfitrión inicia la partida. Usa los controles táctiles o las flechas y U, I, O, M y /.</p>{image?<img src={image} alt="Partida en el equipo principal" draggable={false}/>:<p className="network-wait">Esperando imagen del equipo principal…</p>}<TouchControls inline onAction={press} /></>
      <button disabled={busy} onClick={leave}>Salir de la sala</button>
    </>}
    {busy && !session && <p role="status">Conectando al servidor…</p>}
    {error&&<p role="alert" className="network-error">{error}</p>}
  </section>;
}
