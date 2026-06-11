const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  saveExport: (payload) => ipcRenderer.invoke("save-export", payload)
});
