import React,{useState,useRef,useCallback,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {Pencil,Minus,Square,Circle,Eraser,Undo2,Redo2,FilePlus,FolderOpen,Save,SaveAll,ImagePlus,Clipboard,Trash2,Settings,Command,Check,X,Folder,PaintBucket,SunMoon,PanelLeftClose,PanelLeftOpen,Grip,Search,Contrast,PanelsTopLeft,PanelTop,EyeOff,ChevronUp,ChevronDown,ArrowDownWideNarrow,ArrowUpNarrowWide,RefreshCw} from 'lucide-react';
import {CanvasHost} from './ui/components/CanvasHost';
import {useToolBindings} from './ui/hooks/useToolBindings';
import {usePasteController} from './ui/hooks/usePasteController';
import {usePenActions} from './ui/hooks/usePenActions';
import {TileHistory} from './history';
import {decode,encodeCanvas,write,download,formatOf,formats,suggestName,imageTypes} from './files';
import {normalizeLayout,positions,nextMode,uiModes,zoomModes,gridModes} from './layout.js';
import {FloatingPanels} from './ui/components/FloatingPanels.jsx';
import {AppearanceControls,PresetSettings} from './ui/components/AppearanceControls.jsx';
import {normalizeAppearance} from './appearance.js';
import {normalizeFilePrefs,backgroundFor,initializePage,sortFiles,readFolderFiles,writeNewFile,ensureWritePermission} from './folder.js';
import {FolderBrowser} from './ui/components/FolderBrowser.jsx';
import {ThumbnailStore,renderThumbnail} from './thumbnails.js';
import {getRememberedFolder,rememberFolder,forgetFolder} from './folder-memory.js';
import {validCanvasSize,canAutoSave,flushBeforeSwitch} from './document-flow.js';
import './style.css';
const VERSION='1.5.2';
const COMMIT=import.meta.env.VITE_COMMIT||'local';
const basePrefs={color:'#000000',width:4,opacity:1,pressure:true,penOnly:false,fill:false,grid:'none',zoom:'fit',dark:matchMedia('(prefers-color-scheme: dark)').matches,autosave:true,delay:5,format:'webp',eraser:5,penButton:'undo',penTip:'erase',toolbarPosition:'top',sidebarPosition:'left',sidebarWidth:230,sidebarHeight:190,showFooter:true,uiMode:'full',sidebarOpen:false,invertPage:false,newBackground:'transparent',newBackgroundColor:'#ffffff',fileSort:'name',fileSortDirection:'asc',fileView:'list',fileDensity:'normal',defaultWidth:1200,defaultHeight:800,rememberFolder:true};
function readPrefs(){try{const saved=JSON.parse(localStorage.getItem('sketchnote.preferences')||'{}');return normalizeFilePrefs(normalizeAppearance(normalizeLayout({...basePrefs,...saved,invertPage:saved.invertPage??saved.invertCanvas??false})))}catch{return normalizeFilePrefs(normalizeAppearance(normalizeLayout(basePrefs)))}}
const stamp=()=> 'sketch_'+new Date().toISOString().replace(/[-:T]/g,'').slice(2,14);
const tools=[['pen',Pencil,'Pen (D)'],['segment',Minus,'Line (L)'],['box',Square,'Rectangle (R)'],['oval',Circle,'Ellipse (O)'],['rubber',Eraser,'Eraser (E)']];
const gridLabels={none:'None',grid:'Grid',dots:'Dots',hlines:'Lines'};
const zoomLabels={fit:'Fit',fill:'Fill',custom:'Custom'};
const uiIcons={full:PanelsTopLeft,simplified:PanelTop,hidden:EyeOff};
const B=({icon:Icon,label,onClick,active,disabled})=><button className={'icon '+(active?'active':'')} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon size={17}/></button>;
function App(){
 const [prefs,setPrefs]=useState(readPrefs),[tool,setTool]=useState('pen'),[refs,setRefs]=useState(null),[doc,setDoc]=useState(()=>({id:1,width:prefs.defaultWidth,height:prefs.defaultHeight,image:null,background:backgroundFor(prefs)})),[name,setName]=useState(()=>stamp()+formats[prefs.format].ext),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Ready'),[historyTick,bump]=useState(0),[dialog,setDialog]=useState(null),[query,setQuery]=useState(''),[folder,setFolder]=useState(null),[remembered,setRemembered]=useState(null),[folderFiles,setFolderFiles]=useState([]),[folderGeneration,setFolderGeneration]=useState(0),[folderLoading,setFolderLoading]=useState(false),[newSize,setNewSize]=useState([prefs.defaultWidth,prefs.defaultHeight]),[defaultSizeDraft,setDefaultSizeDraft]=useState(null);
 const [view,setView]=useState({mode:prefs.zoom,scale:1}),[viewReset,setViewReset]=useState(0);
 const resetView=mode=>{change('zoom',mode);setViewReset(x=>x+1)};
 const cancelStroke=useCallback(()=>{const hist=h.current;if(hist)hist.ctx.putImageData(hist.current,0,0)},[]);
 const h=useRef(null),handle=useRef(null),folderRef=useRef(null),folderScan=useRef(0),folderChoice=useRef(0),switching=useRef(false),saveTask=useRef(null),revision=useRef(0),clean=useRef(0),timer=useRef(null),saving=useRef(false),docRef=useRef(doc),readyDoc=useRef(null),openInput=useRef(null),importInput=useRef(null),alive=useRef(true),saveLatest=useRef(null),loadLatest=useRef(null),dirtyRef=useRef(false),busyRef=useRef(false);
 const change=(k,v)=>setPrefs(p=>({...p,[k]:v}));
 const thumbnails=useMemo(()=>new ThumbnailStore(renderThumbnail),[folderGeneration]);
 const sortedFiles=useMemo(()=>sortFiles(folderFiles,prefs.fileSort,prefs.fileSortDirection),[folderFiles,prefs.fileSort,prefs.fileSortDirection]);
 const sidebar=prefs.sidebarOpen,setSidebar=v=>change('sidebarOpen',v);
 const full=prefs.uiMode==='full', simplified=prefs.uiMode==='simplified';
 const cycleUI=()=>change('uiMode',nextMode(uiModes,prefs.uiMode));
 useEffect(()=>{document.title='Sketchnote — '+name+(dirty?' *':'')},[name,dirty]);
 useEffect(()=>{try{localStorage.setItem('sketchnote.preferences',JSON.stringify(prefs))}catch{}document.documentElement.dataset.theme=prefs.dark?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',prefs.dark?'#262626':'#ffffff')},[prefs]);
 const markDirty=useCallback(()=>{revision.current++;dirtyRef.current=true;setDirty(true);bump(x=>x+1);setStatus('Unsaved changes')},[]);
 const commit=useCallback(()=>{if(h.current?.commit())markDirty()},[markDirty]);
 const paste=usePasteController({canvasRefs:refs,canvasSize:doc,isPaused:busy,onCommit:commit});
 const undo=useCallback(()=>{if(h.current?.undo())markDirty()},[markDirty]);
 const redo=useCallback(()=>{if(h.current?.redo())markDirty()},[markDirty]);
 const clear=useCallback(()=>{if(!refs||busyRef.current||readyDoc.current!==docRef.current.id)return;paste.cancelPaste();if(h.current?.clear())markDirty()},[refs,paste.cancelPaste,markDirty]);
 const saveFromPen=useCallback(()=>saveLatest.current?.(false,false),[]);
 const pen=usePenActions({canvasRefs:refs,penButtonAction:prefs.penButton,eraserTipAction:prefs.penTip,activeTool:tool,setActiveTool:setTool,onUndo:undo,onReset:clear,onSave:saveFromPen,isPaused:!!paste.pasteState||busy});
 const eraserCommit=useCallback(()=>{commit();pen.handleEraserCommit()},[commit,pen.handleEraserCommit]);
 useToolBindings({canvasRefs:refs,activeTool:tool,lineWidth:prefs.width,color:prefs.color,opacity:prefs.opacity,fillEnabled:prefs.fill,penOnlyMode:prefs.penOnly,pressureEnabled:prefs.pressure,pressureFactor:.7,eraserWidthMultiplier:prefs.eraser,eraserPreviewEnabled:true,onCommit:commit,onEraserCommit:eraserCommit,rebindToken:doc.id,isPaused:!!paste.pasteState||busy});
 useEffect(()=>{if(!refs)return;if(readyDoc.current===doc.id&&h.current?.ctx.canvas===refs.finalCanvas)return;const ctx=refs.finalCanvas.getContext('2d',{willReadFrequently:true});initializePage(ctx,doc.width,doc.height,doc.background);if(doc.image)ctx.drawImage(doc.image,0,0);h.current=new TileHistory(ctx);readyDoc.current=doc.id;bump(x=>x+1)},[refs,doc]);
 const replaceDocument=async action=>{
  if(switching.current||busyRef.current)return;
  switching.current=true;clearTimeout(timer.current);busyRef.current=true;setBusy(true);
  try{
   if(saveTask.current)await saveTask.current;
   if(paste.pasteState){alert('Finish or cancel the pasted image before switching sketches.');return}
   const allowed=await flushBeforeSwitch({
    isDirty:()=>dirtyRef.current,autosave:prefs.autosave,
    canSave:()=>canAutoSave(handle.current,folderRef.current,prefs.format),
    save:()=>saveLatest.current(false,true,true),
    confirmDiscard:()=>confirm('Discard unsaved changes?')
   });
   if(!allowed){if(prefs.autosave&&dirtyRef.current){setStatus('Switch cancelled: current sketch is not saved');alert('The current sketch could not be autosaved. Save it manually or choose a writable folder before switching.')}return}
   return await action();
  }catch(e){setStatus(String(e.message||e))}
  finally{
   switching.current=false;busyRef.current=false;setBusy(false);
   if(dirtyRef.current&&prefs.autosave&&canAutoSave(handle.current,folderRef.current,prefs.format)){clearTimeout(timer.current);timer.current=setTimeout(()=>saveLatest.current?.(false,true),prefs.delay*1000)}
  }
 };
 const installDoc=(image,fileName,fileHandle,width,height,background=null)=>{clearTimeout(timer.current);paste.cancelPaste();handle.current=fileHandle;revision.current=0;clean.current=0;dirtyRef.current=false;setDirty(false);setName(fileName);const d={id:docRef.current.id+1,width,height,image,background};docRef.current=d;setDoc(d);setStatus(fileHandle?'Opened local file':'Ready');setDialog(null)};
 const openFile=async (f,fh=null)=>replaceDocument(async()=>{const image=await decode(fh?await fh.getFile():f);if(!validCanvasSize(image.naturalWidth,image.naturalHeight))throw Error('Image exceeds the 40 megapixel / 16384px canvas limit');installDoc(image,fh?.name||f.name,fh,image.naturalWidth,image.naturalHeight)});
 loadLatest.current=fh=>openFile(null,fh);
 const open=async()=>{if(busyRef.current||saving.current)return;try{if(window.showOpenFilePicker){const [fh]=await window.showOpenFilePicker({types:imageTypes,multiple:false});if(fh)await loadLatest.current(fh)}else openInput.current.click()}catch(e){if(e.name!=='AbortError')setStatus(e.message)}};
 const activateFolder=async(dir,show=true)=>{
  folderRef.current=dir;setFolder(dir.name);setRemembered(dir);setFolderGeneration(g=>g+1);setFolderFiles([]);if(show)setSidebar(true);
  await refreshFolder(dir);
 };
 const openFolder=async()=>{
  if(busyRef.current||saving.current)return;
  if(!window.showDirectoryPicker){setStatus('Folder access is unavailable in this browser');return}
  const choice=++folderChoice.current;
  try{
   const dir=await window.showDirectoryPicker({mode:'readwrite'});if(choice!==folderChoice.current)return;
   await activateFolder(dir);
   if(prefs.rememberFolder)try{await rememberFolder(dir)}catch{setStatus('Folder opened; browser could not remember it')}
  }catch(e){if(e.name!=='AbortError')setStatus(e.message)}
 };
 const reconnectFolder=async()=>{
  if(!remembered||busyRef.current||saving.current)return;
  const choice=++folderChoice.current;
  try{
   if(await remembered.requestPermission({mode:'readwrite'})!=='granted')throw Error('Folder permission not granted');
   if(choice!==folderChoice.current)return;await activateFolder(remembered);
  }catch(e){setStatus(e.message||'Could not reconnect folder')}
 };
 const setRememberPreference=async enabled=>{
  change('rememberFolder',enabled);
  try{if(enabled&&folderRef.current)await rememberFolder(folderRef.current);else if(!enabled){await forgetFolder();if(!folderRef.current)setRemembered(null)}}
  catch{setStatus('Could not update remembered folder')}
 };
 useEffect(()=>{
  if(!prefs.rememberFolder)return;
  const choice=folderChoice.current;let live=true;
  (async()=>{
   try{
    const dir=await getRememberedFolder();if(!live||!dir||choice!==folderChoice.current||folderRef.current)return;
    const permission=await dir.queryPermission({mode:'readwrite'});
    if(!live||choice!==folderChoice.current||folderRef.current)return;
    setRemembered(dir);
    if(permission==='granted')await activateFolder(dir,false);
    else setStatus('Reconnect '+dir.name+' to restore folder access');
   }catch{if(live)setStatus('Could not restore remembered folder')}
  })();
  return()=>{live=false};
 },[]);

 async function refreshFolder(dir=folderRef.current){
  if(!dir)return;
  const scan=++folderScan.current;setFolderLoading(true);
  try{const list=await readFolderFiles(dir);if(scan===folderScan.current&&folderRef.current===dir)setFolderFiles(list)}
  catch(e){if(scan===folderScan.current&&folderRef.current===dir)setStatus('Folder read failed: '+(e.message||e))}
  finally{if(scan===folderScan.current&&folderRef.current===dir)setFolderLoading(false)}
 }
 const refreshFolderView=()=>{setFolderGeneration(g=>g+1);return refreshFolder()};
 const performSave=async (as=false,automatic=false,duringSwitch=false)=>{
  if(!refs||readyDoc.current!==docRef.current.id||saving.current||(!duringSwitch&&busyRef.current)||paste.pasteState)return false;
  if(automatic&&(!dirtyRef.current||!canAutoSave(handle.current,folderRef.current,prefs.format)))return !dirtyRef.current;
  saving.current=true;
  const rev=revision.current,old=handle.current,dir=!as&&!old?folderRef.current:null;let target=as?null:old,format=target?formatOf(target.name):prefs.format;
  try{
   if(automatic){const destination=target||dir;if(!destination||!destination.queryPermission||await destination.queryPermission({mode:'readwrite'})!=='granted')return false}
   else if(dir)await ensureWritePermission(dir);
   if(!automatic&&!target&&!dir&&window.showSaveFilePicker){
    target=await window.showSaveFilePicker({suggestedName:suggestName(name,format),types:[{description:format.toUpperCase(),accept:{[formats[format].mime]:[formats[format].ext]}}],...(folderRef.current?{startIn:folderRef.current}:{})});
    format=formatOf(target.name);
   }
   if(target&&!automatic&&target.requestPermission&&await target.requestPermission({mode:'readwrite'})!=='granted')throw Error('Write permission not granted');
   setStatus('Saving…');const blob=await encodeCanvas(refs.finalCanvas,format);
   if(dir){target=await writeNewFile(dir,suggestName(name,format),blob,write);handle.current=target;setName(target.name)}
   else if(target){await write(target,blob);handle.current=target;setName(target.name)}
   else{const n=suggestName(name,format);download(blob,n);setName(n)}
   if(revision.current===rev){clean.current=rev;dirtyRef.current=false;setDirty(false)}
   setStatus(target?'Saved to disk':'Image exported');if(folderRef.current)refreshFolder().catch(()=>{});return !dirtyRef.current;
  }catch(e){if(e.name!=='AbortError')setStatus('Save failed: '+(e.message||e));return false}
  finally{saving.current=false;if(!switching.current&&dirtyRef.current&&revision.current!==rev&&prefs.autosave&&canAutoSave(handle.current,folderRef.current,prefs.format)){clearTimeout(timer.current);timer.current=setTimeout(()=>saveLatest.current?.(false,true),prefs.delay*1000)}}
 };
 const save=(as=false,automatic=false,duringSwitch=false)=>{
  if(saveTask.current)return saveTask.current;
  const task=performSave(as,automatic,duringSwitch);saveTask.current=task;
  task.finally(()=>{if(saveTask.current===task)saveTask.current=null});return task;
 };
 saveLatest.current=save;
 useEffect(()=>{clearTimeout(timer.current);if(dirty&&prefs.autosave&&!switching.current&&canAutoSave(handle.current,folderRef.current,prefs.format))timer.current=setTimeout(()=>saveLatest.current?.(false,true),Math.max(1,prefs.delay)*1000);return()=>clearTimeout(timer.current)},[historyTick,dirty,prefs.autosave,prefs.delay,prefs.format,name,folder]);
 useEffect(()=>{const fn=e=>{if(dirtyRef.current||saving.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn)},[]);
 useEffect(()=>{if(window.launchQueue)window.launchQueue.setConsumer(async params=>{if(params.files?.length)await loadLatest.current(params.files[0])})},[]);
 const newSketch=()=>{if(busyRef.current||switching.current)return;setNewSize([prefs.defaultWidth,prefs.defaultHeight]);setDialog('new')};
 const createSketch=async()=>{
  if(busyRef.current||switching.current)return;
  const [w,h]=newSize.map(Number);
  if(!validCanvasSize(w,h)){setStatus('Invalid canvas size');return}
  return replaceDocument(async()=>{
  const dir=folderRef.current,format=prefs.format,fileName=stamp()+formats[format].ext,background=backgroundFor(prefs);
  if(!dir){installDoc(null,fileName,null,w,h,background);markDirty();return}
  setStatus('Creating sketch…');
  try{
   await ensureWritePermission(dir);
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   try{
    initializePage(canvas.getContext('2d'),w,h,background);
    const blob=await encodeCanvas(canvas,format);
    const target=await writeNewFile(dir,fileName,blob,write);
    installDoc(null,target.name,target,w,h,background);
    setStatus('Created in '+dir.name);
   }finally{canvas.width=0;canvas.height=0}
   await refreshFolder(dir);
  }catch(e){
   // Preserve the new sketch as unsaved, allowing the user to retry or Save As.
   installDoc(null,fileName,null,w,h,background);markDirty();setStatus('Could not create file: '+(e.message||e)+'. Sketch is unsaved.');
  }
  });
 };
 const pasteFile=async file=>{try{paste.startPasteFromImage(await decode(file))}catch(e){setStatus(e.message)}};
 const pasteClipboard=async()=>{try{for(const item of await navigator.clipboard.read()){const type=item.types.find(t=>t.startsWith('image/'));if(type){await pasteFile(await item.getType(type));return}}setStatus('No image on clipboard')}catch{setStatus('Use Ctrl+V or Import image')}};
 useEffect(()=>{const fn=e=>{if(dialog||busy||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||''))return;const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));const file=item?.getAsFile();if(file){e.preventDefault();pasteFile(file)}};window.addEventListener('paste',fn);return()=>window.removeEventListener('paste',fn)},[paste,dialog,busy]);
 const commands=[['New sketch',newSketch,'Ctrl+N'],['Open image',open,'Ctrl+O'],['Open folder',openFolder,''],['Reconnect remembered folder',reconnectFolder,''],['Refresh folder',refreshFolderView,''],['Files: list view',()=>change('fileView','list'),''],['Files: gallery view',()=>change('fileView','gallery'),''],['Save',()=>save(false,false),'Ctrl+S'],['Save as',()=>save(true,false),'Ctrl+Shift+S'],['Import image',()=>importInput.current.click(),''],['Paste image',pasteClipboard,'Ctrl+V'],['Undo',undo,'Ctrl+Z'],['Redo',redo,'Ctrl+Shift+Z'],['Clear canvas',clear,''],['Grid: cycle',()=>change('grid',nextMode(gridModes,prefs.grid)),''],['Zoom: cycle',()=>resetView(nextMode(zoomModes,view.mode)),''],['Zoom: fit',()=>resetView('fit'),''],['Zoom: fill',()=>resetView('fill'),''],['Invert page',()=>change('invertPage',!prefs.invertPage),''],['Toggle theme',()=>change('dark',!prefs.dark),''],['Toggle sidebar',()=>setSidebar(!sidebar),''],['Cycle interface visibility',cycleUI,''],['Settings',()=>setDialog('settings'),''],...tools.map(([id,,label])=>[label,()=>setTool(id),''])];
 useEffect(()=>{const fn=e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==='k'){e.preventDefault();setQuery('');setDialog(x=>x==='commands'?null:'commands');return}if(e.key==='Escape'){if(dialog)setDialog(null);else paste.cancelPaste();return}if(/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')||dialog||busy)return;if(mod&&['s','o','n','z','y'].includes(key)){e.preventDefault();if(key==='s')save(e.shiftKey,false);if(key==='o')open();if(key==='n')newSketch();if(key==='z')(e.shiftKey?redo:undo)();if(key==='y')redo();return}if(!mod){const t={d:'pen',l:'segment',r:'box',o:'oval',e:'rubber'}[key];if(t)setTool(t);if(key==='enter'&&paste.pasteState)paste.commitPaste()}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[dialog,busy,paste,refs,prefs,name,doc]);
 return <div className={'sketchpad-app '+(prefs.showFooter?'reserve-footer':'')} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file?.type.startsWith('image/'))openFile(file)}}>
  <main className="canvas-stage">
   <div className="workspace"><CanvasHost invertPage={prefs.invertPage} documentId={doc.id} resetToken={viewReset} penOnly={prefs.penOnly} navigationDisabled={busy||!!dialog} onCancelStroke={cancelStroke} onViewChange={setView} width={doc.width} height={doc.height} zoomMode={prefs.zoom} gridMode={prefs.grid} gridSize={50} gridLineThickness={1} gridDotMultiplier={2} gridColor="rgba(110,110,110,.2)" overlayColor="transparent" onReady={setRefs}/>{paste.pasteState&&<div className="pastebar"><span>Move or resize image</span><B icon={Check} label="Commit paste" onClick={paste.commitPaste}/><B icon={X} label="Cancel paste" onClick={paste.cancelPaste}/></div>}</div>
   <FloatingPanels toolbarPosition={prefs.toolbarPosition} sidebarPosition={prefs.sidebarPosition}
     sidebarWidth={prefs.sidebarWidth} sidebarHeight={prefs.sidebarHeight} onResize={(key,value)=>change(key,value)}
     sidebarOpen={full&&sidebar} uiMode={prefs.uiMode}
     toggle={<B icon={sidebar?PanelLeftClose:PanelLeftOpen} label={sidebar?'Hide sidebar':'Show sidebar'} onClick={()=>setSidebar(!sidebar)}/>}
     visibility={<B icon={uiIcons[prefs.uiMode]} label={'Interface: '+prefs.uiMode+' · click to cycle'} onClick={cycleUI}/>}
     viewControls={full&&<>
       <B icon={Grip} label={'Grid: '+gridLabels[prefs.grid]+' · click to cycle'} onClick={()=>change('grid',nextMode(gridModes,prefs.grid))}/>
       <B icon={Search} label={'Zoom: '+zoomLabels[view.mode]+' · click to cycle'} onClick={()=>resetView(nextMode(zoomModes,view.mode))}/>
       <B icon={SunMoon} label="Toggle theme" onClick={()=>change('dark',!prefs.dark)}/>
       <B icon={Contrast} label="Invert page" active={prefs.invertPage} onClick={()=>change('invertPage',!prefs.invertPage)}/>
     </>}
     toolbar={<>
       {(full||simplified)&&<div className="toolgroup document-tools" role="group" aria-label="Document and history">
        {full&&<><B icon={FilePlus} label="New sketch" onClick={newSketch}/><B icon={FolderOpen} label="Open image" onClick={open}/><B icon={Folder} label="Open folder" onClick={openFolder}/><B icon={Save} label="Save" onClick={()=>save()} disabled={busy}/><B icon={SaveAll} label="Save as" onClick={()=>save(true)} disabled={busy}/></>}
        <B icon={Undo2} label="Undo" onClick={undo} disabled={!h.current?.index||busy}/><B icon={Redo2} label="Redo" onClick={redo} disabled={!h.current||h.current.index>=h.current.entries.length||busy}/>
        {full&&<><B icon={Trash2} label="Clear canvas (undoable)" onClick={clear} disabled={busy}/><B icon={Command} label="Commands (Ctrl+K)" onClick={()=>{setQuery('');setDialog('commands')}}/><B icon={Settings} label="Settings" onClick={()=>setDialog('settings')}/></>}
       </div>}
       {(full||simplified)&&<div className="toolgroup drawing-tools" role="group" aria-label="Drawing and image tools">
        {tools.filter(([id])=>full||id==='pen'||id==='rubber').map(([id,icon,label])=><B key={id} icon={icon} label={label} active={tool===id} onClick={()=>{paste.cancelPaste();pen.clearRestoreTool();setTool(id)}}/>)}
        {full&&<><B icon={PaintBucket} label="Fill shapes" active={prefs.fill} onClick={()=>change('fill',!prefs.fill)}/><B icon={ImagePlus} label="Import image onto canvas" onClick={()=>importInput.current.click()}/><B icon={Clipboard} label="Paste image" onClick={pasteClipboard}/></>}
       </div>}
       {(full||simplified)&&<AppearanceControls prefs={prefs} change={change}/>}
     </>}
     sidebar={<FolderBrowser folder={folder} remembered={remembered?.name} onReconnect={reconnectFolder} files={sortedFiles} prefs={prefs} change={change}
       loading={folderLoading} thumbnails={thumbnails} currentName={name} currentHandle={handle.current}
       onOpenFolder={openFolder} onRefresh={refreshFolderView} onClose={()=>setSidebar(false)}
       onOpenFile={file=>loadLatest.current(file.handle)} busy={busy}/>}
   />
  </main>
  {full&&prefs.showFooter&&<footer className="statusbar"><span className="status-message" role="status" title={status}>{status}</span><span className="footer-filename" title={name}>{name}{dirty?' *':''}</span><div className="spacer"/><span className="grid-status">Grid: {gridLabels[prefs.grid]}</span><span>Zoom: {zoomLabels[view.mode]} · {Math.round(view.scale*100)}%</span><span className="resolution-status">{doc.width} × {doc.height}</span><span className="history-status">{Math.round((h.current?.bytes||0)/1048576)} MB history</span><span>v{VERSION} · {COMMIT.slice(0,7)}</span></footer>}
  <input ref={openInput} hidden type="file" accept="image/png,image/webp,image/jpeg" onChange={e=>{if(e.target.files[0])openFile(e.target.files[0]);e.target.value=''}}/><input ref={importInput} hidden type="file" accept="image/*" onChange={e=>{if(e.target.files[0])pasteFile(e.target.files[0]);e.target.value=''}}/>
  {dialog&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label={dialog}><div className="modalhead"><strong>{dialog==='new'?'New sketch':dialog==='settings'?'Settings':'Commands'}</strong><B icon={X} label="Close" onClick={()=>setDialog(null)}/></div>
   {dialog==='new'&&<><label>Width <input type="number" min="1" value={newSize[0]} onChange={e=>setNewSize([e.target.value,newSize[1]])}/></label><label>Height <input type="number" min="1" value={newSize[1]} onChange={e=>setNewSize([newSize[0],e.target.value])}/></label><small>{folder?'Create a new image file in '+folder+'.':'Create an unsaved sketch.'} Background: {prefs.newBackground==='transparent'?'transparent':prefs.newBackgroundColor}.</small><button onClick={createSketch} disabled={busy}>{busy?'Creating…':'Create sketch'}</button></>}
   {dialog==='settings'&&<><h3>Interface</h3>{[['toolbarPosition','Toolbar position'],['sidebarPosition','Sidebar position']].map(([key,label])=><label key={key}>{label}<select value={prefs[key]} onChange={e=>change(key,e.target.value)}>{positions.map(pos=><option key={pos} value={pos}>{pos[0].toUpperCase()+pos.slice(1)}</option>)}</select></label>)}<label>Show status bar <input type="checkbox" checked={prefs.showFooter} onChange={e=>change('showFooter',e.target.checked)}/></label><label>Interface visibility <select value={prefs.uiMode} onChange={e=>change('uiMode',e.target.value)}>{uiModes.map(m=><option key={m} value={m}>{m[0].toUpperCase()+m.slice(1)}</option>)}</select></label><PresetSettings prefs={prefs} change={change}/><h3>Files and drawing</h3><label>Remember last folder <input type="checkbox" checked={prefs.rememberFolder} onChange={e=>setRememberPreference(e.target.checked)}/></label><label>Default canvas width (px) <input type="number" min="1" max="16384" value={defaultSizeDraft?.[0]??prefs.defaultWidth} onChange={e=>setDefaultSizeDraft([e.target.value,defaultSizeDraft?.[1]??prefs.defaultHeight])}/></label><label>Default canvas height (px) <input type="number" min="1" max="16384" value={defaultSizeDraft?.[1]??prefs.defaultHeight} onChange={e=>setDefaultSizeDraft([defaultSizeDraft?.[0]??prefs.defaultWidth,e.target.value])}/></label>{defaultSizeDraft&&<button disabled={!validCanvasSize(...defaultSizeDraft.map(Number))} onClick={()=>{const [w,h]=defaultSizeDraft.map(Number);if(validCanvasSize(w,h)){setPrefs(p=>({...p,defaultWidth:w,defaultHeight:h}));setDefaultSizeDraft(null)}}}>Apply default size</button>}<small>Applies to new sketches; maximum 40 megapixels and 16384 px per side.</small><label>Folder view <select value={prefs.fileView} onChange={e=>change('fileView',e.target.value)}><option value="list">List</option><option value="gallery">Gallery</option></select></label><label>Folder density <select value={prefs.fileDensity} onChange={e=>change('fileDensity',e.target.value)}><option value="dense">Dense</option><option value="normal">Normal</option><option value="spacious">Spacious</option></select></label><label>Default new-page background <select value={prefs.newBackground} onChange={e=>change('newBackground',e.target.value)}><option value="transparent">Transparent</option><option value="color">Solid colour</option></select></label>{prefs.newBackground==='color'&&<label>Background colour <input type="color" value={prefs.newBackgroundColor} onChange={e=>change('newBackgroundColor',e.target.value)}/></label>}<small>Background applies to new sketches only. Solid colour is part of the saved raster; transparent pages are displayed on white. JPEG cannot store transparency.</small><label>Save as format <select value={prefs.format} onChange={e=>change('format',e.target.value)}><option value="webp">WebP (lossless)</option><option value="png">PNG (lossless)</option><option value="jpeg">JPEG</option></select></label><label>Autosave to opened file <input type="checkbox" checked={prefs.autosave} onChange={e=>change('autosave',e.target.checked)}/></label><label>Autosave idle seconds <input type="number" min="1" max="120" value={prefs.delay} onChange={e=>change('delay',Math.max(1,+e.target.value||5))}/></label><label>Pressure sensitivity <input type="checkbox" checked={prefs.pressure} onChange={e=>change('pressure',e.target.checked)}/></label><label>Pen only (ignore touch/mouse) <input type="checkbox" checked={prefs.penOnly} onChange={e=>change('penOnly',e.target.checked)}/></label><label>Eraser width multiplier <input type="number" min="1" max="30" value={prefs.eraser} onChange={e=>change('eraser',Math.max(1,+e.target.value||1))}/></label>{[['penButton','Pen barrel button'],['penTip','Pen eraser tip']].map(([key,label])=><label key={key}>{label}<select value={prefs[key]} onChange={e=>change(key,e.target.value)}>{['undo','erase','save','reset'].map(v=><option key={v}>{v}</option>)}</select></label>)}<small>JPEG autosave is disabled to avoid cumulative loss. Settings stay in this browser; sketches stay in your files.</small></>}
   {dialog==='commands'&&<><input autoFocus placeholder="Search commands…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="commands">{commands.filter(c=>c[0].toLowerCase().includes(query.toLowerCase())).map(([label,fn,shortcut])=><button key={label} onClick={()=>{setDialog(null);fn()}}>{label}<small>{shortcut}</small></button>)}</div></>}
  </section></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
