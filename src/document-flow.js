export function validCanvasSize(w,h){return Number.isInteger(w)&&Number.isInteger(h)&&w>=1&&h>=1&&w*h<=40000000&&Math.max(w,h)<=16384}
export function canAutoSave(handle,folder,format){
 if(handle)return !/\.jpe?g$/i.test(handle.name);
 return !!folder&&format!=='jpeg';
}
export async function flushBeforeSwitch({isDirty,autosave,canSave,save,confirmDiscard}){
 if(!isDirty())return true;
 if(!autosave)return confirmDiscard();
 if(!canSave())return false;
 const result=await save();
 return result===true&&!isDirty();
}
