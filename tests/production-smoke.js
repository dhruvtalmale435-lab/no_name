import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {openDb} from '../server/db.js';
import {seed} from '../server/seed.js';
const folder=mkdtempSync(join(tmpdir(),'institution360-production-')),path=join(folder,'smoke.sqlite');
const db=openDb(path);seed(db,'ProductionSmokePassword!');db.close();
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,NODE_ENV:'production',DEMO_MODE:'false',PORT:'3201',HOST:'127.0.0.1',DATABASE_PATH:path},stdio:['ignore','pipe','pipe']});
try {
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Production startup timed out')),15000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Production process exited '+code));});child.stdout.on('data',data=>{if(String(data).includes('listening')){clearTimeout(timeout);resolve();}});});
  const base='http://127.0.0.1:3201';
  const health=await fetch(base+'/api/health');assert.equal((await health.json()).status,'ok');
  const page=await fetch(base+'/');assert.equal(page.status,200);const html=await page.text();assert.match(html,/Institution 360/);assert.match(page.headers.get('content-security-policy'),/default-src/);
  const asset=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(new URL(asset, base + '/').href)).status,200);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@demo.local',password:'ProductionSmokePassword!'})});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/Secure/);assert.match(login.headers.get('set-cookie'),/HttpOnly/);
  console.log('PASS: production startup, DB health, built HTML/assets, CSP and Secure/HttpOnly session cookie');
} finally {child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(folder,{recursive:true,force:true});}
