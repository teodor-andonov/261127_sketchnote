import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {drawGrid,GridMode} from '../../canvas/grid';
import {presetView,zoomAt,panBy,resizeView,pinchMetrics} from '../../viewport.js';

export type CanvasRefs={previewCanvas:HTMLCanvasElement;finalCanvas:HTMLCanvasElement;gridCanvas:HTMLCanvasElement;scrollEl:HTMLDivElement};
type View={mode:'actual'|'fit'|'fill'|'custom';scale:number;x:number;y:number};
export type CanvasHostProps={
 width:number;height:number;documentId:number;resetToken:number;
 zoomMode:'actual'|'fit'|'fill';gridMode:GridMode;gridSize:number;gridLineThickness:number;gridDotMultiplier:number;gridColor:string;overlayColor?:string;
 penOnly:boolean;navigationDisabled:boolean;onCancelStroke:()=>void;onViewChange:(view:{mode:View['mode'];scale:number})=>void;onReady:(refs:CanvasRefs|null)=>void;
};
type Point={x:number;y:number};
export function CanvasHost(props:CanvasHostProps){
 const {width,height,zoomMode,documentId,resetToken,gridMode,gridSize,gridLineThickness,gridDotMultiplier,gridColor,overlayColor,onReady}=props;
 const host=useRef<HTMLDivElement>(null),layer=useRef<HTMLDivElement>(null),final=useRef<HTMLCanvasElement>(null),grid=useRef<HTMLCanvasElement>(null),preview=useRef<HTMLCanvasElement>(null);
 const latest=useRef(props);latest.current=props;
 const camera=useRef<View>({mode:zoomMode,scale:1,x:0,y:0}),size=useRef({w:0,h:0});
 const raf=useRef(0), [hand,setHand]=useState(false);
 const render=()=>{
   const v=camera.current;
   if(layer.current)layer.current.style.transform='translate3d('+v.x+'px,'+v.y+'px,0) scale('+v.scale+')';
   if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;const {mode,scale}=camera.current;latest.current.onViewChange({mode,scale})});
 };
 const reset=()=>{const el=host.current;if(!el||!el.clientWidth||!el.clientHeight)return;size.current={w:el.clientWidth,h:el.clientHeight};camera.current=presetView(latest.current.zoomMode,latest.current.width,latest.current.height,size.current.w,size.current.h);render()};
 useLayoutEffect(()=>{if(preview.current&&final.current&&grid.current&&host.current)onReady({previewCanvas:preview.current,finalCanvas:final.current,gridCanvas:grid.current,scrollEl:host.current});return()=>onReady(null)},[onReady]);
 useLayoutEffect(()=>{reset()},[width,height,documentId,zoomMode,resetToken]);
 useLayoutEffect(()=>{
   const el=host.current!;const observer=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;const old=size.current;if(w===old.w&&h===old.h)return;camera.current=old.w?resizeView(camera.current,latest.current.width,latest.current.height,old.w,old.h,w,h):presetView(latest.current.zoomMode,latest.current.width,latest.current.height,w,h);size.current={w,h};render()});observer.observe(el);
   return()=>{observer.disconnect();cancelAnimationFrame(raf.current);raf.current=0}
 },[]);
 useEffect(()=>{const c=grid.current,ctx=c?.getContext('2d');if(c&&ctx)drawGrid(c,ctx,width,height,gridSize,gridMode,gridLineThickness,gridDotMultiplier,gridColor)},[width,height,gridSize,gridMode,gridLineThickness,gridDotMultiplier,gridColor]);
 useLayoutEffect(()=>{
   const el=host.current!,ink=preview.current!;
   let space=false,panId:number|null=null,panPoint:Point|null=null,drawId:number|null=null,drawType='',pinching=false,ignored=new Set<number>();
   const touches=new Map<number,Point>();
   const local=(e:{clientX:number;clientY:number})=>{const r=el.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
   const inside=(e:Event)=>e.composedPath().includes(el);
   const onInk=(e:Event)=>e.composedPath().includes(ink);
   const block=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation()};
   const capture=(id:number)=>{try{el.setPointerCapture(id)}catch{}};
   const release=(id:number)=>{try{if(el.hasPointerCapture(id))el.releasePointerCapture(id)}catch{}};
   const cancelDrawing=()=>{if(drawId===null)return;ink.dispatchEvent(new Event('sketch-navigation-cancel'));latest.current.onCancelStroke();drawId=null;drawType=''};
   const startPan=(id:number,p:Point)=>{panId=id;panPoint=p;capture(id);setHand(true)};
   const down=(e:PointerEvent)=>{
     if(!inside(e)||latest.current.navigationDisabled)return;
     const p=local(e);
     if(e.pointerType==='touch'){
       if(drawType==='pen'){ignored.add(e.pointerId);block(e);return}
       touches.set(e.pointerId,p);
       if(touches.size>=2){
         if(drawType==='touch')cancelDrawing();
         panId=null;panPoint=null;pinching=true;for(const id of touches.keys())capture(id);setHand(true);block(e);return;
       }
       if(latest.current.penOnly||!onInk(e)){startPan(e.pointerId,p);block(e);return}
       drawId=e.pointerId;drawType='touch';return;
     }
     if(pinching||panId!==null||drawId!==null){ignored.add(e.pointerId);block(e);return}
     if(e.pointerType!=='pen'&&(e.button===1||(space&&e.button===0)||(!onInk(e)&&e.button===0))){startPan(e.pointerId,p);block(e);return}
     if(onInk(e)){drawId=e.pointerId;drawType=e.pointerType}
   };
   const move=(e:PointerEvent)=>{
     if(ignored.has(e.pointerId)){block(e);return}
     if(e.pointerType==='touch'&&touches.has(e.pointerId)){
       if(pinching){
         const before=[...touches.values()].slice(0,2);touches.set(e.pointerId,local(e));const after=[...touches.values()].slice(0,2);
         if(before.length===2&&after.length===2){const a=pinchMetrics(before),b=pinchMetrics(after);camera.current=zoomAt(camera.current,camera.current.scale*b.distance/a.distance,b.x,b.y,a.x,a.y);render()}
         else if(before.length===1&&after.length===1){camera.current=panBy(camera.current,after[0].x-before[0].x,after[0].y-before[0].y);render()}
         block(e);return;
       }
       touches.set(e.pointerId,local(e));
     }
     if(panId===e.pointerId&&panPoint){const p=local(e);camera.current=panBy(camera.current,p.x-panPoint.x,p.y-panPoint.y);panPoint=p;render();block(e);return}
     if((pinching||panId!==null)&&inside(e)){block(e);return}
     if(space&&drawId===null&&inside(e)&&e.pointerType!=='pen'){block(e);return}
   };
   const end=(e:PointerEvent)=>{
     if(ignored.delete(e.pointerId)){block(e);return}
     if(touches.has(e.pointerId)){
       touches.delete(e.pointerId);
       if(pinching){release(e.pointerId);if(!touches.size){pinching=false;setHand(space)}block(e);return}
     }
     if(panId===e.pointerId){panId=null;panPoint=null;release(e.pointerId);setHand(space);block(e);return}
     if(drawId===e.pointerId){drawId=null;drawType=''}
   };
   const wheel=(e:WheelEvent)=>{
     e.preventDefault();if(latest.current.navigationDisabled||drawId!==null||panId!==null||pinching)return;
     const p=local(e),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1);
     camera.current=zoomAt(camera.current,camera.current.scale*Math.exp(-Math.max(-500,Math.min(500,delta))*.002),p.x,p.y);render();
   };
   const keydown=(e:KeyboardEvent)=>{
     if(e.code!=='Space'||latest.current.navigationDisabled||e.ctrlKey||e.metaKey||e.altKey||e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,button,[contenteditable]'))return;
     e.preventDefault();space=true;if(drawId===null)setHand(true);
   };
   const keyup=(e:KeyboardEvent)=>{if(e.code==='Space'){space=false;if(panId===null&&!pinching)setHand(false)}};
   const blur=()=>{for(const id of touches.keys())release(id);if(panId!==null)release(panId);touches.clear();ignored.clear();panId=null;panPoint=null;drawId=null;drawType='';pinching=false;space=false;setHand(false)};
   const events:[string,EventListener][]=[['pointerdown',down as EventListener],['pointermove',move as EventListener],['pointerup',end as EventListener],['pointercancel',end as EventListener],['keydown',keydown as EventListener],['keyup',keyup as EventListener],['blur',blur]];
   for(const [name,fn] of events)window.addEventListener(name,fn,{capture:true,passive:false});
   el.addEventListener('wheel',wheel,{passive:false});
   return()=>{for(const [name,fn] of events)window.removeEventListener(name,fn,true);el.removeEventListener('wheel',wheel);blur()};
 },[]);
 return <div className="sketchpad-canvas-host"><div ref={host} className={'sketchpad-canvas-scroll '+(hand?'is-navigating':'')} aria-label="Sketch canvas viewport">
   <div ref={layer} className="sketchpad-canvas-layer" style={{width,height,transformOrigin:'top left'}}>
     <canvas ref={final} width={width} height={height} className="sketchpad-canvas-final" style={{background:overlayColor||'transparent'}}/>
     <canvas ref={grid} width={width} height={height} className="sketchpad-canvas-grid" style={{display:gridMode==='none'?'none':undefined}}/>
     <canvas ref={preview} width={width} height={height} className="sketchpad-canvas-preview"/>
   </div>
 </div></div>
}
