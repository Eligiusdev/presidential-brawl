import type { PlayerAction } from '../types/game';
export type RoomSession = {code:string;token:string;role:'host'|'guest'};
export async function roomRequest(path:string, session?:RoomSession, body?:unknown, method = 'POST') {
  const res=await fetch('/api/rooms'+path,{method,headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  if(!res.ok) {let error='No se pudo conectar al backend. Inicia npm run dev:server o npm start.'; try {error=(await res.json()).error||error;} catch{} throw new Error(error);}
  return res.status===204 ? null : res.json();
}
export async function roomEvents(session:RoomSession, signal:AbortSignal, onInput:(actions:PlayerAction[])=>void,onFrame:(image:string)=>void) {
  const response=await fetch(`/api/rooms/${session.code}/events`,{headers:{Authorization:`Bearer ${session.token}`},signal});
  if(!response.ok||!response.body) throw new Error('La sala no está disponible');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let pending='';
  while(true){const {value,done}=await reader.read(); if(done) throw new Error('Se perdió la conexión con la sala'); pending+=decoder.decode(value,{stream:true}); let end;
    while((end=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,end);pending=pending.slice(end+2);const event=block.split('\n').find(l=>l.startsWith('event: '))?.slice(7);const data=block.split('\n').find(l=>l.startsWith('data: '))?.slice(6);if(data){if(event==='input')onInput(JSON.parse(data));if(event==='frame')onFrame(JSON.parse(data).image);}}
  }
}
