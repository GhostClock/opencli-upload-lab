async function setFileInputFiles(tabId, files, selector) {
  await ensureAttached(tabId);
  await sendDebuggerCommand({ tabId }, "DOM.enable");
  await sendDebuggerCommand({ tabId }, "Page.enable");
  const query = selector || 'input[type="file"]';
  const found = await sendDebuggerCommand({ tabId }, "Runtime.evaluate", {
    expression: `!!document.querySelector(${JSON.stringify(query)})`,
    returnByValue: true
  });
  if (!found.result?.value) {
    throw new Error(`No element found matching selector: ${query}`);
  }
  await sendDebuggerCommand({ tabId }, "Page.setInterceptFileChooserDialog", { enabled: true });
  try {
    const backendNodeId = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Page.fileChooserOpened not received within 5s — the input may not have opened a file chooser"));
      }, 5e3);
      const listener = (source, method, params) => {
        if (source.tabId !== tabId || method !== "Page.fileChooserOpened") return;
        cleanup();
        const backend = params?.backendNodeId;
        if (typeof backend === "number") resolve(backend);
        else reject(new Error("Page.fileChooserOpened carried no backendNodeId"));
      };
      const cleanup = () => {
        clearTimeout(timer);
        chrome.debugger.onEvent.removeListener(listener);
      };
      chrome.debugger.onEvent.addListener(listener);
      void sendDebuggerCommand({ tabId }, "Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(query)}).click()`
      }).catch((err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    await sendDebuggerCommand({ tabId }, "DOM.setFileInputFiles", {
      files,
      backendNodeId
    });
  } finally {
    await sendDebuggerCommand({ tabId }, "Page.setInterceptFileChooserDialog", { enabled: false }).catch(() => {
    });
  }
}