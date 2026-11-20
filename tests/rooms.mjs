import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomsApp} from '../server/rooms.mjs';
test('salas: acceso, mando exclusivo, transmisión, liberación y cierre',async()=>{
  const app=createRoomsApp({allowedOrigins:'https://eligiusdev.github.io'}); const server=app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api/rooms`;
  const call=(path='',auth,body,method='POST')=>fetch(base+path,{method,headers:{'content-type':'application/json',...(auth?{authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  let reader, remoteReader;
  try{
    const preflight=await fetch(base,{method:'OPTIONS',headers:{origin:'https://eligiusdev.github.io','access-control-request-method':'POST','access-control-request-headers':'authorization,content-type'}});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),'https://eligiusdev.github.io');
    assert.match(preflight.headers.get('access-control-allow-headers'),/Authorization/i);
    const host=await (await call()).json();
    const guest=await (await call(`/${host.code}/join`)).json();
    assert.equal((await call(`/${host.code}/join`)).status,409);
    assert.equal((await call(`/${host.code}/input`,undefined,{actions:['light']})).status,401);
    assert.equal((await call(`/${host.code}/input`,host.token,{actions:['light']})).status,403);
    assert.equal((await call(`/${host.code}/input`,guest.token,{actions:['cheat']})).status,400);
    const stream=await call(`/${host.code}/events`,host.token,undefined,'GET');
    reader=stream.body.getReader(); const decoder=new TextDecoder();
    await reader.read();
    assert.equal((await call(`/${host.code}/input`,guest.token,{actions:['right','light']})).status,204);
    let received='';
    while(!received.includes('event: input'))received+=decoder.decode((await reader.read()).value);
    assert.match(received,/\["right","light"\]/);
    received='';
    while(!received.includes('data: []'))received+=decoder.decode((await reader.read()).value);
    assert.match(received,/data: \[\]/); // Se suelta automáticamente si el móvil desaparece.
    assert.equal((await call(`/${host.code}/frame`,guest.token,{image:'data:image/jpeg;base64,AA=='})).status,403);
    assert.equal((await call(`/${host.code}/frame`,host.token,{image:'https://example.com'})).status,400);
    const otherHost=await (await call()).json();
    const otherGuest=await (await call(`/${otherHost.code}/join`)).json();
    assert.equal((await call(`/${host.code}/input`,otherGuest.token,{actions:['jump']})).status,401);
    const remote=await call(`/${host.code}/events`,guest.token,undefined,'GET');
    remoteReader=remote.body.getReader();
    await remoteReader.read();
    received='';
    while(!received.includes('event: presence')) received+=decoder.decode((await reader.read()).value);
    assert.match(received,/data: true/);
    const matchPath=`/${host.code}/match`, fighterPath=`/${host.code}/fighter`;
    assert.equal((await call(matchPath,host.token,{playing:true})).status,409);
    assert.equal((await call(fighterPath,host.token,{fighterId:'aquiles'})).status,200);
    assert.equal((await call(matchPath,host.token,{playing:true})).status,409);
    assert.equal((await call(matchPath,guest.token,{playing:true})).status,403);
    assert.equal((await call(fighterPath,guest.token,{fighterId:'<invalid>'})).status,400);
    assert.deepEqual(await (await call(fighterPath,guest.token,{fighterId:'musashi'})).json(),
      {fighterId:'musashi',hostFighterId:'aquiles',playing:false});
    received='';
    while(!received.includes('"fighterId":"musashi"')) received+=decoder.decode((await reader.read()).value);
    assert.match(received,/event: lobby/);
    assert.deepEqual(await (await call(matchPath,host.token,{playing:true})).json(),
      {fighterId:'musashi',hostFighterId:'aquiles',playing:true});
    assert.equal((await call(fighterPath,guest.token,{fighterId:'bukele'})).status,409);
    assert.equal((await call(matchPath,host.token,{playing:false})).status,200);
    assert.equal((await call(fighterPath,guest.token,{fighterId:'bukele'})).status,200);
    assert.equal((await call(`/${host.code}/frame`,host.token,{image:'data:image/jpeg;base64,AA=='})).status,204);
    let frames='';
    while(!frames.includes('event: frame')) frames+=decoder.decode((await remoteReader.read()).value);
    assert.match(frames,/data:image\/jpeg;base64,AA==/);
    assert.equal((await call(`/${host.code}`,guest.token,undefined,'DELETE')).status,204);
    const second=await (await call(`/${host.code}/join`)).json(); assert.notEqual(second.token,guest.token);
    assert.equal((await call(`/${host.code}/input`,guest.token,{actions:[]})).status,401);
    assert.equal((await call(`/${host.code}`,host.token,undefined,'DELETE')).status,204);
    assert.equal((await call(`/${host.code}/join`)).status,404);
    assert.equal((await fetch(base,{method:'POST',headers:{origin:'https://other.example'}})).status,403);
  }finally{await reader?.cancel();await remoteReader?.cancel();app.locals.dispose();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
