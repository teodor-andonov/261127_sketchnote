import test from 'node:test';import assert from 'node:assert/strict';
import {validCanvasSize,canAutoSave,flushBeforeSwitch,prepareDocumentSwitch} from '../src/document-flow.js';
import {normalizeFilePrefs} from '../src/folder.js';
import {invertHex} from '../src/appearance.js';
test('dimensions validate as a pair and prefs recover invalid sizes',()=>{assert(validCanvasSize(1920,1080));assert(!validCanvasSize(10000,10000));assert(!validCanvasSize(16385,1));assert(!validCanvasSize(4.5,5));assert.equal(normalizeFilePrefs({defaultWidth:1920,defaultHeight:1080}).defaultHeight,1080);assert.equal(normalizeFilePrefs({defaultWidth:0,defaultHeight:900}).defaultWidth,1200)});
test('compact migrates to list and folder remembering defaults on',()=>{assert.equal(normalizeFilePrefs({fileView:'compact'}).fileView,'list');assert.equal(normalizeFilePrefs({fileView:'gallery'}).fileView,'gallery');assert.equal(normalizeFilePrefs({}).rememberFolder,true);assert.equal(normalizeFilePrefs({rememberFolder:false}).rememberFolder,false)});
test('inversion complements each RGB channel and is reversible',()=>{assert.equal(invertHex('#000000'),'#ffffff');assert.equal(invertHex('#4040bf'),'#bfbf40');assert.equal(invertHex(invertHex('#123456')),'#123456');assert.equal(invertHex('bad!'),null)});
test('autosave targets lossless formats only',()=>{assert(canAutoSave({name:'a.webp'},null,'jpeg'));assert(!canAutoSave({name:'a.jpg'},{},'webp'));assert(canAutoSave(null,{},'png'));assert(!canAutoSave(null,null,'png'));assert(!canAutoSave(null,{},'jpeg'))});
test('switch flushes autosave without confirmation, refuses failed saves',async()=>{let dirty=true,confirmations=0,saves=0;const options={isDirty:()=>dirty,autosave:true,canSave:()=>true,save:async()=>{saves++;dirty=false;return true},confirmDiscard:()=>{confirmations++;return true}};assert(await flushBeforeSwitch(options));assert.equal(saves,1);assert.equal(confirmations,0);dirty=true;assert.equal(await flushBeforeSwitch({...options,save:async()=>false}),false);assert.equal(await flushBeforeSwitch({...options,canSave:()=>false}),false);assert.equal(confirmations,0);assert(await flushBeforeSwitch({...options,autosave:false}));assert.equal(confirmations,1)});

test('next decode overlaps flush but cannot install before save succeeds',async()=>{
 let finish,loaded=false;
 const pending=prepareDocumentSwitch(()=>new Promise(resolve=>finish=resolve),async()=>{loaded=true;return 'decoded'});
 await Promise.resolve();assert(loaded);finish(true);assert.deepEqual(await pending,{allowed:true,value:'decoded'});
});
test('failed flush blocks switch even if decode succeeds or fails',async()=>{
 assert.deepEqual(await prepareDocumentSwitch(async()=>false,async()=>42),{allowed:false});
 assert.deepEqual(await prepareDocumentSwitch(async()=>false,async()=>{throw Error('bad image')}),{allowed:false});
 await assert.rejects(prepareDocumentSwitch(async()=>true,async()=>{throw Error('bad image')}),/bad image/);
});
