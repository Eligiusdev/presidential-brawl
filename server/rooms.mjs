import express from 'express';
import { randomBytes } from 'node:crypto';

const actions = new Set(['left','right','jump','down','light','heavy','dash','ult','reload']);
const token = () => randomBytes(24).toString('hex');

export function createRoomsApp({allowedOrigins = process.env.ALLOWED_ORIGINS ?? ''} = {}) {
  const app = express();
  const rooms = new Map();
  const corsOrigins = new Set(allowedOrigins.split(',').map(origin => origin.trim()).filter(Boolean));
  app.disable('x-powered-by');
  app.use('/api', (req,res,next) => {
    res.set('Cache-Control','no-store');
    const origin = req.get('origin');
    if (origin) {
      let sameHost = false;
      try {
        sameHost = new URL(origin).host === req.get('host');
      } catch {
        return res.status(403).json({error:'Origen no permitido'});
      }
      if (!sameHost && !corsOrigins.has(origin)) return res.status(403).json({error:'Origen no permitido'});
      res.set('Access-Control-Allow-Origin',origin);
      res.vary('Origin');
      res.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({limit:'180kb'}));

  const outbox = new WeakMap();
  const flush = res => {
    const box = outbox.get(res);
    if (!box || res.destroyed) return;
    while (box.queue.length) {
      const item = box.queue[0];
      const payload = `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`;
      const ok = res.write(payload);
      box.queue.shift();
      box.keys.delete(item.event);
      if (!ok || res.writableNeedDrain) {
        if (!box.waitingDrain) {
          box.waitingDrain = true;
          res.once('drain', () => {
            box.waitingDrain = false;
            flush(res);
          });
        }
        return;
      }
    }
  };
  const send = (res, event, data) => {
    if (!res || res.destroyed) return;
    let box = outbox.get(res);
    if (!box) {
      box = { queue: [], keys: new Map(), waitingDrain: false };
      outbox.set(res, box);
    }
    if (box.keys.has(event)) {
      box.queue[box.keys.get(event)].data = data;
    } else {
      box.keys.set(event, box.queue.length);
      box.queue.push({ event, data });
    }
    if (!res.writableNeedDrain) flush(res);
    else if (!box.waitingDrain) {
      box.waitingDrain = true;
      res.once('drain', () => {
        box.waitingDrain = false;
        flush(res);
      });
    }
  };
  const emit = (room, role, event, data) => send(room[role], event, data);
  const notifyGuest = room => emit(room,'host','presence',Boolean(room.guest));
  const lobby = room => ({ fighterId: room.fighterId, hostFighterId: room.hostFighterId, playing: room.playing, stageIdx: room.stageIdx ?? 0, seed: room.seed ?? 0, stocks: room.stocks ?? 3 });
  const notifyLobby = room => {
    for (const role of ['host', 'guest']) emit(room, role, 'lobby', lobby(room));
  };
  const releaseGuestInput = room => { room.input=[]; emit(room,'host','input',[]); };
  const releaseHostInput = room => { room.hostInput=[]; emit(room,'guest','input',[]); };

  app.post('/api/rooms', (req,res) => {
    if (rooms.size >= 100) return res.status(429).json({error:'No hay salas disponibles'});
    let code;
    do { code=randomBytes(5).toString('hex').toUpperCase(); } while(rooms.has(code));
    const room={hostToken:token(),guestToken:null,fighterId:null,hostFighterId:null,playing:false,stageIdx:0,seed:0,stocks:3,updated:Date.now(),lastInput:0,lastHostInput:0,lastFrame:0,input:[],hostInput:[],frame:null,host:null,guest:null};
    rooms.set(code,room);
    res.status(201).json({code,token:room.hostToken,role:'host'});
  });
  app.post('/api/rooms/:code/join', (req,res) => {
    const room=rooms.get(req.params.code);
    if(!room) return res.status(404).json({error:'La sala no existe o caducó'});
    if(room.guestToken) return res.status(409).json({error:'La sala ya tiene un mando conectado'});
    room.guestToken=token(); room.updated=Date.now();
    res.json({code:req.params.code,token:room.guestToken,role:'guest'});
  });
  app.use('/api/rooms/:code', (req,res,next) => {
    const room=rooms.get(req.params.code);
    if(!room) return res.status(404).json({error:'La sala ha caducado'});
    const auth=req.get('authorization')?.replace(/^Bearer /,'');
    const role=auth===room.hostToken?'host':auth && auth===room.guestToken?'guest':null;
    if(!role) return res.status(401).json({error:'Acceso no autorizado'});
    req.room=room; req.role=role; room.updated=Date.now(); next();
  });
  app.get('/api/rooms/:code/events',(req,res)=>{
    const room=req.room, role=req.role;
    if(room[role]) room[role].end();
    res.set({'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.flushHeaders(); room[role]=res;
    res.write(': connected\n\n');
    if (role==='guest') {
      if (room.frame) emit(room,'guest','frame',{image:room.frame});
      notifyGuest(room);
      if (room.hostInput.length) emit(room,'guest','input',room.hostInput);
    } else {
      notifyGuest(room);
      if (room.input.length) emit(room,'host','input',room.input);
    }
    emit(room,role,'lobby',lobby(room));
    req.on('close',()=>{
      if (room[role]!==res) return;
      room[role]=null;
      if (role==='guest') {
        releaseGuestInput(room);
        room.frame=null;
        notifyGuest(room);
      } else {
        releaseHostInput(room);
      }
    });
  });
  app.post('/api/rooms/:code/fighter',(req,res)=>{
    const id=req.body?.fighterId;
    if(typeof id!=='string'||!/^[a-z0-9_-]{1,48}$/.test(id)) return res.sendStatus(400);
    if(req.room.playing) return res.status(409).json({error:'El combate ya empezó'});
    if (req.role === 'host') req.room.hostFighterId=id;
    else req.room.fighterId=id;
    notifyLobby(req.room);
    res.json(lobby(req.room));
  });
  app.post('/api/rooms/:code/match',(req,res)=>{
    if(req.role!=='host') return res.sendStatus(403);
    const playing=req.body?.playing;
    if(typeof playing!=='boolean') return res.sendStatus(400);
    if(playing && (!req.room.guest || !req.room.fighterId || !req.room.hostFighterId)) {
      return res.status(409).json({error:'Ambos jugadores deben confirmar su luchador'});
    }
    if(playing) {
      req.room.stageIdx = Number.isInteger(req.body?.stageIdx) ? req.body.stageIdx : (req.room.stageIdx ?? 0);
      req.room.seed = Number.isInteger(req.body?.seed) ? (req.body.seed >>> 0) : ((Math.random()*0x7fffffff)>>>0 || 1);
      req.room.stocks = Math.min(5, Math.max(1, Number.isInteger(req.body?.stocks) ? req.body.stocks : (req.room.stocks ?? 3)));
    }
    if(!playing) {
      req.room.frame=null;
      req.room.fighterId=null;
      req.room.hostFighterId=null;
      req.room.seed=0;
      releaseGuestInput(req.room);
      releaseHostInput(req.room);
    }
    req.room.playing=playing;
    notifyLobby(req.room);
    res.json(lobby(req.room));
  });
  app.post('/api/rooms/:code/input',(req,res)=>{
    const input=req.body?.actions;
    if(!Array.isArray(input)||input.length>9||input.some(a=>!actions.has(a))) return res.sendStatus(400);
    const cleaned=[...new Set(input)];
    req.room.updated=Date.now();
    if (req.role === 'guest') {
      req.room.input=cleaned; req.room.lastInput=Date.now();
      emit(req.room,'host','input',cleaned);
    } else {
      req.room.hostInput=cleaned; req.room.lastHostInput=Date.now();
      emit(req.room,'guest','input',cleaned);
    }
    res.sendStatus(204);
  });
  app.post('/api/rooms/:code/frame',(req,res)=>{
    if(req.role!=='host') return res.sendStatus(403);
    const image=req.body?.image;
    if(typeof image!=='string'||image.length>170000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return res.sendStatus(400);
    const room=req.room;
    const now=Date.now();
    if (room.guest && now-room.lastFrame>=40) {
      room.lastFrame=now;
      room.frame=image;
      emit(room,'guest','frame',{image});
    }
    res.sendStatus(204);
  });
  app.delete('/api/rooms/:code',(req,res)=>{
    const room=req.room;
    releaseGuestInput(room);
    releaseHostInput(room);
    if(req.role==='host') { room.host?.end(); room.guest?.end(); rooms.delete(req.params.code); }
    else {room.guest?.end(); room.guest=null; room.guestToken=null; room.fighterId=null; room.hostFighterId=null; room.playing=false; room.frame=null; room.seed=0; notifyGuest(room); notifyLobby(room);}
    res.sendStatus(204);
  });

  let lastHeartbeat = 0;
  const timer=setInterval(()=>{
    const now=Date.now();
    const heartbeat = now - lastHeartbeat >= 15000;
    if (heartbeat) lastHeartbeat = now;
    for(const [code,room] of rooms) {
      if(room.input.length && now-room.lastInput>700) releaseGuestInput(room);
      if(room.hostInput.length && now-room.lastHostInput>700) releaseHostInput(room);
      if(now-room.updated>30*60*1000) {room.host?.end(); room.guest?.end(); rooms.delete(code);}
      else if (heartbeat) {
        for(const role of ['host','guest']) {
          const res = room[role];
          if(res && !res.destroyed && !res.writableNeedDrain) res.write(': heartbeat\n\n');
        }
      }
    }
  },250);
  timer.unref();
  app.locals.dispose=()=>{clearInterval(timer); for(const room of rooms.values()){room.host?.end();room.guest?.end();} rooms.clear();};
  app.use((err,req,res,next)=>res.status(err.status || 500).json({error:'Solicitud no válida'}));
  return app;
}
