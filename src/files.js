export const formats={webp:{mime:'image/webp',ext:'.webp'},png:{mime:'image/png',ext:'.png'},jpeg:{mime:'image/jpeg',ext:'.jpg'}};
export function formatOf(name){return /\.png$/i.test(name)?'png':/\.jpe?g$/i.test(name)?'jpeg':'webp'}
export const imageTypes=[{description:'Images',accept:{'image/webp':['.webp'],'image/png':['.png'],'image/jpeg':['.jpg','.jpeg']}}];
export function suggestName(name,format){return (name||'sketch').replace(/\.(webp|png|jpe?g)$/i,'')+formats[format].ext}
export async function decode(file){const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid image');return image}finally{URL.revokeObjectURL(url)}}
let worker;
async function webp(data){worker??=new Worker(new URL('./webp.worker.js',import.meta.url),{type:'module'});return new Promise((resolve,reject)=>{const w=worker;const timer=setTimeout(()=>{w.terminate();worker=null;reject(Error('WebP encoding timed out'))},60000);w.onmessage=({data})=>{clearTimeout(timer);data.error?reject(Error(data.error)):resolve(new Blob([data.output],{type:'image/webp'}))};w.onerror=e=>{clearTimeout(timer);w.terminate();worker=null;reject(Error(e.message||'WebP encoder failed'))};w.postMessage(data,[data.data.buffer])})}
export async function encodeCanvas(canvas,format){
  if(format==='webp')return webp(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));
  let c=canvas;if(format==='jpeg'){c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(canvas,0,0)}
  const mime=formats[format].mime;return new Promise((resolve,reject)=>c.toBlob(b=>b&&b.type===mime?resolve(b):reject(Error('Image encoding failed')),mime,0.96))
}
export async function write(handle,blob){const stream=await handle.createWritable();try{await stream.write(blob);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e}}
export function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
