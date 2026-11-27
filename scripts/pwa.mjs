import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
// Generate real PNG icons without runtime dependencies.
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function chunk(t,b){const name=Buffer.from(t), n=Buffer.alloc(4), tail=Buffer.alloc(4);n.writeUInt32BE(b.length);tail.writeUInt32BE(crc(Buffer.concat([name,b])));return Buffer.concat([n,name,b,tail])}
function icon(n){const raw=Buffer.alloc(n*(n*4+1));const lines=[[142,366,165,280],[165,280,316,129],[316,129,354,129],[354,129,383,158],[383,158,383,196],[383,196,232,347],[232,347,142,366],[165,280,232,347],[295,150,362,217]];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const px=x*512/n,py=y*512/n;let hit=false;for(const [a,b,c,d] of lines){const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((px-a)*dx+(py-b)*dy)/(dx*dx+dy*dy)));if(Math.hypot(px-a-t*dx,py-b-t*dy)<11){hit=true;break}}const i=y*(n*4+1)+1+x*4;raw.set(hit?[241,241,237,255]:[32,33,36,255],i)}const h=Buffer.alloc(13);h.writeUInt32BE(n,0);h.writeUInt32BE(n,4);h[8]=8;h[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
for(const n of [192,512])await writeFile('dist/icon-'+n+'.png',icon(n));
async function walk(dir,prefix=''){let out=[];for(const d of await readdir(dir,{withFileTypes:true})){if(d.name==='sw.js')continue;const p=prefix+d.name;out.push(...(d.isDirectory()?await walk(join(dir,d.name),p+'/'):[p]))}return out}
const paths=(await walk('dist')).sort(), hash=createHash('sha256');for(const p of paths)hash.update(await readFile(join('dist',p)));
const key='sketchnote-'+hash.digest('hex').slice(0,16);
await writeFile('dist/sw.js', 'const KEY='+JSON.stringify(key)+';const FILES='+JSON.stringify(['./',...paths.map(p=>'./'+p)])+';\n'+
"self.addEventListener('install',e=>e.waitUntil(caches.open(KEY).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));\n"+
"self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sketchnote-')&&k!==KEY).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\n"+
"self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(KEY).then(c=>c.match('./index.html'))));return;}e.respondWith(caches.open(KEY).then(async c=>(await c.match(e.request))||fetch(e.request)));});\n");
