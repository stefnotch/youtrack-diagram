import { app, BrowserWindow, shell, Menu, ipcMain, dialog } from "electron";
import fs from "fs";
import { productName } from "./../../package.json";
/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = require("path")
    .join(__dirname, "statics")
    .replace(/\\/g, "\\\\");
}

/**
 * @type {BrowserWindow|null}
 */
let mainWindow;

const isMac = process.platform === "darwin";
const menuTemplate = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: productName,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [
      {
        label: "Export image",
        accelerator: "CmdOrCtrl+S",
        click: async () => {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("take-screenshot");
          }
        }
      },
      isMac ? { role: "close" } : { role: "quit" }
    ]
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }]
            }
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "toggledevtools" },
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  }
];
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

ipcMain.on("save-screenshot", async (event, data) => {
  let result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `*/${data.name}`,
    filters: [{ name: data.extension, extensions: [data.extension] }]
  });
  if (!result.filePath) return;
  fs.writeFile(result.filePath, data.data, err => {
    if (err) {
      console.error(err);
    } else {
      shell.showItemInFolder(result.filePath);
    }
  });
});

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    }
  });

  mainWindow.loadURL(process.env.APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("new-window", function(e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
