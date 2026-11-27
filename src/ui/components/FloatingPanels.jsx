import React,{useLayoutEffect,useRef,useState} from 'react';
import {isVertical,clampPanelSize} from '../../layout';
export function FloatingPanels({toolbarPosition,sidebarPosition,sidebarWidth,sidebarHeight,onResize,sidebarOpen,uiMode,toggle,visibility,toolbar,sidebar}){
 const toolbarRef=useRef(null),rootRef=useRef(null),dragRef=useRef(null);
 const [extent,setExtent]=useState({w:0,h:0}),[draft,setDraft]=useState(null);
 const vertical=isVertical(sidebarPosition),hidden=uiMode==='hidden';
 useLayoutEffect(()=>{
  const el=toolbarRef.current;if(!el)return;
  const update=()=>{const w=el.offsetWidth,h=el.offsetHeight;setExtent(v=>v.w===w&&v.h===h?v:{w,h})};
  update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();
 },[toolbarPosition,uiMode]);
 const sizeKey=vertical?'sidebarWidth':'sidebarHeight',savedSize=vertical?sidebarWidth:sidebarHeight;
 const available=()=>Math.max(60,(vertical?rootRef.current?.clientWidth:rootRef.current?.clientHeight)*.55||240);
 const resize=(event)=>{
  if(event.button!==0&&event.pointerType!=='touch'&&event.pointerType!=='pen')return;
  const handle=event.currentTarget;event.preventDefault();handle.setPointerCapture(event.pointerId);
  const rect=handle.parentElement.getBoundingClientRect(),start=vertical?event.clientX:event.clientY;
  dragRef.current={id:event.pointerId,start,size:vertical?rect.width:rect.height,sign:sidebarPosition==='left'||sidebarPosition==='top'?1:-1,key:sizeKey};
 };
 const move=event=>{const d=dragRef.current;if(!d||event.pointerId!==d.id)return;const current=vertical?event.clientX:event.clientY;const value=clampPanelSize(d.size+(current-d.start)*d.sign,available());d.value=value;setDraft(value)};
 const finish=event=>{const d=dragRef.current;if(!d||event.pointerId!==d.id)return;dragRef.current=null;if(d.value!==undefined)onResize(d.key,Math.round(d.value));setDraft(null)};
 const onKeyDown=event=>{
  const key=event.key,delta=vertical?(key==='ArrowRight'?1:key==='ArrowLeft'?-1:0):(key==='ArrowDown'?1:key==='ArrowUp'?-1:0);
  if(!delta)return;event.preventDefault();const sign=sidebarPosition==='left'||sidebarPosition==='top'?1:-1;
  onResize(sizeKey,Math.round(clampPanelSize(savedSize+delta*sign*16,available())));
 };
 const style={'--toolbar-w':extent.w+'px','--toolbar-h':extent.h+'px','--sidebar-size':(draft??savedSize)+'px'};
 return <div ref={rootRef} className={'floating-panels ui-'+uiMode+' toolbar-'+toolbarPosition+' sidebar-'+sidebarPosition} style={style}>
  {uiMode==='full'&&<div className="sidebar-toggle floating-surface">{toggle}</div>}
  <div ref={toolbarRef} className={'floating-toolbar floating-surface '+(hidden?'only-visibility':'')} role="toolbar" aria-label="Drawing toolbar" aria-orientation={isVertical(toolbarPosition)?'vertical':'horizontal'}>
   {!hidden&&<div className="toolbar-content">{toolbar}</div>}
   <div className="visibility-control">{visibility}</div>
  </div>
  {sidebarOpen&&<aside className="floating-sidebar floating-surface" aria-label="Files">
   {sidebar}
   <div className="sidebar-resize" role="separator" tabIndex={0} aria-label="Resize sidebar" aria-orientation={vertical?'vertical':'horizontal'} onPointerDown={resize} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={onKeyDown}/>
  </aside>}
 </div>
}
