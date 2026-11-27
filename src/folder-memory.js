// Only a directory permission handle is stored here. No document data or thumbnails.
const DB='sketchnote-folder-handle',STORE='preferences',KEY='last-folder';
function openDB(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Folder storage blocked'));
 });
}
async function operation(mode,run){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);const request=run(tx.objectStore(STORE));
  tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error||Error('Folder storage aborted'));tx.onerror=()=>reject(tx.error||request.error);
 })}finally{db.close()}
}
export async function getRememberedFolder(){const handle=await operation('readonly',s=>s.get(KEY));return handle?.kind==='directory'?handle:null}
export const rememberFolder=handle=>operation('readwrite',s=>s.put(handle,KEY));
export const forgetFolder=()=>operation('readwrite',s=>s.delete(KEY));
