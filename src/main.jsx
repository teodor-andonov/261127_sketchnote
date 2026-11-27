import React,{useState,useRef,useCallback,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {Pencil,Minus,Square,Circle,Eraser,Undo2,Redo2,FilePlus,FolderOpen,Save,SaveAll,ImagePlus,Clipboard,Trash2,Settings,Command,Check,X,Folder,PaintBucket,SunMoon,PanelLeftClose,PanelLeftOpen,Grid2X2,Grip,AlignJustify,SquareDashed,Scan,Maximize,ZoomIn,Hand} from 'lucide-react';
import {CanvasHost} from './ui/components/CanvasHost';
import {useToolBindings} from './ui/hooks/useToolBindings';
import {usePasteController} from './ui/hooks/usePasteController';
import {usePenActions} from './ui/hooks/usePenActions';
import {TileHistory} from './history';
import {decode,encodeCanvas,write,download,formatOf,formats,suggestName,imageTypes} from './files';
import './style.css';
const VERSION='1.1.0';
const COMMIT=import.meta.env.VITE_COMMIT||'local';
const basePrefs={color:'#171717',width:3,opacity:1,pressure:true,penOnly:false,fill:false,grid:'none',zoom:'fit',dark:matchMedia('(prefers-color-scheme: dark)').matches,autosave:true,delay:5,format:'webp',eraser:5,penButton:'undo',penTip:'erase'};
function readPrefs(){try{return {...basePrefs,...JSON.parse(localStorage.getItem('sketchnote.preferences')||'{}')}}catch{return basePrefs}}
const stamp=()=> 'sketch_'+new Date().toISOString().replace(/[-:T]/g,'').slice(2,14);
const tools=[['pen',Pencil,'Pen (D)'],['segment',Minus,'Line (L)'],['box',Square,'Rectangle (R)'],['oval',Circle,'Ellipse (O)'],['rubber',Eraser,'Eraser (E)']];
const gridModes=['none','grid','dots','hlines'],zoomModes=['actual','fit','fill'];
const gridIcons={none:SquareDashed,grid:Grid2X2,dots:Grip,hlines:AlignJustify},gridLabels={none:'None',grid:'Grid',dots:'Dots',hlines:'Lines'};
const zoomIcons={actual:Scan,fit:Maximize,fill:ZoomIn,custom:Hand},zoomLabels={actual:'Actual size',fit:'Fit',fill:'Fill',custom:'Custom'};
const nextMode=(modes,current)=>modes[(modes.indexOf(current)+1)%modes.length];
const swatches=['#171717','#ffffff','#666666','#365c9d','#408457','#ba4949','#b68929','#9060a6'];
const B=({icon:Icon,label,onClick,active,disabled})=><button className={'icon '+(active?'active':'')} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon size={17}/></button>;
function App(){
 const [prefs,setPrefs]=useState(readPrefs),[tool,setTool]=useState('pen'),[refs,setRefs]=useState(null),[doc,setDoc]=useState(()=>({id:1,width:1200,height:800,image:null})),[name,setName]=useState(()=>stamp()+'.webp'),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Ready'),[historyTick,bump]=useState(0),[dialog,setDialog]=useState(null),[query,setQuery]=useState(''),[folder,setFolder]=useState(null),[folderFiles,setFolderFiles]=useState([]),[sidebar,setSidebar]=useState(false),[newSize,setNewSize]=useState([1200,800]);
 const [view,setView]=useState({mode:prefs.zoom,scale:1}),[viewReset,setViewReset]=useState(0);
 const resetView=mode=>{change('zoom',mode);setViewReset(x=>x+1)};
 const cancelStroke=useCallback(()=>{const hist=h.current;if(hist)hist.ctx.putImageData(hist.current,0,0)},[]);
 const h=useRef(null),handle=useRef(null),folderRef=useRef(null),revision=useRef(0),clean=useRef(0),timer=useRef(null),saving=useRef(false),docRef=useRef(doc),readyDoc=useRef(null),openInput=useRef(null),importInput=useRef(null),alive=useRef(true),saveLatest=useRef(null),loadLatest=useRef(null),dirtyRef=useRef(false),busyRef=useRef(false);
 const change=(k,v)=>setPrefs(p=>({...p,[k]:v}));
 useEffect(()=>{try{localStorage.setItem('sketchnote.preferences',JSON.stringify(prefs))}catch{}document.documentElement.dataset.theme=prefs.dark?'dark':'light'},[prefs]);
 const markDirty=useCallback(()=>{revision.current++;dirtyRef.current=true;setDirty(true);bump(x=>x+1);setStatus('Unsaved changes')},[]);
 const commit=useCallback(()=>{if(h.current?.commit())markDirty()},[markDirty]);
 const paste=usePasteController({canvasRefs:refs,canvasSize:doc,isPaused:busy,onCommit:commit});
 const undo=useCallback(()=>{if(h.current?.undo())markDirty()},[markDirty]);
 const redo=useCallback(()=>{if(h.current?.redo())markDirty()},[markDirty]);
 const clear=useCallback(()=>{if(!refs||busyRef.current)return;if(!confirm('Clear the entire sketch?'))return;refs.finalCanvas.getContext('2d').clearRect(0,0,refs.finalCanvas.width,refs.finalCanvas.height);commit()},[refs,commit]);
 const pen=usePenActions({canvasRefs:refs,penButtonAction:prefs.penButton,eraserTipAction:prefs.penTip,activeTool:tool,setActiveTool:setTool,onUndo:undo,onReset:clear,onSave:()=>saveLatest.current?.(false,false),isPaused:!!paste.pasteState||busy});
 const eraserCommit=useCallback(()=>{commit();pen.handleEraserCommit()},[commit,pen.handleEraserCommit]);
 useToolBindings({canvasRefs:refs,activeTool:tool,lineWidth:prefs.width,color:prefs.color,opacity:prefs.opacity,fillEnabled:prefs.fill,penOnlyMode:prefs.penOnly,pressureEnabled:prefs.pressure,pressureFactor:.7,eraserWidthMultiplier:prefs.eraser,eraserPreviewEnabled:true,onCommit:commit,onEraserCommit:eraserCommit,rebindToken:doc.id,isPaused:!!paste.pasteState||busy});
 useEffect(()=>{if(!refs)return;if(readyDoc.current===doc.id&&h.current?.ctx.canvas===refs.finalCanvas)return;const ctx=refs.finalCanvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,doc.width,doc.height);if(doc.image)ctx.drawImage(doc.image,0,0);h.current=new TileHistory(ctx);readyDoc.current=doc.id;bump(x=>x+1)},[refs,doc]);
 const allowReplace=()=>!busyRef.current&&!saving.current&&(!dirtyRef.current||confirm('Discard unsaved changes?'));
 const installDoc=(image,fileName,fileHandle,width,height)=>{clearTimeout(timer.current);paste.cancelPaste();handle.current=fileHandle;revision.current=0;clean.current=0;dirtyRef.current=false;setDirty(false);setName(fileName);const d={id:docRef.current.id+1,width,height,image};docRef.current=d;setDoc(d);setStatus(fileHandle?'Opened local file':'Ready');setDialog(null)};
 const openFile=async (f,fh=null)=>{if(!allowReplace())return;busyRef.current=true;setBusy(true);try{const image=await decode(f);if(image.naturalWidth*image.naturalHeight>40000000||Math.max(image.naturalWidth,image.naturalHeight)>16384)throw Error('Image exceeds the 40 megapixel / 16384px canvas limit');installDoc(image,f.name,fh,image.naturalWidth,image.naturalHeight)}catch(e){setStatus(String(e.message||e))}finally{busyRef.current=false;setBusy(false)}};
 loadLatest.current=async fh=>{try{await openFile(await fh.getFile(),fh)}catch(e){setStatus(String(e.message||e))}};
 const open=async()=>{if(busyRef.current||saving.current)return;try{if(window.showOpenFilePicker){const [fh]=await window.showOpenFilePicker({types:imageTypes,multiple:false});if(fh)await loadLatest.current(fh)}else openInput.current.click()}catch(e){if(e.name!=='AbortError')setStatus(e.message)}};
 const openFolder=async()=>{if(!window.showDirectoryPicker){setStatus('Folder access is unavailable in this browser');return}try{const dir=await window.showDirectoryPicker({mode:'readwrite'});folderRef.current=dir;setFolder(dir.name);setSidebar(true);await refreshFolder(dir)}catch(e){if(e.name!=='AbortError')setStatus(e.message)}};
 async function refreshFolder(dir=folderRef.current){if(!dir)return;const list=[];for await(const entry of dir.values())if(entry.kind==='file'&&/\.(webp|png|jpe?g)$/i.test(entry.name))list.push(entry);setFolderFiles(list.sort((a,b)=>a.name.localeCompare(b.name)))}
 const save=async (as=false,automatic=false)=>{
  if(!refs||readyDoc.current!==docRef.current.id||saving.current||busyRef.current||paste.pasteState)return;
  if(automatic&&(!dirtyRef.current||!handle.current||formatOf(name)==='jpeg'))return;
  saving.current=true;
  const rev=revision.current,old=handle.current;let target=as?null:old,format=target?formatOf(target.name):prefs.format;
  try{
   if(automatic&&target.queryPermission&&await target.queryPermission({mode:'readwrite'})!=='granted')return;
   if(!automatic&&!target&&window.showSaveFilePicker){
    target=await window.showSaveFilePicker({suggestedName:suggestName(name,format),types:[{description:format.toUpperCase(),accept:{[formats[format].mime]:[formats[format].ext]}}],...(folderRef.current?{startIn:folderRef.current}:{})});
    format=formatOf(target.name);
   }
   if(target&&!automatic&&target.requestPermission&&await target.requestPermission({mode:'readwrite'})!=='granted')throw Error('Write permission not granted');
   setStatus('Saving…');const blob=await encodeCanvas(refs.finalCanvas,format);
   if(target){await write(target,blob);handle.current=target;setName(target.name)}
   else{const n=suggestName(name,format);download(blob,n);setName(n)}
   if(revision.current===rev){clean.current=rev;dirtyRef.current=false;setDirty(false)}
   setStatus(target?'Saved to disk':'Image exported');if(folderRef.current)refreshFolder().catch(()=>{});
  }catch(e){if(e.name!=='AbortError')setStatus('Save failed: '+(e.message||e))}
  finally{saving.current=false;if(dirtyRef.current&&revision.current!==rev&&prefs.autosave&&handle.current){clearTimeout(timer.current);timer.current=setTimeout(()=>saveLatest.current?.(false,true),prefs.delay*1000)}}
 };
 saveLatest.current=save;
 useEffect(()=>{clearTimeout(timer.current);if(dirty&&prefs.autosave&&handle.current&&formatOf(name)!=='jpeg')timer.current=setTimeout(()=>saveLatest.current?.(false,true),Math.max(1,prefs.delay)*1000);return()=>clearTimeout(timer.current)},[historyTick,dirty,prefs.autosave,prefs.delay,name]);
 useEffect(()=>{const fn=e=>{if(dirtyRef.current||saving.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn)},[]);
 useEffect(()=>{if(window.launchQueue)window.launchQueue.setConsumer(async params=>{if(params.files?.length)await loadLatest.current(params.files[0])})},[]);
 const newSketch=()=>{if(!allowReplace())return;setNewSize([doc.width,doc.height]);setDialog('new')};
 const createSketch=()=>{const [w,h]=newSize.map(Number);if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>40000000||Math.max(w,h)>16384){setStatus('Invalid canvas size');return}installDoc(null,stamp()+formats[prefs.format].ext,null,w,h)};
 const pasteFile=async file=>{try{paste.startPasteFromImage(await decode(file))}catch(e){setStatus(e.message)}};
 const pasteClipboard=async()=>{try{for(const item of await navigator.clipboard.read()){const type=item.types.find(t=>t.startsWith('image/'));if(type){await pasteFile(await item.getType(type));return}}setStatus('No image on clipboard')}catch{setStatus('Use Ctrl+V or Import image')}};
 useEffect(()=>{const fn=e=>{if(dialog||busy||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||''))return;const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));const file=item?.getAsFile();if(file){e.preventDefault();pasteFile(file)}};window.addEventListener('paste',fn);return()=>window.removeEventListener('paste',fn)},[paste,dialog,busy]);
 const commands=[['New sketch',newSketch,'Ctrl+N'],['Open image',open,'Ctrl+O'],['Open folder',openFolder,''],['Save',()=>save(false,false),'Ctrl+S'],['Save as',()=>save(true,false),'Ctrl+Shift+S'],['Import image',()=>importInput.current.click(),''],['Paste image',pasteClipboard,'Ctrl+V'],['Undo',undo,'Ctrl+Z'],['Redo',redo,'Ctrl+Shift+Z'],['Clear canvas',clear,''],['Grid: cycle',()=>change('grid',nextMode(gridModes,prefs.grid)),''],['Zoom: cycle',()=>resetView(nextMode(zoomModes,view.mode)),''],['Zoom: fit',()=>resetView('fit'),''],['Zoom: actual size',()=>resetView('actual'),''],['Zoom: fill',()=>resetView('fill'),''],['Settings',()=>setDialog('settings'),''],...tools.map(([id,,label])=>[label,()=>setTool(id),''])];
 useEffect(()=>{const fn=e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==='k'){e.preventDefault();setQuery('');setDialog(x=>x==='commands'?null:'commands');return}if(e.key==='Escape'){if(dialog)setDialog(null);else paste.cancelPaste();return}if(/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')||dialog||busy)return;if(mod&&['s','o','n','z','y'].includes(key)){e.preventDefault();if(key==='s')save(e.shiftKey,false);if(key==='o')open();if(key==='n')newSketch();if(key==='z')(e.shiftKey?redo:undo)();if(key==='y')redo();return}if(!mod){const t={d:'pen',l:'segment',r:'box',o:'oval',e:'rubber'}[key];if(t)setTool(t);if(key==='enter'&&paste.pasteState)paste.commitPaste()}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[dialog,busy,paste,refs,prefs,name,doc]);
 return <div className="sketchpad-app" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file?.type.startsWith('image/'))openFile(file)}}>
  <header><Pencil size={18}/><strong>Sketchnote</strong><span className="separator"/><span className="filename" title={name}>{name}{dirty?' *':''}</span><div className="spacer"/><B icon={Command} label="Commands (Ctrl+K)" onClick={()=>{setQuery('');setDialog('commands')}}/><B icon={Settings} label="Settings" onClick={()=>setDialog('settings')}/></header>
  <div className="toolbar">
   <B icon={FilePlus} label="New sketch" onClick={newSketch}/><B icon={FolderOpen} label="Open image" onClick={open}/><B icon={Folder} label="Open folder" onClick={openFolder}/><B icon={Save} label="Save" onClick={()=>save()} disabled={busy}/><B icon={SaveAll} label="Save as" onClick={()=>save(true)} disabled={busy}/><span className="separator"/>
   {tools.map(([id,icon,label])=><B key={id} icon={icon} label={label} active={tool===id} onClick={()=>{paste.cancelPaste();pen.clearRestoreTool();setTool(id)}}/>)}
   <span className="separator"/><div className="swatches">{swatches.map(c=><button key={c} aria-label={'Color '+c} title={c} className={'swatch '+(prefs.color===c?'selected':'')} style={{background:c}} onClick={()=>change('color',c)}/>)}</div><input aria-label="Custom color" title="Custom color" type="color" value={prefs.color} onChange={e=>change('color',e.target.value)}/>
   <label title="Stroke width" className="compact"><input aria-label="Stroke width" type="number" min="1" max="150" value={prefs.width} onChange={e=>change('width',Math.min(150,Math.max(1,Number(e.target.value)||1)))}/> px</label>
   <select aria-label="Opacity" title="Opacity" value={prefs.opacity} onChange={e=>change('opacity',+e.target.value)}>{[.25,.5,.75,1].map(o=><option key={o} value={o}>{o*100}%</option>)}</select>
   <B icon={PaintBucket} label="Fill shapes" active={prefs.fill} onClick={()=>change('fill',!prefs.fill)}/><span className="separator"/>
   <B icon={Undo2} label="Undo" onClick={undo} disabled={!h.current?.index||busy}/><B icon={Redo2} label="Redo" onClick={redo} disabled={!h.current||h.current.index>=h.current.entries.length||busy}/><B icon={ImagePlus} label="Import image onto canvas" onClick={()=>importInput.current.click()}/><B icon={Clipboard} label="Paste image" onClick={pasteClipboard}/><B icon={Trash2} label="Clear canvas" onClick={clear}/>
   <B icon={gridIcons[prefs.grid]||SquareDashed} label={'Grid: '+(gridLabels[prefs.grid]||'None')+' · click to cycle'} active={prefs.grid!=='none'} onClick={()=>change('grid',nextMode(gridModes,prefs.grid))}/><B icon={zoomIcons[view.mode]||Hand} label={'Zoom: '+zoomLabels[view.mode]+' · click to cycle'} onClick={()=>resetView(nextMode(zoomModes,view.mode))}/><B icon={SunMoon} label="Toggle theme" onClick={()=>change('dark',!prefs.dark)}/>
  </div>
  <main>{sidebar&&<aside><div className="sidehead"><strong>{folder||'Files'}</strong><B icon={PanelLeftClose} label="Hide folder" onClick={()=>setSidebar(false)}/></div>{folderFiles.map(f=><button key={f.name} className="file" title={f.name} onClick={()=>loadLatest.current(f)}>{f.name}</button>)}</aside>}<div className="workspace"><CanvasHost documentId={doc.id} resetToken={viewReset} penOnly={prefs.penOnly} navigationDisabled={busy||!!dialog} onCancelStroke={cancelStroke} onViewChange={setView} width={doc.width} height={doc.height} zoomMode={prefs.zoom} gridMode={prefs.grid} gridSize={50} gridLineThickness={1} gridDotMultiplier={2} gridColor="rgba(110,110,110,.2)" overlayColor="transparent" onReady={setRefs}/>{paste.pasteState&&<div className="pastebar"><span>Move or resize image</span><B icon={Check} label="Commit paste" onClick={paste.commitPaste}/><B icon={X} label="Cancel paste" onClick={paste.cancelPaste}/></div>}</div></main>
  <footer>{folder&&!sidebar&&<B icon={PanelLeftOpen} label="Show folder" onClick={()=>setSidebar(true)}/>}<span role="status">{status}</span><div className="spacer"/><span>{doc.width} × {doc.height} · {Math.round(view.scale*100)}%</span><span>{Math.round((h.current?.bytes||0)/1048576)} MB history</span><span>v{VERSION} · {COMMIT.slice(0,7)}</span></footer>
  <input ref={openInput} hidden type="file" accept="image/png,image/webp,image/jpeg" onChange={e=>{if(e.target.files[0])openFile(e.target.files[0]);e.target.value=''}}/><input ref={importInput} hidden type="file" accept="image/*" onChange={e=>{if(e.target.files[0])pasteFile(e.target.files[0]);e.target.value=''}}/>
  {dialog&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label={dialog}><div className="modalhead"><strong>{dialog==='new'?'New sketch':dialog==='settings'?'Settings':'Commands'}</strong><B icon={X} label="Close" onClick={()=>setDialog(null)}/></div>
   {dialog==='new'&&<><label>Width <input type="number" min="1" value={newSize[0]} onChange={e=>setNewSize([e.target.value,newSize[1]])}/></label><label>Height <input type="number" min="1" value={newSize[1]} onChange={e=>setNewSize([newSize[0],e.target.value])}/></label><button onClick={createSketch}>Create sketch</button></>}
   {dialog==='settings'&&<><label>Save as format <select value={prefs.format} onChange={e=>change('format',e.target.value)}><option value="webp">WebP (lossless)</option><option value="png">PNG (lossless)</option><option value="jpeg">JPEG</option></select></label><label>Autosave to opened file <input type="checkbox" checked={prefs.autosave} onChange={e=>change('autosave',e.target.checked)}/></label><label>Autosave idle seconds <input type="number" min="1" max="120" value={prefs.delay} onChange={e=>change('delay',Math.max(1,+e.target.value||5))}/></label><label>Pressure sensitivity <input type="checkbox" checked={prefs.pressure} onChange={e=>change('pressure',e.target.checked)}/></label><label>Pen only (ignore touch/mouse) <input type="checkbox" checked={prefs.penOnly} onChange={e=>change('penOnly',e.target.checked)}/></label><label>Eraser width multiplier <input type="number" min="1" max="30" value={prefs.eraser} onChange={e=>change('eraser',Math.max(1,+e.target.value||1))}/></label>{[['penButton','Pen barrel button'],['penTip','Pen eraser tip']].map(([key,label])=><label key={key}>{label}<select value={prefs[key]} onChange={e=>change(key,e.target.value)}>{['undo','erase','save','reset'].map(v=><option key={v}>{v}</option>)}</select></label>)}<small>JPEG autosave is disabled to avoid cumulative loss. Settings stay in this browser; sketches stay in your files.</small></>}
   {dialog==='commands'&&<><input autoFocus placeholder="Search commands…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="commands">{commands.filter(c=>c[0].toLowerCase().includes(query.toLowerCase())).map(([label,fn,shortcut])=><button key={label} onClick={()=>{setDialog(null);fn()}}>{label}<small>{shortcut}</small></button>)}</div></>}
  </section></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
