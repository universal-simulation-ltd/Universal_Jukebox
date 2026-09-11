const { contextBridge, ipcRenderer } = require('electron')

// The page's half of the SDK's hub handoff (`installHubHandoff` in main.cjs),
// and the only bridge the page gets. Spelled out rather than required: a
// sandboxed preload can `require` only `electron` and a few built-ins, so the
// SDK's PRELOAD_SNIPPET is copied here verbatim — its channel names must match.
contextBridge.exposeInMainWorld('unisimDesktop', {
  openHub: (url, session) => ipcRenderer.invoke('unisim:open-hub', { url, session }),
  clearHub: () => ipcRenderer.invoke('unisim:clear-hub'),
})
