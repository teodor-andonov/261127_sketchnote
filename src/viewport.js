// Screen-space viewport transforms; raster coordinates are never modified.
export const clampScale=s=>Math.min(32,Math.max(0.0001,s));
export function presetView(mode,w,h,vw,vh){
 const fit=Math.min(vw/w,vh/h), fill=Math.max(vw/w,vh/h);
 const scale=clampScale(mode==='actual'?1:mode==='fill'?fill:fit);
 return {mode,scale,x:(vw-w*scale)/2,y:(vh-h*scale)/2};
}
export function zoomAt(view,scale,x,y,previousX=x,previousY=y){
 scale=clampScale(scale);
 const ratio=scale/view.scale;
 return {mode:'custom',scale,x:x-(previousX-view.x)*ratio,y:y-(previousY-view.y)*ratio};
}
export function panBy(view,dx,dy){return {...view,mode:'custom',x:view.x+dx,y:view.y+dy}}
export function resizeView(view,w,h,oldW,oldH,newW,newH){
 return view.mode==='custom'?{...view,x:view.x+(newW-oldW)/2,y:view.y+(newH-oldH)/2}:presetView(view.mode,w,h,newW,newH);
}
export function pinchMetrics(points){const [a,b]=points;return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}}
