const { app, BrowserWindow, dialog, ipcMain, screen } = require("electron");
const { spawn } = require("node:child_process");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");

const runtimePath = path.join(__dirname, ".runtime");
const userDataPath = path.join(runtimePath, "user-data");
const sessionDataPath = path.join(runtimePath, "session-data");
const cachePath = path.join(runtimePath, "cache");

for (const directory of [userDataPath, sessionDataPath, cachePath]) {
  fsSync.mkdirSync(directory, { recursive: true });
}

app.setPath("userData", userDataPath);
app.setPath("sessionData", sessionDataPath);
app.commandLine.appendSwitch("disk-cache-dir", cachePath);

let mainWindow;
let miniWindow;
let pendingMiniSource = "";

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile("index.html");
  mainWindow.on("closed", () => {
    mainWindow = null;
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.destroy();
  });
}

function createMiniWindow(source = "") {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    return;
  }

  pendingMiniSource = typeof source === "string" ? source : "";

  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(920, workArea.width - 40);

  miniWindow = new BrowserWindow({
    width,
    height: 112,
    minWidth: 560,
    minHeight: 112,
    maxHeight: 240,
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + 18,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: "#fffdf8",
    title: "LaTeX 迷你输入",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  miniWindow.setAlwaysOnTop(true, "floating");
  miniWindow.loadFile("mini.html");
  miniWindow.once("ready-to-show", () => {
    miniWindow.show();
    miniWindow.focus();
  });
  miniWindow.webContents.on("did-finish-load", () => {
    miniWindow.webContents.send("mini-source", pendingMiniSource);
  });
  miniWindow.on("closed", () => {
    miniWindow = null;
  });
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

ipcMain.handle("copy-office-equation", async (_event, mathml) => {
  if (typeof mathml !== "string" || !mathml.includes("<mml:math")) {
    throw new Error("Invalid Office MathML content.");
  }

  await copyOfficeEquation(mathml);
  return { copied: true };
});

ipcMain.handle("open-mini-window", (_event, source) => {
  createMiniWindow(source);
  return { opened: true };
});

ipcMain.handle("hide-mini-window", () => {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide();
  return { hidden: true };
});

ipcMain.handle("set-mini-suggestions-open", (_event, isOpen) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    const [width] = miniWindow.getSize();
    miniWindow.setSize(width, isOpen ? 224 : 112, true);
  }
  return { resized: true };
});

function copyOfficeEquation(mathml) {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const bundledPowerShell = path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );
  const powerShell = fsSync.existsSync(bundledPowerShell) ? bundledPowerShell : "powershell.exe";
  const scriptPath = path.join(__dirname, "copy-office-equation.ps1");

  return new Promise((resolve, reject) => {
    const child = spawn(
      powerShell,
      ["-NoProfile", "-STA", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("复制公式超时。"));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0 && stdout.includes("OK")) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || "无法写入 Office 公式剪贴板。"));
      }
    });

    child.stdin.end(Buffer.from(mathml, "utf8").toString("base64"));
  });
}

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
