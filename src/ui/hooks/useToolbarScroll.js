import {useEffect} from 'react';
import {toolbarWheelDelta,dragExceeded} from '../../layout.js';

// Scroll the overflowing strip without stealing normal button clicks or precise inputs.
export function useToolbarScroll(ref,vertical,mode){
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  let drag=null,suppressClick=false;
  const overflow=()=>vertical?el.scrollHeight>el.clientHeight+1:el.scrollWidth>el.clientWidth+1;
  const read=()=>vertical?el.scrollTop:el.scrollLeft;
  const write=value=>{if(vertical)el.scrollTop=value;else el.scrollLeft=value};
  const coord=e=>vertical?e.clientY:e.clientX;
  const wheel=e=>{
   if(!overflow()||e.ctrlKey||e.metaKey)return;
   if(e.target.closest?.('input,select,textarea,[contenteditable]'))return;
   const delta=toolbarWheelDelta(e.deltaX,e.deltaY,e.deltaMode,vertical,vertical?el.clientHeight:el.clientWidth);
   if(!delta)return;e.preventDefault();e.stopPropagation();write(read()+delta);
  };
  const down=e=>{
   suppressClick=false;
   if(drag||!overflow()||e.button!==0||e.isPrimary===false||e.target.closest?.('input,select,textarea,[contenteditable]'))return;
   drag={id:e.pointerId,start:coord(e),scroll:read(),moved:false};
  };
  const move=e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const delta=coord(e)-drag.start;
   if(!drag.moved){
    if(!dragExceeded(delta))return;
    drag.moved=true;suppressClick=true;el.classList.add('toolbar-dragging');
    try{el.setPointerCapture(e.pointerId)}catch{}
   }
   e.preventDefault();e.stopPropagation();write(drag.scroll-delta);
  };
  const finish=e=>{
   if(!drag||e?.pointerId!=null&&drag.id!==e.pointerId)return;
   const {id,moved}=drag;drag=null;el.classList.remove('toolbar-dragging');
   if(moved){suppressClick=true;try{if(el.hasPointerCapture(id))el.releasePointerCapture(id)}catch{}}
  };
  const click=e=>{if(suppressClick&&e.detail!==0){suppressClick=false;e.preventDefault();e.stopImmediatePropagation()}};
  el.addEventListener('wheel',wheel,{passive:false});
  el.addEventListener('pointerdown',down);
  el.addEventListener('click',click,true);
  window.addEventListener('pointermove',move,{capture:true,passive:false});
  window.addEventListener('pointerup',finish,true);
  window.addEventListener('pointercancel',finish,true);
  window.addEventListener('blur',finish);
  return()=>{finish();el.removeEventListener('wheel',wheel);el.removeEventListener('pointerdown',down);el.removeEventListener('click',click,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);window.removeEventListener('blur',finish)};
 },[ref,vertical,mode]);
}
