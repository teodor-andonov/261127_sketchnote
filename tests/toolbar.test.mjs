import test from 'node:test';
import assert from 'node:assert/strict';
import {toolbarWheelDelta,dragExceeded} from '../src/layout.js';
test('mouse wheel scrolls horizontal and vertical toolbars',()=>{assert.equal(toolbarWheelDelta(0,60,0,false,400),60);assert.equal(toolbarWheelDelta(0,-60,0,true,400),-60)});
test('trackpad horizontal delta and line/page units',()=>{assert.equal(toolbarWheelDelta(80,2,0,false,400),80);assert.equal(toolbarWheelDelta(0,3,1,false,400),48);assert.equal(toolbarWheelDelta(0,-1,2,true,250),-250)});
test('drag threshold preserves clicks',()=>{assert(!dragExceeded(4));assert(dragExceeded(5));assert(dragExceeded(-8))});
