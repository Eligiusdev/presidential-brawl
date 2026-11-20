import express from 'express';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRoomsApp } from './rooms.mjs';
const app=createRoomsApp();
const port=Number(process.env.PORT) || (process.argv.includes('--dev') ? 3001 : 3000);
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
app.get('/health',(_req,res)=>res.status(200).json({status:'ok'}));
app.use(express.static(dist));
app.get('*',(req,res)=>res.sendFile(`${dist}/index.html`));
app.listen(port,'0.0.0.0',()=>{
  console.log(`Presidential Brawl: http://localhost:${port}`);
  if (process.env.RENDER) return;
  try {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const ip of addresses ?? []) {
        if (!ip.internal && ip.family==='IPv4') console.log(`Red local: http://${ip.address}:${port}`);
      }
    }
  } catch {
    console.log(`Red local: abre http://IP_DEL_ANFITRION:${port} desde el otro equipo.`);
  }
});
