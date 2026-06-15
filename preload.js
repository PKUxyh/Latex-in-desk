const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  saveExport: (payload) => ipcRenderer.invoke("save-export", payload),
  copyOfficeEquation: (mathml) => ipcRenderer.invoke("copy-office-equation", mathml),
  openMiniWindow: (source) => ipcRenderer.invoke("open-mini-window", source),
  hideMiniWindow: () => ipcRenderer.invoke("hide-mini-window"),
  setMiniSuggestionsOpen: (isOpen) => ipcRenderer.invoke("set-mini-suggestions-open", isOpen),
  onMiniSource: (callback) => {
    const listener = (_event, source) => callback(source);
    ipcRenderer.on("mini-source", listener);
    return () => ipcRenderer.removeListener("mini-source", listener);
  }
});
