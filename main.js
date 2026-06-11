const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#f4f1ea",
    title: "LaTeX Formula Desk",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile("index.html");
}

ipcMain.handle("save-export", async (_event, payload) => {
  const isPng = payload?.format === "png";
  const isSvg = payload?.format === "svg";

  if ((!isPng && !isSvg) || typeof payload.data !== "string") {
    throw new Error("Invalid export request.");
  }

  const result = await dialog.showSaveDialog({
    title: isPng ? "保存 PNG 图片" : "保存 PPT 矢量公式",
    defaultPath: isPng ? "latex-formula.png" : "latex-formula.svg",
    filters: isPng
      ? [{ name: "PNG 图片", extensions: ["png"] }]
      : [{ name: "SVG 矢量图", extensions: ["svg"] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const output = isPng
    ? Buffer.from(payload.data.replace(/^data:image\/png;base64,/, ""), "base64")
    : payload.data;

  await fs.writeFile(result.filePath, output);
  return { canceled: false, filePath: result.filePath };
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
