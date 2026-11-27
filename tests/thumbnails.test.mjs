import test from 'node:test';
import assert from 'node:assert/strict';
import {ThumbnailStore,thumbnailSize,thumbnailKey} from '../src/thumbnails.js';
import {normalizeFilePrefs} from '../src/folder.js';
const file=(name,modified=1,size=10)=>({name,modified,size});
const blob=(size=10)=>new Blob([new Uint8Array(size)]);
test('previews preserve aspect ratio, never upscale, and reject invalid dimensions',()=>{
 assert.deepEqual(thumbnailSize(1200,600),{width:256,height:128});
 assert.deepEqual(thumbnailSize(600,1200),{width:128,height:256});
 assert.deepEqual(thumbnailSize(12,20),{width:12,height:20});
 assert.deepEqual(thumbnailSize(1,10000),{width:1,height:256});
 assert.throws(()=>thumbnailSize(0,10),/Invalid/);
});
test('view/density preferences normalize and retain valid choices',()=>{
 const p=normalizeFilePrefs({fileView:'gallery',fileDensity:'dense'});
 assert.equal(p.fileView,'gallery');assert.equal(p.fileDensity,'dense');
 const q=normalizeFilePrefs({fileView:'bad',fileDensity:'bad'});
 assert.equal(q.fileView,'list');assert.equal(q.fileDensity,'normal');
});
test('thumbnail metadata invalidates changed files; cache is bounded and LRU',async()=>{
 let renders=0;const store=new ThumbnailStore(async()=>{renders++;return blob(10)},{maxEntries:2,maxBytes:20});
 assert.notEqual(thumbnailKey(file('a',1)),thumbnailKey(file('a',2)));
 const a=file('a'),b=file('b'),c=file('c');
 await store.get(a);await store.get(b);await store.get(a);assert.equal(renders,2);
 await store.get(c);assert.equal(store.cache.size,2);assert.equal(store.bytes,20);
 await store.get(b);assert.equal(renders,4);
 await store.get(file('b',2));assert.equal(renders,5);
});
test('queue limits concurrent decodes and removes cancelled pending work',async()=>{
 let active=0,peak=0;const jobs=[];
 const store=new ThumbnailStore(f=>{active++;peak=Math.max(peak,active);return new Promise(resolve=>jobs.push({name:f.name,finish:()=>{active--;resolve(blob())}}))},{concurrency:2});
 const controller=new AbortController(),a=store.get(file('a')),b=store.get(file('b')),c=store.get(file('c'),controller.signal),d=store.get(file('d'));
 const cancelled=assert.rejects(c,{name:'AbortError'});controller.abort();await cancelled;
 await Promise.resolve();assert.deepEqual(jobs.map(j=>j.name),['a','b']);
 jobs[0].finish();await a;
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(jobs.map(j=>j.name),['a','b','d']);
 jobs[1].finish();jobs[2].finish();await Promise.all([b,d]);assert.equal(peak,2);
});
test('aborted running decode does not populate cache',async()=>{
 let finish;const store=new ThumbnailStore(()=>new Promise(resolve=>finish=resolve));
 const ctrl=new AbortController(),pending=store.get(file('a'),ctrl.signal),rejected=assert.rejects(pending,{name:'AbortError'});
 await Promise.resolve();ctrl.abort();finish(blob());await rejected;assert.equal(store.cache.size,0);
});
