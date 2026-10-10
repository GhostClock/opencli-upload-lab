// 正规 set-file-input 路径的候选修补；不扩大 CDP 权限白名单。
async function setFileInputFiles(tabId, files, selector) {
  await ensureAttached(tabId);
  await sendDebuggerCommand({ tabId }, "DOM.enable");
  await sendDebuggerCommand({ tabId }, "Page.enable");
  const query = selector || 'input[type="file"]';
  const inspected = await sendDebuggerCommand({ tabId }, "Runtime.evaluate", {
    expression: `(() => {
      const el=document.querySelector(${JSON.stringify(query)});
      if(!el || el.tagName!=='INPUT' || el.type!=='file') throw new Error('Expected file input');
      if(document.querySelectorAll(${JSON.stringify(query)}).length!==1) throw new Error('Ambiguous file input');
      if(el.disabled) throw new Error('File input is disabled');
      const rect=el.getBoundingClientRect(), css=getComputedStyle(el);
      return {style:el.getAttribute('style'),reveal:!rect.width||!rect.height||css.display==='none'||css.visibility==='hidden'||css.opacity==='0'};
    })()`, returnByValue: true
  });
  if(inspected.exceptionDetails || !inspected.result?.value) throw new Error('File input validation failed');
  const original = inspected.result.value;
  let intercepted=false;
  try {
    if(original.reveal) await sendDebuggerCommand({tabId},'Runtime.evaluate',{
      expression:`(() => {const el=document.querySelector(${JSON.stringify(query)});for(const [key,value] of Object.entries({display:'block',visibility:'visible',opacity:'1',position:'fixed',width:'1px',height:'1px'}))el.style.setProperty(key,value,'important');})()`
    });
    await sendDebuggerCommand({ tabId }, "Page.setInterceptFileChooserDialog", { enabled: true });
    intercepted=true;
    const backendNodeId = await new Promise((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);chrome.debugger.onEvent.removeListener(listener)};
      const timer=setTimeout(()=>{cleanup();reject(new Error('Page.fileChooserOpened not received within 5s'));},5000);
      const listener=(source,method,params)=>{
        if(source.tabId!==tabId || method!=='Page.fileChooserOpened')return;
        cleanup();
        if(typeof params?.backendNodeId==='number')resolve(params.backendNodeId);
        else reject(new Error('Missing file chooser backendNodeId'));
      };
      chrome.debugger.onEvent.addListener(listener);
      void sendDebuggerCommand({tabId},'Runtime.evaluate',{
        expression:`document.querySelector(${JSON.stringify(query)}).click()`,userGesture:true
      }).then(result=>{if(result?.exceptionDetails){cleanup();reject(new Error('File input click failed'));}},error=>{cleanup();reject(error)});
    });
    await sendDebuggerCommand({tabId},'DOM.setFileInputFiles',{files,backendNodeId});
  } finally {
    if(intercepted)await sendDebuggerCommand({tabId},'Page.setInterceptFileChooserDialog',{enabled:false}).catch(()=>{});
    if(original.reveal)await sendDebuggerCommand({tabId},'Runtime.evaluate',{
      expression:`(() => {const el=document.querySelector(${JSON.stringify(query)});if(el){const style=${JSON.stringify(original.style)};if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}})()`
    });
  }
}
