// Prueba la app de Windows (Electron) ya compilada: abre, agrega un PDF y lo muestra en el visor.
// Uso: node pruebas/escritorio.test.js "<ruta a Taller Mecánico.exe>"
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const exe = process.argv[2];
const PUERTO = 9334;
const espera = ms => new Promise(r => setTimeout(r, ms));

// Mismo PDF mínimo que en interfaz.test.js
function crearPdf(paginas) {
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${paginas.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  paginas.forEach((t, i) => {
    const flujo = `BT /F1 18 Tf 50 750 Td (${t}) Tj ET`;
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`;
  });
  let pdf = "%PDF-1.4\n";
  const pos = [];
  for (let k = 1; k < objs.length; k++) { pos[k] = pdf.length; pdf += `${k} 0 obj\n${objs[k]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + pos.slice(1).map(p => String(p).padStart(10, "0") + " 00000 n \n").join("");
  return Buffer.from(pdf + `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "latin1");
}

async function main() {
  const entorno = { ...process.env };
  delete entorno.ELECTRON_RUN_AS_NODE; // VS Code lo pone y hace que Electron se comporte como Node
  const datos = fs.mkdtempSync(path.join(os.tmpdir(), "taller-escritorio-"));
  const app = spawn(exe, [`--remote-debugging-port=${PUERTO}`, `--user-data-dir=${datos}`], { env: entorno, stdio: "ignore" });
  let fallos = 0;
  const verificar = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) fallos++; };
  try {
    let pagina;
    for (let i = 0; i < 60 && !pagina; i++) {
      try { pagina = (await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json()).find(o => o.type === "page"); } catch (e) {}
      if (!pagina) await espera(500);
    }
    verificar(!!pagina, "la ventana de la app abre");
    if (!pagina) return;
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise(r => (ws.onopen = r));
    let n = 0; const pend = {}; const errores = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
      if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    };
    const cdp = (method, params = {}) => new Promise(r => { const id = ++n; pend[id] = r; ws.send(JSON.stringify({ id, method, params })); });
    const js = async e => (await cdp("Runtime.evaluate", { expression: `(async()=>{${e}})()`, awaitPromise: true, returnByValue: true })).result.result.value;
    await cdp("Runtime.enable");
    await espera(1500);
    verificar(await js(`return location.protocol === 'file:' && document.body.innerText.includes('Nuevo proyecto')`), "carga la app desde los archivos locales");
    await js(`location.hash='#/guias'`); await espera(500);
    verificar(await js(`return document.querySelectorAll('#m-listas .fila-manual').length >= 18`), "manuales del taller");
    const ruta = path.join(datos, "Manual-prueba.pdf");
    fs.writeFileSync(ruta, crearPdf(["Indice", "Valvula de alivio 175 bar"]));
    const doc = await cdp("DOM.getDocument", { depth: -1 });
    const nodo = await cdp("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#m-pdf" });
    await cdp("DOM.setFileInputFiles", { nodeId: nodo.result.nodeId, files: [ruta] });
    await espera(500);
    await js(`document.querySelector('#i-marca').value='Toyota'; document.querySelector('#i-guardar').click();`);
    for (let i = 0; i < 40 && !(await js(`return !document.querySelector('#i-guardar')`)); i++) await espera(500);
    verificar(await js(`return document.querySelector('#m-listas').innerText.includes('Manual-prueba')`), "agrega el PDF (pdf.js funciona en Windows)");
    const id = await js(`return pdfsCache[0] && pdfsCache[0].id`);
    await js(`location.hash='#/pdf/${id}/2'`);
    for (let i = 0; i < 30 && !(await js(`return !!document.querySelector('#pv-lienzo canvas')`)); i++) await espera(500);
    verificar(await js(`return !!document.querySelector('#pv-lienzo canvas')`), "el visor dibuja el PDF");
    verificar(errores.length === 0, "sin errores" + (errores.length ? ": " + errores.join(" | ") : ""));
    ws.close();
  } finally {
    app.kill();
    spawn("taskkill", ["/F", "/T", "/PID", String(app.pid)], { stdio: "ignore" });
  }
  console.log(fallos ? `\n${fallos} verificación(es) fallaron` : "\nLa app de Windows pasó todas las verificaciones");
  process.exitCode = fallos ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
