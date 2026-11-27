import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFilePrefs,backgroundFor,initializePage,sortFiles,availableName,writeNewFile,readFolderFiles,ensureWritePermission} from '../src/folder.js';
test('background settings validate and transparent is the default',()=>{
 const a=normalizeFilePrefs({});assert.equal(backgroundFor(a),null);assert.equal(a.fileSort,'name');assert.equal(a.fileSortDirection,'asc');
 assert.equal(backgroundFor(normalizeFilePrefs({newBackground:'color',newBackgroundColor:'#abc'})),'#aabbcc');
 assert.equal(backgroundFor(normalizeFilePrefs({newBackground:'color',newBackgroundColor:'bad!'})),'#ffffff');
 const events=[];const ctx={clearRect:(...v)=>events.push(['clear',...v]),save:()=>events.push(['save']),restore:()=>events.push(['restore']),fillRect:(...v)=>events.push(['fill',...v])};
 initializePage(ctx,3,4,null);assert.deepEqual(events,[['clear',0,0,3,4]]);
 initializePage(ctx,3,4,'#123456');assert.equal(ctx.fillStyle,'#123456');assert.deepEqual(events.slice(-4),[['clear',0,0,3,4],['save'],['fill',0,0,3,4],['restore']]);
});
test('sort is natural, reversible, stable and unknown metadata stays last',()=>{
 const a=[{name:'sketch10.webp',modified:2,size:100},{name:'sketch2.webp',modified:5,size:10},{name:'sketch1.webp',modified:null,size:null}];
 assert.deepEqual(sortFiles(a).map(f=>f.name),['sketch1.webp','sketch2.webp','sketch10.webp']);
 assert.deepEqual(sortFiles(a,'modified','desc').map(f=>f.name),['sketch2.webp','sketch10.webp','sketch1.webp']);
 assert.deepEqual(sortFiles(a,'size','asc').map(f=>f.name),['sketch2.webp','sketch10.webp','sketch1.webp']);assert.equal(a[0].name,'sketch10.webp');
});
test('filename collision handling does not overwrite existing case variants',()=>{
 assert.equal(availableName('note.webp',['Note.WEBP','note (2).webp']),'note (3).webp');assert.equal(availableName('note.png',[]),'note.png');
});
function mockDir(entries){
 const map=new Map(entries.map(e=>[e.name,e]));
 return {map,async *values(){yield* map.values()},async getFileHandle(name,options){if(map.has(name))return map.get(name);if(!options?.create){const e=Error('missing');e.name='NotFoundError';throw e}const h={name,kind:'file'};map.set(name,h);return h}};
}
test('new file saves with a unique name and existing file remains unchanged',async()=>{
 const original={name:'note.webp',kind:'file',data:'original'},dir=mockDir([original]);const h=await writeNewFile(dir,'note.webp','new',async(handle,blob)=>handle.data=blob);
 assert.equal(h.name,'note (2).webp');assert.equal(h.data,'new');assert.equal(original.data,'original');
});
test('folder listing excludes nonimages and tolerates unavailable metadata',async()=>{
 const dir=mockDir([{name:'a.webp',kind:'file',getFile:async()=>({lastModified:123,size:42})},{name:'b.PNG',kind:'file',getFile:async()=>{throw Error('gone')}},{name:'doc.txt',kind:'file'},{name:'folder.png',kind:'directory'}]);
 const files=await readFolderFiles(dir);assert.equal(files.length,2);assert.equal(files[0].modified,123);assert.equal(files[1].size,null);
});
test('folder permission denial is surfaced',async()=>{await assert.rejects(ensureWritePermission({queryPermission:async()=> 'prompt',requestPermission:async()=> 'denied'}),/permission not granted/);await ensureWritePermission({queryPermission:async()=> 'granted',requestPermission:async()=>{throw Error('must not prompt')}})});
