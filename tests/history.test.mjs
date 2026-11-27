import test from 'node:test';
import assert from 'node:assert/strict';
import {TileHistory} from '../src/history.js';
globalThis.ImageData=class {constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)}};
function fixture(){const im=new ImageData(8,8);const ctx={canvas:{width:8,height:8},getImageData(){const out=new ImageData(8,8);out.data.set(im.data);return out},putImageData(p,x,y){for(let r=0;r<p.height;r++)im.data.set(p.data.subarray(r*p.width*4,(r+1)*p.width*4),((y+r)*8+x)*4)}};return {im,ctx}}
test('tile undo restores original image, redo restores edits',()=>{const {im,ctx}=fixture();im.data[0]=12;const h=new TileHistory(ctx,1024,50,2);im.data[0]=25;assert(h.commit());assert.equal(h.bytes,32);assert(h.undo());assert.equal(im.data[0],12);assert(h.redo());assert.equal(im.data[0],25);assert(!h.commit())});
test('eviction preserves oldest retained baseline and branching clears redo',()=>{const {im,ctx}=fixture();const h=new TileHistory(ctx,32,50,2);im.data[0]=1;h.commit();im.data[0]=2;h.commit();assert(h.undo());assert.equal(im.data[0],1);assert(!h.undo());im.data[0]=3;h.commit();assert(!h.redo());assert.equal(h.bytes,32)});
