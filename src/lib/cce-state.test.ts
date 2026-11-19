import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Script, runInNewContext } from "node:vm";
import { CCE_CHANNEL, cceCacheKey, validCceMessage, validCceState } from "./cce-state";
const progress = [{g:"maps",l:"easy",n:"Explorer",d:1700000000000,s:Array.from({length:5},()=>["Map reading",1,2])}];
assert.ok(validCceState({grade:3,progress}));
for (const value of [null,{}, {grade:9,progress}, {grade:3,progress:[...progress,...Array(80).fill(progress[0])]}, {grade:3,progress:[{...progress[0],g:"other"}]}, {grade:3,progress:[{...progress[0],s:[["Bad",-1,0]]}]}]) assert.equal(validCceState(value),false);
assert.notEqual(cceCacheKey("a"), cceCacheKey("b"));
const source = {}, origin = "https://example.com", data = { channel: CCE_CHANNEL, token:"token" };
assert.ok(validCceMessage({source,origin,data},origin,source,"token"));
assert.equal(validCceMessage({source:{},origin,data},origin,source,"token"),false);
assert.equal(validCceMessage({source,origin:"https://other.com",data},origin,source,"token"),false);
assert.equal(validCceMessage({source,origin,data},origin,source,"other"),false);
assert.equal(validCceMessage({source:null,origin,data},origin,null,"token"),false);

const base = "public/games/cross-country-escape/";
function assetFiles(dir: string): string[] { return readdirSync(dir,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?assetFiles(path.join(dir,e.name)):[path.join(dir,e.name)]); }
const assets = [...assetFiles(base+"art"),...assetFiles(base+"fonts")].sort();
const assetHash = createHash("sha256");
for (const file of assets) assetHash.update(path.relative(base,file)+":"+createHash("sha256").update(readFileSync(file)).digest("hex")+"\n");
assert.equal(assets.length,190);
assert.equal(assetHash.digest("hex"),"6a0e06f036aa22d158ce5508eaedb78b055f3e60979f48e8c57b09ca2e6525ac","All supplied artwork, fonts, and font licenses must remain unchanged");
let html = readFileSync(base+"index.html","utf8");
const originalStorage = "var gameStorage=window.writegrowGameStorage||{getItem:function(k){return localStorage.getItem(k);},setItem:function(k,v){localStorage.setItem(k,v);},removeItem:function(k){localStorage.removeItem(k);}};\n";
html = html.replace('<link rel="stylesheet" href="writegrow-responsive.css">\n<script src="writegrow-bridge.js"></script>\n', "")
  .replace(originalStorage, "").replaceAll("gameStorage.","localStorage.")
  .replace("if(window.writegrowGameBoot)window.writegrowGameBoot(start);else start({});", "start({});")
  .replace("render();if(window.writegrowGameScroll)window.writegrowGameScroll();}", "render();}");
assert.equal(createHash("sha256").update(html.replace(/\n$/, "")).digest("hex"),"42c0b7b5b55552d6a8e58654316d66baa0d7963416e0f39698cc6cf96379e86c", "Supplied gameplay, questions, and visual theme must remain byte-for-byte unchanged apart from the explicit adapter hooks and final newline");
new Script(html.match(/<script>([\s\S]*?)<\/script>/)![1]);

const listeners: Record<string,(event:any)=>void> = {}, sent:any[]=[];
const parent = {postMessage:(value:unknown,target:string)=>sent.push({value,target})};
const fakeWindow:any = {location:{origin,search:"?embedded=1&bridge=token"},parent,addEventListener:(name:string,cb:any)=>{listeners[name]=cb;}};
const context = {window:fakeWindow,URLSearchParams,ResizeObserver:class {observe(){}},MutationObserver:class {observe(){}},document:{getElementById:()=>({}),addEventListener:()=>{}}};
runInNewContext(readFileSync(base+"writegrow-bridge.js","utf8"),context);
let booted:any;
fakeWindow.writegrowGameBoot((value:unknown)=>{booted=value;});
assert.equal(sent[0].value.type,"ready");
const init = {channel:CCE_CHANNEL,token:"token",type:"init",state:{grade:5,progress}};
listeners.message({source:{},origin,data:init}); assert.equal(booted,undefined);
listeners.message({source:parent,origin:"https://evil.example",data:init}); assert.equal(booted,undefined);
listeners.message({source:parent,origin,data:init}); assert.equal((booted as any)?.grade,5); assert.equal((booted as any)?.screen,"intro");
assert.equal(JSON.parse(fakeWindow.writegrowGameStorage.getItem("cce_progress")).length,1);
fakeWindow.writegrowGameStorage.setItem("cce_grade","6");
assert.equal(sent.at(-1).value.state.grade,6);
assert.ok(sent.every((message)=>message.target===origin));
listeners.message({source:parent,origin,data:{...init,state:{grade:3,progress:[]}}});
assert.equal(fakeWindow.writegrowGameStorage.getItem("cce_grade"),"6", "A delayed initialization must never erase a live game");
console.log("Cross-Country Escape: original gameplay preserved, bounded progress, student isolation, trusted handshake, and save events passed.");
