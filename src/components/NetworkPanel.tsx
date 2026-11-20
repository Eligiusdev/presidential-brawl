import { useEffect, useRef, useState } from 'react';
import { roomEvents, roomRequest, type RoomSession, type RoomLobby } from '../network/roomClient';
import { PRESIDENTS_DATA } from '../data/presidents';
import { RoomCharacterSelect } from './CharacterSelect';
import type { PlayerAction } from '../types/game';

export function NetworkPanel({onInput,getLocalActions,hideLaunch,matchActive,onHostRoom,onGuestLobby,stage,onStage,onStart,showHostLobby,hostError}:{
  matchActive:boolean;stage:number;onStage:(index:number)=>void;onStart:()=>void;showHostLobby:boolean;hostError:string;
  onHostRoom:(room:RoomSession|null,lobby:RoomLobby)=>void;
  onGuestLobby:(room:RoomSession|null,lobby:RoomLobby)=>void;
  hideLaunch?:boolean;
  onInput:(actions:PlayerAction[],pi:0|1)=>void;
  getLocalActions:(pi:0|1)=>PlayerAction[];
}) {
  const [lobby,setLobby]=useState<RoomLobby>({fighterId:null,hostFighterId:null,playing:false,stageIdx:0,seed:0,stocks:3});
  const [pick,setPick]=useState("");
  const runningLobby=useRef(lobby.playing); runningLobby.current=lobby.playing;
  const running=useRef(matchActive); running.current=matchActive;
  const [open,setOpen]=useState(()=>new URLSearchParams(location.search).has('room'));
  const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')||'');
  const [session,setSession]=useState<RoomSession|null>(null);
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const inputCallback=useRef(onInput); inputCallback.current=onInput;
  const localActions=useRef(getLocalActions); localActions.current=getLocalActions;
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
  useEffect(()=>onGuestLobby(session?.role==='guest'?session:null,lobby),[session,lobby,onGuestLobby]);
  const send=(s:RoomSession,actions:PlayerAction[])=>{
    const pending=inputQueue.current;
    if(pending.length>=3) pending.splice(0,pending.length,pending[pending.length-1] ?? {session:s,actions});
    pending[pending.length-1]={session:s,actions};
    if(sendingInput.current) return;
    sendingInput.current=true;
    void (async()=>{
      try {
        while(pending.length) {
          const next=pending[pending.length-1];
          pending.length=0;
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
    let connected=false;
    let retry: number | undefined;
    const listen=()=>{
      roomEvents(session,abort.signal,a=>{
        inputCallback.current(a, session.role==='host' ? 1 : 0);
      },()=>{},presence=>{
        connected=presence;
        if(!presence) inputCallback.current([], session.role==='host' ? 1 : 0);
        setError('');
      },next=>{
        setLobby(next);
      }).catch(e=>{
        if(abort.signal.aborted)return;
        connected=false;
        inputCallback.current([], session.role==='host' ? 1 : 0);
        setError(e.message);
        retry=window.setTimeout(listen,1200);
      });
    };
    listen();
    const timer=window.setInterval(()=>{
      if(!runningLobby.current || !connected) return;
      const pi = session.role==='host' ? 0 : 1;
      send(session, localActions.current(pi));
    }, session.role==='guest' ? 80 : 80);
    return()=>{
      abort.abort();
      clearTimeout(retry);
      inputQueue.current.length=0;
      clearInterval(timer);
      inputCallback.current([], session.role==='host' ? 1 : 0);
    };
  },[session]);
  const connect=async(host:boolean)=>{setBusy(true);setError('');try{setSession(await roomRequest(host?'':`/${code.trim().toUpperCase()}/join`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const leave=async()=>{if(!session)return;setBusy(true);try{await roomRequest(`/${session.code}`,session,undefined,'DELETE');setSession(null);setLobby({fighterId:null,hostFighterId:null,playing:false,stageIdx:0,seed:0,stocks:3});setPick('');inputCallback.current([], session.role==='host'?1:0);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const confirmFighter=async()=>{
    if(!session || !pick) return;
    setBusy(true);
    setError('');
    try { setLobby(await roomRequest(`/${session.code}/fighter`,session,{fighterId:pick})); }
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };
  if(!open)return hideLaunch ? null : <button className="network-launch" onClick={()=>setOpen(true)}>Jugar en línea</button>;
  const link=session?`${location.origin}${import.meta.env.BASE_URL}?room=${session.code}`:'';
  if(session && !lobby.playing && (session.role==='guest' || showHostLobby)) {
    const isHost=session.role==='host';
    return <RoomCharacterSelect roster={PRESIDENTS_DATA} roomCode={session.code} seat={isHost?1:2}
      pickedId={pick} confirmedId={isHost?lobby.hostFighterId:lobby.fighterId}
      otherId={isHost?lobby.fighterId:lobby.hostFighterId} busy={busy} error={error||(isHost?hostError:'')}
      onPick={setPick} onConfirm={confirmFighter} onLeave={leave}
      hostOptions={isHost?{link,stage,onStage,onStart,onCopy:()=>{
        navigator.clipboard?.writeText(link).catch(()=>setError('Selecciona y copia el enlace.'));
      }}:undefined} />;
  }
  if(session?.role==='host' || (session?.role==='guest' && lobby.playing)) return null;
  return <section className="network-panel" aria-label="Sala en línea">
    <div className="network-heading"><strong>APEX · SALA EN LÍNEA</strong>{session?.role!=='guest'&&<button aria-label="Cerrar panel" onClick={()=>setOpen(false)}>×</button>}</div>
    {!session?<><p>Crea un duelo para dos jugadores y comparte el enlace con tu rival.</p><button disabled={busy} onClick={()=>connect(true)}>Crear sala</button><label>Código de sala<input value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="Código de 10 caracteres"/></label><button disabled={busy||code.trim().length!==10} onClick={()=>connect(false)}>Conectar como J2</button></>:<>
      <p>Sala <strong>{session.code}</strong> · Mando J2</p>
      <p>Confirmaste tu luchador. Esperando a que el anfitrión inicie la partida…</p>
      <button disabled={busy} onClick={leave}>Salir de la sala</button>
    </>}
    {busy && !session && <p role="status">Conectando al servidor…</p>}
    {error&&<p role="alert" className="network-error">{error}</p>}
  </section>;
}
TS
