// Servidor local para probar la app: node pruebas/servidor.js [puerto]
const http = require("http");
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..", "www");
const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const puerto = +process.argv[2] || 8123;

http.createServer((req, res) => {
  const ruta = path.join(raiz, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!ruta.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  fs.readFile(ruta, (err, datos) => {
    if (err) { res.writeHead(404); return res.end("no encontrado"); }
    res.writeHead(200, { "content-type": (tipos[path.extname(ruta)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(datos);
  });
}).listen(puerto, () => console.log("http://localhost:" + puerto));
