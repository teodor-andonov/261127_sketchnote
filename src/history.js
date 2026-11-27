// A single current snapshot plus changed tiles, bounded by bytes and step count.
// Before/after tiles are independent, so eviction never turns an undo into a blank image.
export class TileHistory {
  constructor(ctx, budget=64*1024*1024, maxSteps=50, tile=128){
    this.ctx=ctx; this.budget=budget;this.maxSteps=maxSteps;this.tile=tile;
    this.current=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    this.entries=[];this.index=0;this.bytes=0;
  }
  commit(){
    const {ctx,tile}=this, {width:w,height:h}=this.current;
    const next=ctx.getImageData(0,0,w,h), a=new Uint32Array(this.current.data.buffer), b=new Uint32Array(next.data.buffer);
    const patches=[];let bytes=0;
    for(let y=0;y<h;y+=tile)for(let x=0;x<w;x+=tile){
      const tw=Math.min(tile,w-x),th=Math.min(tile,h-y);let changed=false;
      outer:for(let r=0;r<th;r++){let i=(y+r)*w+x;for(let c=0;c<tw;c++)if(a[i+c]!==b[i+c]){changed=true;break outer;}}
      if(!changed)continue;
      const before=new ImageData(tw,th),after=new ImageData(tw,th);
      for(let r=0;r<th;r++){const i=((y+r)*w+x)*4;before.data.set(this.current.data.subarray(i,i+tw*4),r*tw*4);after.data.set(next.data.subarray(i,i+tw*4),r*tw*4)}
      bytes+=before.data.byteLength+after.data.byteLength;patches.push({x,y,before,after});
    }
    if(!patches.length)return false;
    this.current=next;
    for(const e of this.entries.splice(this.index))this.bytes-=e.bytes;
    if(bytes>this.budget){this.entries=[];this.index=0;this.bytes=0;return true}
    this.entries.push({patches,bytes});this.bytes+=bytes;this.index++;
    while(this.bytes>this.budget||this.entries.length>this.maxSteps){this.bytes-=this.entries.shift().bytes;this.index--}
    return true;
  }
  clear(){
    // The clear operation stores the existing baseline once; redo is implicitly transparent.
    // A large clear may exceed the normal budget, but remains immediately reversible.
    if(!new Uint32Array(this.current.data.buffer).some(pixel=>pixel!==0))return false;
    const before=this.current,blank=new ImageData(before.width,before.height);
    this.ctx.putImageData(blank,0,0);this.current=blank;
    for(const e of this.entries.splice(this.index))this.bytes-=e.bytes;
    const bytes=before.data.byteLength;this.entries.push({kind:'clear',before,bytes});this.bytes+=bytes;this.index++;
    while(this.entries.length>1&&(this.bytes>this.budget||this.entries.length>this.maxSteps)){this.bytes-=this.entries.shift().bytes;this.index--}
    return true;
  }
  apply(entry,key){if(entry.kind==='clear'){
    if(key==='before')this.current.data.set(entry.before.data);else this.current.data.fill(0);
    this.ctx.putImageData(this.current,0,0);return;
  }for(const p of entry.patches){const im=p[key];this.ctx.putImageData(im,p.x,p.y);for(let r=0;r<im.height;r++){const i=((p.y+r)*this.current.width+p.x)*4;this.current.data.set(im.data.subarray(r*im.width*4,(r+1)*im.width*4),i)}}}
  undo(){if(!this.index)return false;this.apply(this.entries[--this.index],'before');return true}
  redo(){if(this.index>=this.entries.length)return false;this.apply(this.entries[this.index++],'after');return true}
}