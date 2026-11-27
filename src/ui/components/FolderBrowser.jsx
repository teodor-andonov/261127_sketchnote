import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {List,AlignJustify,LayoutGrid,FileImage,FolderOpen,X,ArrowDownWideNarrow,ArrowUpNarrowWide,RefreshCw} from 'lucide-react';
import {sortLabels} from '../../folder.js';
import {observeThumbnail,thumbnailKey} from '../../thumbnails.js';
import {galleryLayout} from '../../gallery-layout.js';
const viewOptions=[['list',List,'List'],['gallery',LayoutGrid,'Gallery']];
const densityOptions=[['dense','Dense'],['normal','Normal'],['spacious','Spacious']];
const fmtDate=new Intl.DateTimeFormat(undefined,{year:'2-digit',month:'short',day:'numeric'});
const formatSize=size=>size<1024?size+' B':size<1048576?(size/1024).toFixed(1)+' KB':(size/1048576).toFixed(1)+' MB';
function IconButton({icon:Icon,label,onClick,active,disabled}){
 return <button type="button" className={'icon'+(active?' active':'')} aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={onClick}><Icon size={16}/></button>;
}
function GalleryThumbnail({file,rootRef,store}){
 const ref=useRef(null),[visible,setVisible]=useState(false),[url,setUrl]=useState(null),[failed,setFailed]=useState(false);
 const key=thumbnailKey(file);
 useEffect(()=>observeThumbnail(rootRef.current,ref.current,setVisible),[rootRef]);
 useEffect(()=>{
  setUrl(null);setFailed(false);
  if(!visible)return;
  const controller=new AbortController();let objectUrl;
  store.get(file,controller.signal).then(blob=>{
   if(controller.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(error=>{if(!controller.signal.aborted&&error.name!=='AbortError')setFailed(true)});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[visible,key,store]);
 return <span ref={ref} className="gallery-thumbnail">
  {url?<img src={url} alt="" draggable={false} decoding="async" onError={()=>setFailed(true)} style={failed?{display:'none'}:undefined}/>:null}
  {(!url||failed)&&<FileImage size={22} aria-label={failed?'Preview unavailable':undefined} aria-hidden={!failed}/>}
 </span>;
}
export function FolderBrowser({folder,remembered,onReconnect,files,prefs,change,loading,thumbnails,currentName,currentHandle,onOpenFolder,onRefresh,onClose,onOpenFile,busy}){
 const rootRef=useRef(null),[selected,setSelected]=useState(null);
 const view=prefs.fileView,density=prefs.fileDensity;
 const [geometry,setGeometry]=useState(()=>galleryLayout(0,density));
 useLayoutEffect(()=>{
  const root=rootRef.current;if(view!=='gallery'||!root)return;
  const measure=()=>{const next=galleryLayout(root.clientWidth,density);setGeometry(old=>old.columns===next.columns&&old.size===next.size&&old.gap===next.gap?old:next)};
  measure();const observer=new ResizeObserver(measure);observer.observe(root);return()=>observer.disconnect();
 },[view,density]);
 // Match real file identity rather than highlighting a same-named file from another folder.
 const candidate=files.find(file=>file.name===currentName);
 useEffect(()=>{
  let live=true;setSelected(null);
  if(candidate&&currentHandle){
   if(candidate.handle===currentHandle)setSelected(candidate.name);
   else if(candidate.handle.isSameEntry)candidate.handle.isSameEntry(currentHandle).then(same=>{if(live&&same)setSelected(candidate.name)}).catch(()=>{});
  }
  return()=>{live=false};
 },[candidate?.handle,currentHandle]);
 return <>
  <div className="sidehead"><strong title={folder||'Files'}>{folder||'Files'}</strong><IconButton icon={FolderOpen} label="Open folder" onClick={onOpenFolder} disabled={busy}/><IconButton icon={X} label="Hide sidebar" onClick={onClose}/></div>
  {folder&&<>
   <div className="folder-sort">
    <select aria-label="Sort files by" title="Sort files by" value={prefs.fileSort} onChange={e=>change('fileSort',e.target.value)}>{Object.entries(sortLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
    <IconButton icon={prefs.fileSortDirection==='asc'?ArrowUpNarrowWide:ArrowDownWideNarrow} label={'Sort '+(prefs.fileSortDirection==='asc'?'ascending':'descending')+' · click to reverse'} onClick={()=>change('fileSortDirection',prefs.fileSortDirection==='asc'?'desc':'asc')}/>
    <IconButton icon={RefreshCw} label="Refresh folder" onClick={onRefresh} disabled={loading}/>
   </div>
   <div className="folder-viewbar">
    <div className="folder-view-options" role="group" aria-label="Folder view">
     {viewOptions.map(([key,icon,label])=><IconButton key={key} icon={icon} label={label+' view'} active={view===key} onClick={()=>change('fileView',key)}/>)}
    </div>
    <select aria-label="Folder density" title="Folder density" value={density} onChange={e=>change('fileDensity',e.target.value)}>{densityOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
   </div>
  </>}
  <div ref={rootRef} className={'file-list folder-files mode-'+view+' density-'+density} aria-busy={loading}>
   <div className={view==='gallery'?'gallery-grid':'folder-list-items'} style={view==='gallery'?{'--gallery-columns':geometry.columns,'--gallery-size':geometry.size+'px','--gallery-gap':geometry.gap+'px'}:undefined}>
   {files.map(file=>{
    const current=file.name===selected,detail=[Number.isFinite(file.modified)?fmtDate.format(new Date(file.modified)):null,Number.isFinite(file.size)?formatSize(file.size):null].filter(Boolean).join(' · ');
    return <button type="button" key={file.name} className={(view==='gallery'?'gallery-card':'file browser-file')+(current?' current':'')} title={file.name+(detail?'\n'+detail:'')} aria-current={current?'true':undefined} disabled={busy} onClick={()=>onOpenFile(file)}>
     {view==='gallery'?<GalleryThumbnail key={thumbnailKey(file)} file={file} rootRef={rootRef} store={thumbnails}/>:<FileImage className="file-type-icon" size={15} aria-hidden="true"/>}
     <span className="file-description"><span className="file-name">{file.name}</span></span>
    </button>;
   })}
   </div>
   {!folder&&<div className="empty-folder">{remembered?<><p>Reconnect {remembered}</p><button type="button" disabled={busy} onClick={onReconnect}>Reconnect folder</button></>:<p>Open a local folder to browse sketches.</p>}</div>}
   {folder&&!files.length&&<p className="empty-folder">{loading?'Reading folder…':'No sketches in this folder.'}</p>}
  </div>
  {folder&&<div className="folder-count" role="status">{loading?'Reading…':files.length+' '+(files.length===1?'sketch':'sketches')}</div>}
 </>;
}
