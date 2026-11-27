import {parseHex} from './appearance.js';
export const sortLabels={name:'Name',modified:'Modified',size:'Size'};
export function normalizeFilePrefs(p){
 return {...p,newBackground:p.newBackground==='color'?'color':'transparent',newBackgroundColor:parseHex(p.newBackgroundColor)??'#ffffff',fileSort:Object.hasOwn(sortLabels,p.fileSort)?p.fileSort:'name',fileSortDirection:p.fileSortDirection==='desc'?'desc':'asc',fileView:['list','compact','gallery'].includes(p.fileView)?p.fileView:'list',fileDensity:['dense','normal','spacious'].includes(p.fileDensity)?p.fileDensity:'normal'};
}
export const backgroundFor=p=>p.newBackground==='color'?parseHex(p.newBackgroundColor):null;
export function initializePage(ctx,w,h,background){
 ctx.clearRect(0,0,w,h);
 if(background){ctx.save();ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.restore()}
}
const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
export function sortFiles(files,key='name',direction='asc'){
 const sign=direction==='desc'?-1:1;
 return [...files].sort((a,b)=>{
  if(key==='name')return sign*collator.compare(a.name,b.name);
  const av=a[key],bv=b[key],aValid=Number.isFinite(av),bValid=Number.isFinite(bv);
  if(aValid!==bValid)return aValid?-1:1;
  return (aValid?sign*(av-bv):0)||collator.compare(a.name,b.name);
 });
}
export async function readFolderFiles(dir){
 const handles=[];
 for await(const entry of dir.values())if(entry.kind==='file'&&/\.(webp|png|jpe?g)$/i.test(entry.name))handles.push(entry);
 const list=[];
 for(let i=0;i<handles.length;i+=16){
  const batch=await Promise.all(handles.slice(i,i+16).map(async handle=>{
   try{const file=await handle.getFile();return {name:handle.name,handle,modified:file.lastModified,size:file.size}}
   catch{return {name:handle.name,handle,modified:null,size:null}}
  }));
  list.push(...batch);
 }
 return list;
}
export async function ensureWritePermission(handle){
 if(handle.queryPermission&&await handle.queryPermission({mode:'readwrite'})==='granted')return;
 if(handle.requestPermission&&await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Folder write permission not granted');
}
export function availableName(name,existing){
 const occupied=new Set([...existing].map(n=>n.toLowerCase()));
 if(!occupied.has(name.toLowerCase()))return name;
 const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';
 for(let i=2;i<100000;i++){const candidate=stem+' ('+i+')'+ext;if(!occupied.has(candidate.toLowerCase()))return candidate}
 throw Error('Too many files with the same name');
}
export async function writeNewFile(dir,name,blob,write){
 const existing=[];
 for await(const entry of dir.values())existing.push(entry.name);
 const candidate=availableName(name,existing);
 // File System Access has no exclusive-create primitive. Recheck immediately
 // before creation to minimize the chance of colliding with another process.
 try{
  await dir.getFileHandle(candidate);
  throw Error('Filename appeared while saving; retry to choose a new name');
 }catch(e){if(e.name!=='NotFoundError')throw e}
 const target=await dir.getFileHandle(candidate,{create:true});
 try{await write(target,blob)}
 catch(e){
  // Do not remove or replace an existing file on write failure. The new empty
  // file may remain; a retry will select a fresh name.
  throw e;
 }
 return target;
}
