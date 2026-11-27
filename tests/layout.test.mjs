import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLayout,nextMode,zoomModes,gridModes,uiModes,clampPanelSize,isVertical} from '../src/layout.js';
test('legacy actual zoom migrates to fit',()=>assert.equal(normalizeLayout({zoom:'actual'}).zoom,'fit'));
test('stable grid and fit/fill cycle; custom returns to fit',()=>{assert.equal(nextMode(zoomModes,'fit'),'fill');assert.equal(nextMode(zoomModes,'fill'),'fit');assert.equal(nextMode(zoomModes,'custom'),'fit');assert.equal(nextMode(gridModes,'hlines'),'none')});
test('all visibility states remain recoverable',()=>{assert.equal(nextMode(uiModes,'full'),'simplified');assert.equal(nextMode(uiModes,'simplified'),'hidden');assert.equal(nextMode(uiModes,'hidden'),'full')});
test('panel settings normalize and resize within available space',()=>{const p=normalizeLayout({toolbarPosition:'bad',sidebarPosition:'bottom',sidebarWidth:9999,showFooter:false});assert.equal(p.toolbarPosition,'top');assert.equal(p.sidebarPosition,'bottom');assert.equal(p.sidebarWidth,1200);assert.equal(p.showFooter,false);assert.equal(clampPanelSize(400,180),180);assert.equal(clampPanelSize(20,80),80);assert.equal(isVertical('right'),true)});
