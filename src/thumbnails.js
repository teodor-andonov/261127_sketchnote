// The store contains small preview blobs only, never original images or disk metadata.
export function thumbnailSize(w,h,max=256){
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||max<=0)throw Error('Invalid image dimensions');
 const scale=Math.min(1,max/Math.max(w,h));
 return {width:Math.max(1,Math.round(w*scale)),height:Math.max(1,Math.round(h*scale))};
}
export const thumbnailKey=file=>JSON.stringify([file.name,file.modified,file.size]);
const abortError=()=>new DOMException('Thumbnail cancelled','AbortError');
const check=signal=>{if(signal?.aborted)throw abortError()};
export class ThumbnailStore{
 constructor(render,{concurrency=2,maxBytes=8*1024*1024,maxEntries=160}={}){
  this.render=render;this.concurrency=concurrency;this.maxBytes=maxBytes;this.maxEntries=maxEntries;
  this.cache=new Map();this.bytes=0;this.pending=[];this.active=0;
 }
 get(file,signal){
  if(signal?.aborted)return Promise.reject(abortError());
  const key=thumbnailKey(file),cached=this.cache.get(key);
  if(cached){this.cache.delete(key);this.cache.set(key,cached);return Promise.resolve(cached)}
  return new Promise((resolve,reject)=>{
   const job={file,key,signal,resolve,reject};
   job.cancel=()=>{const i=this.pending.indexOf(job);if(i>=0){this.pending.splice(i,1);reject(abortError());this.pump()}};
   signal?.addEventListener('abort',job.cancel,{once:true});this.pending.push(job);this.pump();
  });
 }
 remember(key,blob){
  if(blob.size>this.maxBytes)return;
  const old=this.cache.get(key);if(old){this.bytes-=old.size;this.cache.delete(key)}
  this.cache.set(key,blob);this.bytes+=blob.size;
  while(this.bytes>this.maxBytes||this.cache.size>this.maxEntries){
   const first=this.cache.keys().next().value;this.bytes-=this.cache.get(first).size;this.cache.delete(first);
  }
 }
 pump(){
  while(this.active<this.concurrency&&this.pending.length){
   const job=this.pending.shift();job.signal?.removeEventListener('abort',job.cancel);
   if(job.signal?.aborted){job.reject(abortError());continue}
   const cached=this.cache.get(job.key);if(cached){this.cache.delete(job.key);this.cache.set(job.key,cached);job.resolve(cached);continue}
   this.active++;
   Promise.resolve().then(()=>{check(job.signal);return this.render(job.file,job.signal)}).then(blob=>{
    check(job.signal);this.remember(job.key,blob);job.resolve(blob);
   }).catch(job.reject).finally(()=>{this.active--;this.pump()});
  }
 }
}
export async function renderThumbnail(entry,signal){
 check(signal);const file=await entry.handle.getFile();check(signal);
 let image,url;
 try{
  if(typeof createImageBitmap==='function'){
   try{image=await createImageBitmap(file)}catch(e){check(signal)}
  }
  if(!image){url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode()}
  check(signal);
  const {width,height}=thumbnailSize(image.naturalWidth||image.width,image.naturalHeight||image.height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  try{
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Preview canvas unavailable');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Thumbnail encoding failed')),'image/webp',.82));
   check(signal);return blob;
  }finally{canvas.width=0;canvas.height=0}
 }finally{image?.close?.();if(url)URL.revokeObjectURL(url)}
}
// Share one observer per scroll root, rather than one observer per thumbnail.
const observers=new WeakMap();
export function observeThumbnail(root,node,callback){
 if(!root||typeof IntersectionObserver==='undefined'){callback(true);return()=>{}}
 let shared=observers.get(root);
 if(!shared){
  const callbacks=new Map();
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)callbacks.get(entry.target)?.(entry.isIntersecting)},{root,rootMargin:'100px',threshold:0});
  shared={callbacks,observer};observers.set(root,shared);
 }
 shared.callbacks.set(node,callback);shared.observer.observe(node);
 return()=>{shared.observer.unobserve(node);shared.callbacks.delete(node);if(!shared.callbacks.size){shared.observer.disconnect();observers.delete(root)}};
}
