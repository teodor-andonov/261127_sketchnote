import test from 'node:test';
import assert from 'node:assert/strict';
import {presetView,zoomAt,panBy,resizeView,pinchMetrics,clampScale} from '../src/viewport.js';
test('presets center a finite image',()=>{assert.deepEqual(presetView('actual',1200,800,600,600),{mode:'actual',scale:1,x:-300,y:-100});assert.deepEqual(presetView('fit',1200,800,600,600),{mode:'fit',scale:.5,x:0,y:100});assert.deepEqual(presetView('fill',1200,800,600,600),{mode:'fill',scale:.75,x:-150,y:0})});
test('zoom holds the cursor anchored in document coordinates',()=>{const a={mode:'fit',scale:.5,x:25,y:40};const b=zoomAt(a,2,125,140);assert.equal((125-a.x)/a.scale,(125-b.x)/b.scale);assert.equal((140-a.y)/a.scale,(140-b.y)/b.scale)});
test('pinch holds the moving midpoint anchored',()=>{const a={mode:'actual',scale:1,x:10,y:20};const b=zoomAt(a,2,150,160,100,100);assert.equal((100-a.x)/a.scale,(150-b.x)/b.scale);assert.equal((100-a.y)/a.scale,(160-b.y)/b.scale);assert.deepEqual(pinchMetrics([{x:0,y:0},{x:6,y:8}]),{x:3,y:4,distance:10})});
test('pan and resize preserve custom scale and center anchor',()=>{const a=panBy({mode:'fit',scale:.5,x:10,y:20},30,-15);assert.deepEqual(a,{mode:'custom',scale:.5,x:40,y:5});assert.deepEqual(resizeView(a,1200,800,600,600,800,700),{mode:'custom',scale:.5,x:140,y:55});assert.equal(clampScale(100),32)});
