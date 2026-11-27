export const positions=['top','bottom','left','right'];
export const uiModes=['full','simplified','hidden'];
export const zoomModes=['fit','fill'];
export const gridModes=['none','grid','dots','hlines'];
export const nextMode=(modes,current)=>modes[(modes.indexOf(current)+1)%modes.length];
export const isVertical=position=>position==='left'||position==='right';
export const clampPanelSize=(value,limit,min=120)=>Math.max(Math.min(min,limit),Math.min(limit,Number(value)||min));
export function normalizeLayout(p){
 return {...p,toolbarPosition:positions.includes(p.toolbarPosition)?p.toolbarPosition:'top',sidebarPosition:positions.includes(p.sidebarPosition)?p.sidebarPosition:'left',uiMode:uiModes.includes(p.uiMode)?p.uiMode:'full',zoom:zoomModes.includes(p.zoom)?p.zoom:'fit',grid:gridModes.includes(p.grid)?p.grid:'none',sidebarWidth:clampPanelSize(p.sidebarWidth??230,1200),sidebarHeight:clampPanelSize(p.sidebarHeight??190,900),showFooter:p.showFooter!==false,sidebarOpen:!!p.sidebarOpen};
}

export function toolbarWheelDelta(dx,dy,deltaMode,vertical,extent){
 const primary=vertical?dy:dx,secondary=vertical?dx:dy;
 const delta=Math.abs(primary)>=Math.abs(secondary)?primary:secondary;
 return delta*(deltaMode===1?16:deltaMode===2?extent:1);
}
export const dragExceeded=delta=>Math.abs(delta)>=5;
