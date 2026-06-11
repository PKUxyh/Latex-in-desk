const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  saveExport: (payload) => ipcRenderer.invoke("save-export", payload),
  copyOfficeEquation: (mathml) => ipcRenderer.invoke("copy-office-equation", mathml)
});
