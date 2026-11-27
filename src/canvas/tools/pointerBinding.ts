import {getPointerPosition,shouldHandlePointer} from '../../utils/pointer';
export type PointerToolHandlers={
 onStart:(e:PointerEvent,p:{x:number;y:number})=>void;
 onMove:(e:PointerEvent,p:{x:number;y:number})=>void;
 onEnd:(e:PointerEvent,p:{x:number;y:number})=>void;
 onCancel:(e:PointerEvent)=>void;
};
type Options={canvas:HTMLCanvasElement;root:Element|null;penOnlyMode:boolean;handlers:PointerToolHandlers};
export function bindPointerTool({canvas,penOnlyMode,handlers}:Options){
 const win=canvas.ownerDocument.defaultView??window;let active:number|null=null;
 const down=(e:PointerEvent)=>{if(active!==null||!shouldHandlePointer(e,penOnlyMode)||(!e.isPrimary&&e.pointerType!=='pen'))return;active=e.pointerId;handlers.onStart(e,getPointerPosition(canvas,e))};
 const move=(e:PointerEvent)=>{if(active!==null&&e.pointerId!==active||!shouldHandlePointer(e,penOnlyMode))return;if(active===null&&(e.buttons&1||e.pointerType==='pen'&&e.pressure>0))active=e.pointerId;handlers.onMove(e,getPointerPosition(canvas,e))};
 const end=(e:PointerEvent)=>{if(active!==e.pointerId)return;active=null;handlers.onEnd(e,getPointerPosition(canvas,e))};
 const cancel=(e:Event)=>{if(active===null)return;if(e instanceof PointerEvent&&e.pointerId!==active)return;active=null;handlers.onCancel(e as PointerEvent)};
 const canvasEvents:[string,EventListener][]=[['pointerdown',down as EventListener],['pointermove',move as EventListener],['pointerup',end as EventListener],['pointercancel',cancel],['lostpointercapture',cancel],['sketch-navigation-cancel',cancel]];
 for(const [name,fn] of canvasEvents)canvas.addEventListener(name,fn);
 win.addEventListener('pointerup',end);win.addEventListener('pointercancel',cancel);win.addEventListener('blur',cancel);win.addEventListener('resize',cancel);
 return()=>{for(const [name,fn] of canvasEvents)canvas.removeEventListener(name,fn);win.removeEventListener('pointerup',end);win.removeEventListener('pointercancel',cancel);win.removeEventListener('blur',cancel);win.removeEventListener('resize',cancel)};
}
