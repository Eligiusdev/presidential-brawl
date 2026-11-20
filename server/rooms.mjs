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
  const emit = (room, role, event, data) => {
    const client = room[role];
    if (client && !client.destroyed && !client.writableNeedDrain) client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const notifyGuest = room => emit(room,'host','presence',Boolean(room.guest));
  const lobby = room => ({ fighterId: room.fighterId, playing: room.playing });
  const waitingLobby = new WeakSet();
  const notifyLobby = room => {
    for (const role of ['host', 'guest']) {
      const client = room[role];
      if (!client) continue;
      if (!client.writableNeedDrain) {
        emit(room,role,'lobby',lobby(room));
      } else if (!waitingLobby.has(client)) {
        waitingLobby.add(client);
        client.once('drain', () => {
          waitingLobby.delete(client);
          if (room[role] === client) emit(room,role,'lobby',lobby(room));
        });
      }
    }
  };
  const release = room => { room.input=[]; emit(room,'host','input',[]); };
  app.post('/api/rooms', (req,res) => {
    if (rooms.size >= 100) return res.status(429).json({error:'No hay salas disponibles'});
    let code;
    do { code=randomBytes(5).toString('hex').toUpperCase(); } while(rooms.has(code));
    const room={hostToken:token(),guestToken:null,fighterId:null,playing:false,updated:Date.now(),lastInput:0,lastFrame:0,input:[],frame:null,host:null,guest:null};
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
    } else {
      notifyGuest(room);
    }
    emit(room,role,'lobby',lobby(room));
    if (role==='host' && room.input.length) emit(room,'host','input',room.input);
    req.on('close',()=>{
      if (room[role]!==res) return;
      room[role]=null;
      release(room);
      if (role==='guest') {
        room.frame=null;
        notifyGuest(room);
      }
    });
  });
  app.post('/api/rooms/:code/fighter',(req,res)=>{
    if(req.role!=='guest') return res.sendStatus(403);
    const id=req.body?.fighterId;
    if(typeof id!=='string'||!/^[a-z0-9_-]{1,48}$/.test(id)) return res.sendStatus(400);
    if(req.room.playing) return res.status(409).json({error:'El combate ya empezó'});
    req.room.fighterId=id;
    notifyLobby(req.room);
    res.json(lobby(req.room));
  });
  app.post('/api/rooms/:code/match',(req,res)=>{
    if(req.role!=='host') return res.sendStatus(403);
    const playing=req.body?.playing;
    if(typeof playing!=='boolean') return res.sendStatus(400);
    if(playing && (!req.room.guest || !req.room.fighterId)) {
      return res.status(409).json({error:'Espera a que J2 confirme su luchador'});
    }
    if(!playing) req.room.frame=null;
    req.room.playing=playing;
    notifyLobby(req.room);
    res.json(lobby(req.room));
  });
  app.post('/api/rooms/:code/input',(req,res)=>{
    if(req.role!=='guest') return res.sendStatus(403);
    const input=req.body?.actions;
    if(!Array.isArray(input)||input.length>9||input.some(a=>!actions.has(a))) return res.sendStatus(400);
    req.room.input=[...new Set(input)]; req.room.lastInput=Date.now();
    emit(req.room,'host','input',req.room.input); res.sendStatus(204);
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
    release(room);
    if(req.role==='host') { room.host?.end(); room.guest?.end(); rooms.delete(req.params.code); }
    else {room.guest?.end(); room.guest=null; room.guestToken=null; room.fighterId=null; room.playing=false; room.frame=null; notifyGuest(room); notifyLobby(room);}
    res.sendStatus(204);
  });
  let lastHeartbeat = 0;
  const timer=setInterval(()=>{
    const now=Date.now();
    const heartbeat = now - lastHeartbeat >= 15000;
    if (heartbeat) lastHeartbeat = now;
    for(const [code,room] of rooms) {
      if(room.input.length && now-room.lastInput>700) release(room);
      if(now-room.updated>30*60*1000) {room.host?.end(); room.guest?.end(); rooms.delete(code);}
      else if (heartbeat) { for(const role of ['host','guest']) if(room[role]&&!room[role].writableNeedDrain) room[role].write(': heartbeat\n\n'); }
    }
  },250);
  timer.unref();
  app.locals.dispose=()=>{clearInterval(timer); for(const room of rooms.values()){room.host?.end();room.guest?.end();} rooms.clear();};
  app.use((err,req,res,next)=>res.status(err.status || 500).json({error:'Solicitud no válida'}));
  return app;
}
