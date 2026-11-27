import encode,{init} from '@jsquash/webp/encode.js';
import scalar from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simd from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
let ready;
self.onmessage=async ({data})=>{try{
  ready??=init({locateFile:(path)=>path.endsWith('webp_enc_simd.wasm')?simd:scalar});
  await ready;
  const output=await encode(data,{lossless:1,exact:1,quality:75,method:3});
  self.postMessage({output},[output]);
}catch(e){self.postMessage({error:String(e?.message||e)})}};
