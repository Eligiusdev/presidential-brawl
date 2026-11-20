import type { PlayerAction } from '../types/game';
export type RoomLobby = { fighterId: string | null; hostFighterId: string | null; playing: boolean; stageIdx?: number; seed?: number; stocks?: number };
export type RoomVideoSignal =
  | { type: 'offer' | 'answer'; sdp: string; negotiation: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; negotiation: string };
export type RoomSession = {code:string;token:string;role:'host'|'guest'};
const localHost = /^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/;
export const localRoomServer = localHost.test(location.hostname);
const apiBase = localRoomServer ? '' : (import.meta.env.VITE_ROOM_API_BASE_URL || '').replace(/\/+$/, '');
const roomsUrl=(path:string)=>`${apiBase}/api/rooms${path}`;
export async function roomRequest(path:string, session?:RoomSession, body?:unknown, method = 'POST') {
  const res=await fetch(roomsUrl(path),{method,signal:AbortSignal.timeout(session ? 5000 : 65000),headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  if(!res.ok) {let error='No se pudo conectar al backend. Comprueba que el servicio de salas esté en línea.'; try {error=(await res.json()).error||error;} catch{} throw new Error(error);}
  return res.status===204 ? null : res.json();
}
export async function roomEvents(session:RoomSession, signal:AbortSignal, onInput:(actions:PlayerAction[])=>void,onFrame:(image:string)=>void,onPresence:(connected:boolean)=>void,onLobby:(lobby:RoomLobby)=>void,onVideo:(signal:RoomVideoSignal)=>void) {
  const response=await fetch(roomsUrl(`/${session.code}/events`),{headers:{Authorization:`Bearer ${session.token}`},signal});
  if(!response.ok||!response.body) throw new Error('La sala no está disponible');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let pending='';
  while(true){const {value,done}=await reader.read(); if(done) throw new Error('Se perdió la conexión con la sala'); pending+=decoder.decode(value,{stream:true}); let end;
    while((end=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,end);pending=pending.slice(end+2);const event=block.split('\n').find(l=>l.startsWith('event: '))?.slice(7);const data=block.split('\n').find(l=>l.startsWith('data: '))?.slice(6);if(data){if(event==='input')onInput(JSON.parse(data));if(event==='frame')onFrame(JSON.parse(data).image);if(event==='presence')onPresence(JSON.parse(data));if(event==='lobby')onLobby(JSON.parse(data));if(event==='video')onVideo(JSON.parse(data));}}
  }
}
