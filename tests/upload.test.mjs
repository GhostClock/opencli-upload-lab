import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
// Upstream fixture: OpenCLI Browser Bridge 1.0.24, Apache-2.0; see NOTICE.
const baseline=fs.readFileSync(new URL('./fixtures/upstream-upload-1.0.24.js',import.meta.url),'utf8');
const patched=fs.readFileSync(new URL('../scripts/opencli-upload-function.js',import.meta.url),'utf8');
async function run(source,hidden=false,failWrite=false){
 const listeners=new Set(),calls=[];
 let revealed=false,restored=false,intercepted=false;
 const context={setTimeout,clearTimeout,chrome:{debugger:{onEvent:{addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f)}}},ensureAttached:async()=>{},sendDebuggerCommand:async(target,method,params={})=>{
  calls.push({method,params});
  if(method==='Runtime.evaluate'){
   if(params.expression.includes('!!document.querySelector'))return {result:{value:true}};
   if(params.expression.includes('getBoundingClientRect'))return {result:{value:{style:hidden?'display:none':null,reveal:hidden}}};
   if(params.expression.includes('setProperty'))revealed=true;
   if(params.expression.includes('removeAttribute'))restored=true;
   if(params.expression.endsWith('.click()') && params.userGesture && (!hidden||revealed)){
    for(const f of [...listeners])f({tabId:999},'Page.fileChooserOpened',{backendNodeId:99});
    for(const f of [...listeners])f({tabId:7},'Page.fileChooserOpened',{backendNodeId:42});
   }
  }
  if(method==='Page.setInterceptFileChooserDialog')intercepted=params.enabled;
  if(method==='DOM.setFileInputFiles'){
   assert.equal(params.backendNodeId,42);assert.deepEqual(params.files,['probe.txt']);
   if(failWrite)throw new Error('simulated write failure');
  }
  return {};
 }};
 vm.createContext(context);vm.runInContext(source,context);
 let error=null;try{await context.setFileInputFiles(7,['probe.txt'],'#upload')}catch(e){error=e.message}
 assert.equal(listeners.size,0);assert.equal(intercepted,false);
 return {error,restored,calls};
}
const red=await run(baseline);assert.match(red.error,/fileChooserOpened/);
for(const hidden of [false,true]){const r=await run(patched,hidden);assert.equal(r.error,null);if(hidden)assert.equal(r.restored,true)}
const failure=await run(patched,true,true);assert.equal(failure.error,'simulated write failure');assert.equal(failure.restored,true);
const record={baseline:'expected timeout reproduced in modeled gesture condition',patched_visible:'passed',patched_hidden:'passed',write_failure_cleanup:'passed',limitation:'Mocked CDP regression checks; live patched extension and Douyin not verified'};
console.log(JSON.stringify(record));
