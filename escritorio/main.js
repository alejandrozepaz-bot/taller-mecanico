// Versión de computadora: abre la misma app web (carpeta app/) en una ventana propia.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 380,
    title: "Taller Mecánico",
    backgroundColor: "#0f141b",
    icon: path.join(__dirname, "app", "icono-512.png"),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  ventana.loadFile(path.join(__dirname, "app", "index.html"));

  // Enlaces externos (YouTube, manuales, WhatsApp) se abren en el navegador normal.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto|tel):/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  ventana.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) { e.preventDefault(); shell.openExternal(url); }
  });
}

app.whenReady().then(crearVentana);
app.on("window-all-closed", () => app.quit());
