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

// Start the next decode and the previous save together. A rejected decode is
// captured immediately, and the document can only be replaced after a successful flush.
export async function prepareDocumentSwitch(flush,prepare){
 const pending=prepare?Promise.resolve().then(prepare).then(value=>({value}),error=>({error,failed:true})):null;
 const allowed=await flush();
 if(!allowed)return {allowed:false};
 if(!pending)return {allowed:true};
 const result=await pending;
 if(result.failed)throw result.error;
 return {allowed:true,value:result.value};
}
