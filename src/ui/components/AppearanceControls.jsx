import React,{useEffect,useRef,useState} from 'react';
import {DEFAULT_COLORS,DEFAULT_WIDTHS,DEFAULT_OPACITIES,parseHex,parseWidth,parseOpacity,sameNumber,opacityPercent,widthDotSize,replaceSlot} from '../../appearance.js';

const displayNumber=value=>String(Math.round(value*100)/100);
function CommittedInput({value,parse,format=String,onCommit,label,className='',inputMode='text'}){
 const [draft,setDraft]=useState(()=>format(value));
 const editing=useRef(false),cancel=useRef(false);
 useEffect(()=>{if(!editing.current)setDraft(format(value))},[value,format]);
 const finish=e=>{
  editing.current=false;
  const next=cancel.current?null:parse(e.currentTarget.value);
  cancel.current=false;
  if(next!==null){onCommit(next);setDraft(format(next))}
  else setDraft(format(value));
 };
 return <input className={className} type="text" inputMode={inputMode} value={draft} aria-label={label} title={label} spellCheck={false} autoComplete="off"
  onFocus={e=>{editing.current=true;e.currentTarget.select()}}
  onChange={e=>setDraft(e.target.value)}
  onBlur={finish}
  onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel.current=e.key==='Escape';e.currentTarget.blur()}}}/>;
}
const widthFormat=v=>displayNumber(v)+'px',opacityFormat=v=>displayNumber(v)+'%';
function PresetButton({label,active,onClick,children,extraClass=''}){
 return <button type="button" className={'icon drawing-preset '+extraClass+(active?' active':'')} title={label} aria-label={label} aria-pressed={active} onClick={onClick}>{children}</button>;
}
export function AppearanceControls({prefs,change}){
 const percent=opacityPercent(prefs.opacity);
 return <>
  <div className="toolgroup color-presets" role="group" aria-label="Drawing color">
   {prefs.colorPresets.map((color,i)=><PresetButton key={i} label={'Color '+color} active={prefs.color===color} onClick={()=>change('color',color)} extraClass="color-preset"><span className="swatch-dot" style={{background:color}}/></PresetButton>)}
   <input className="precise-color" aria-label="Custom drawing color" title={'Custom color: '+prefs.color} type="color" value={prefs.color} onChange={e=>{const next=parseHex(e.target.value);if(next!==null)change('color',next)}}/>
  </div>
  <div className="toolgroup width-presets" role="group" aria-label="Stroke thickness">
   {prefs.widthPresets.map((width,i)=><PresetButton key={i} label={'Stroke thickness '+widthFormat(width)} active={sameNumber(prefs.width,width)} onClick={()=>change('width',width)} extraClass="width-preset"><span className="width-dot" style={{width:widthDotSize(width),height:widthDotSize(width)}}/></PresetButton>)}
   <CommittedInput className="toolbar-precise" label="Custom stroke thickness (px)" inputMode="decimal" value={prefs.width} parse={parseWidth} format={widthFormat} onCommit={v=>change('width',v)}/>
  </div>
  <div className="toolgroup opacity-presets" role="group" aria-label="Stroke opacity">
   {prefs.opacityPresets.map((opacity,i)=><PresetButton key={i} label={'Opacity '+opacityFormat(opacity)} active={sameNumber(percent,opacity)} onClick={()=>change('opacity',opacity/100)} extraClass="opacity-preset"><span className="opacity-mark" style={{'--preset-opacity':opacity/100}}/><span className="opacity-value">{displayNumber(opacity)}%</span></PresetButton>)}
   <CommittedInput className="toolbar-precise" label="Custom opacity (%)" inputMode="decimal" value={percent} parse={parseOpacity} format={opacityFormat} onCommit={v=>change('opacity',v/100)}/>
  </div>
 </>;
}
export function PresetSettings({prefs,change}){
 const setSlot=(key,index,value)=>change(key,replaceSlot(prefs[key],index,value));
 return <div className="preset-settings">
  <h3>Drawing presets</h3>
  <div className="preset-setting-header"><span>Colours</span><button type="button" onClick={()=>change('colorPresets',[...DEFAULT_COLORS])}>Reset</button></div>
  <div className="preset-colors-editor">
   {prefs.colorPresets.map((color,i)=><div className="preset-color-editor" key={i}><input type="color" value={color} aria-label={'Preset colour '+(i+1)} onChange={e=>{const v=parseHex(e.target.value);if(v!==null)setSlot('colorPresets',i,v)}}/><CommittedInput label={'Preset colour '+(i+1)+' hex'} value={color} parse={parseHex} onCommit={v=>setSlot('colorPresets',i,v)}/></div>)}
  </div>
  <div className="preset-setting-header"><span>Thickness (px)</span><button type="button" onClick={()=>change('widthPresets',[...DEFAULT_WIDTHS])}>Reset</button></div>
  <div className="preset-numbers-editor">
   {prefs.widthPresets.map((width,i)=><CommittedInput key={i} label={'Thickness preset '+(i+1)+' (px)'} inputMode="decimal" value={width} parse={parseWidth} format={widthFormat} onCommit={v=>setSlot('widthPresets',i,v)}/>)}
  </div>
  <div className="preset-setting-header"><span>Opacity (%)</span><button type="button" onClick={()=>change('opacityPresets',[...DEFAULT_OPACITIES])}>Reset</button></div>
  <div className="preset-numbers-editor">
   {prefs.opacityPresets.map((opacity,i)=><CommittedInput key={i} label={'Opacity preset '+(i+1)+' (%)'} inputMode="decimal" value={opacity} parse={parseOpacity} format={opacityFormat} onCommit={v=>setSlot('opacityPresets',i,v)}/>)}
  </div>
  <small>Click a preset to use it directly. Custom values are entered in the last control of each toolbar group. Press Enter or leave the field to apply.</small>
 </div>;
}
