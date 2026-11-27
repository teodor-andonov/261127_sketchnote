// Widths are document pixels; opacity presets use percentages for editing.
// Grays are ordered from black to white, then the four requested HSL colors.
export const DEFAULT_COLORS=Object.freeze(['#000000','#404040','#808080','#bfbfbf','#ffffff','#4040bf','#bf4080','#bfbf40','#40bf80']);
export const DEFAULT_WIDTHS=Object.freeze([2,4,8,16,32]);
export const DEFAULT_OPACITIES=Object.freeze([100,75,50,25,5]);
export const WIDTH_MIN=.1,WIDTH_MAX=150,OPACITY_MIN=0,OPACITY_MAX=100;
export function parseHex(value){
 if(typeof value!=='string')return null;
 const hex=value.trim().toLowerCase().replace(/^#/,'');
 if(/^[0-9a-f]{6}$/.test(hex))return '#'+hex;
 if(/^[0-9a-f]{3}$/.test(hex))return '#'+[...hex].map(c=>c+c).join('');
 return null;
}
export function parseNumeric(value,min,max,unit=''){
 if(typeof value!=='number'&&typeof value!=='string')return null;
 let raw=String(value).trim().toLowerCase();
 if(unit&&raw.endsWith(unit.toLowerCase()))raw=raw.slice(0,-unit.length).trim();
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))return null;
 const n=Number(raw);if(!Number.isFinite(n))return null;
 return Math.round(Math.min(max,Math.max(min,n))*100)/100;
}
export const parseWidth=value=>parseNumeric(value,WIDTH_MIN,WIDTH_MAX,'px');
export const parseOpacity=value=>parseNumeric(value,OPACITY_MIN,OPACITY_MAX,'%');
export const sameNumber=(a,b)=>Math.abs(a-b)<.000001;
export const opacityPercent=value=>Math.round(value*10000)/100;
export function nearestPresetIndex(values,value){
 let best=0;for(let i=1;i<values.length;i++)if(Math.abs(values[i]-value)<Math.abs(values[best]-value))best=i;
 return best;
}
// v1.3.0 had six width slots. Drop its first slot (formerly 1px), retaining the other custom slots.
export const migrateWidthPresets=value=>Array.isArray(value)&&value.length===6?value.slice(1):value;
function normalizedSlots(value,defaults,parser){
 return defaults.map((fallback,index)=>parser(Array.isArray(value)?value[index]:undefined)??fallback);
}
export function normalizeAppearance(p){
 return {...p,color:parseHex(p.color)??DEFAULT_COLORS[0],width:parseWidth(p.width)??4,opacity:(parseOpacity(typeof p.opacity==='number'?p.opacity*100:undefined)??100)/100,
 colorPresets:normalizedSlots(p.colorPresets,DEFAULT_COLORS,parseHex),
 widthPresets:normalizedSlots(migrateWidthPresets(p.widthPresets),DEFAULT_WIDTHS,parseWidth),
 opacityPresets:normalizedSlots(p.opacityPresets,DEFAULT_OPACITIES,parseOpacity)};
}
export function replaceSlot(values,index,value){return values.map((old,i)=>i===index?value:old)}
