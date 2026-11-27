import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryLayout,galleryDensities} from '../src/gallery-layout.js';
test('responsive square grid stays within scroll viewport at all widths and densities',()=>{
 for(const density of Object.keys(galleryDensities))for(const width of [0,1,5,50,90,120,230,330,600,800,1120,1920]){
  const {columns,size,gap}=galleryLayout(width,density);
  assert(columns>=1&&Number.isInteger(columns));assert(size>=0);
  if(width>=2*gap)assert(columns*size+(columns-1)*gap+2*gap<=width+.001);
  if(columns>1)assert(size>=galleryDensities[density].min-.01);
 }
});
test('94 images in a wide panel get explicit equal rows with stable gaps',()=>{
 const {columns,size,gap}=galleryLayout(1120,'normal');
 assert.equal(columns,10);assert.equal(size,105.4);assert.equal(gap,6);
 const cards=Array.from({length:94},(_,i)=>({x:gap+i%columns*(size+gap),y:gap+Math.floor(i/columns)*(size+gap)}));
 for(let i=columns;i<cards.length;i++)assert(cards[i].y>=cards[i-columns].y+size+gap-.0001);
});
test('density changes geometry and narrow panel uses a single column',()=>{
 assert(galleryLayout(600,'dense').columns>galleryLayout(600,'spacious').columns);
 assert.equal(galleryLayout(90,'normal').columns,1);
 assert.equal(galleryLayout(90,'normal').size,78);
});
