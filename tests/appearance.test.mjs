import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_COLORS,DEFAULT_WIDTHS,DEFAULT_OPACITIES,parseHex,parseWidth,parseOpacity,normalizeAppearance,replaceSlot,opacityPercent,sameNumber} from '../src/appearance.js';
test('requested defaults and legacy preferences migrate without changing current stroke',()=>{
 const p=normalizeAppearance({color:'#171717',width:3,opacity:.75});
 assert.deepEqual(p.colorPresets,DEFAULT_COLORS);assert.deepEqual(p.widthPresets,[1,2,4,8,16,32]);assert.deepEqual(p.opacityPresets,[100,75,50,25,5]);
 assert.equal(p.color,'#171717');assert.equal(p.width,3);assert.equal(p.opacity,.75);
 assert.deepEqual(DEFAULT_COLORS,['#000000','#404040','#808080','#bfbfbf','#ffffff','#4040bf','#bf4080','#bfbf40','#40bf80']);
});
test('precise input accepts units and decimals, clamps valid values, rejects invalid',()=>{
 assert.equal(parseWidth(' 3.25px '),3.25);assert.equal(parseWidth('0'),.1);assert.equal(parseWidth('999'),150);assert.equal(parseWidth(''),null);assert.equal(parseWidth('2foo'),null);
 assert.equal(parseOpacity('12.5%'),12.5);assert.equal(parseOpacity('120%'),100);assert.equal(parseOpacity('-1%'),0);assert.equal(parseOpacity('Infinity'),null);
 assert.equal(parseHex(' AbC '),'#aabbcc');assert.equal(parseHex('#12XZ90'),null);
});
test('custom slots persist independently and invalid slots fall back to defaults',()=>{
 const p=normalizeAppearance({colorPresets:['#f00','bad!'],widthPresets:[7.5,'bad'],opacityPresets:[33.3,0]});
 assert.equal(p.colorPresets[0],'#ff0000');assert.equal(p.colorPresets[1],DEFAULT_COLORS[1]);assert.equal(p.colorPresets.length,9);
 assert.equal(p.widthPresets[0],7.5);assert.equal(p.widthPresets[1],2);assert.equal(p.opacityPresets[0],33.3);assert.equal(p.opacityPresets[1],0);
 const next=replaceSlot(p.widthPresets,1,9);assert.equal(next[1],9);assert.equal(p.widthPresets[1],2);assert.equal(normalizeAppearance({...p,widthPresets:next}).widthPresets[1],9);
});
test('percent conversion retains fractional opacity and selected state',()=>{assert.equal(opacityPercent(.3333),33.33);assert(sameNumber(.1+.2,.3));assert.equal(normalizeAppearance({opacity:0}).opacity,0)});
