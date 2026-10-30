// Prueba de la interfaz en Edge/Chrome sin ventana, usando el protocolo DevTools.
// Uso: node pruebas/interfaz.test.js "<ruta a msedge.exe o chrome>" [carpeta de capturas]
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const navegador = process.argv[2];
const capturas = process.argv[3] || path.join(os.tmpdir(), "taller-capturas");
fs.mkdirSync(capturas, { recursive: true });
const PUERTO = 8123, DEPURA = 9333;

const espera = ms => new Promise(r => setTimeout(r, ms));

// PDF mínimo de verdad (una página por texto) para probar la importación y la búsqueda.
function crearPdf(paginas) {
  const objs = [];
  const n = paginas.length;
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${n} >>`;
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
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  const servidor = spawn(process.execPath, [path.join(__dirname, "servidor.js"), String(PUERTO)], { stdio: "ignore" });
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "taller-perfil-"));
  const banderas = ["--headless=new", "--disable-gpu", `--remote-debugging-port=${DEPURA}`, `--user-data-dir=${perfil}`, "--window-size=412,915"];
  if (process.platform === "linux") banderas.push("--no-sandbox");
  const nav = spawn(navegador, [...banderas, "about:blank"], { stdio: "ignore" });
  let fallos = 0;
  try {
    let objetivos;
    for (let i = 0; i < 40; i++) {
      try { objetivos = await (await fetch(`http://127.0.0.1:${DEPURA}/json`)).json(); if (objetivos.length) break; } catch (e) {}
      await espera(250);
    }
    const pagina = objetivos.find(o => o.type === "page");
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise(r => (ws.onopen = r));
    let n = 0; const pendientes = {}; const errores = []; const avisos = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pendientes[m.id]) { pendientes[m.id](m); delete pendientes[m.id]; }
      if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errores.push(m.params.args.map(a => a.value || a.description).join(" "));
      if (m.method === "Runtime.consoleAPICalled" && ["warning", "log"].includes(m.params.type)) avisos.push(m.params.args.map(a => a.value || a.description).join(" "));
    };
    const cdp = (method, params = {}) => new Promise(r => { const id = ++n; pendientes[id] = r; ws.send(JSON.stringify({ id, method, params })); });
    const js = async expr => {
      const r = await cdp("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "error en evaluate");
      return r.result.result.value;
    };
    const foto = async nombre => {
      const r = await cdp("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(capturas, nombre + ".png"), Buffer.from(r.result.data, "base64"));
    };
    const verificar = (cond, msg) => { if (cond) console.log("✔", msg); else { fallos++; console.log("✘", msg); } };

    await cdp("Runtime.enable"); await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: 412, height: 915, deviceScaleFactor: 1, mobile: true });
    await cdp("Page.navigate", { url: `http://localhost:${PUERTO}/` });
    await espera(1500);
    await foto("01-inicio");
    verificar(await js(`return document.body.innerText.includes("Nuevo proyecto")`), "pantalla de inicio carga");

    // Crear proyecto de montacargas
    await js(`document.querySelector('[onclick*="/nuevo"]').click()`); await espera(300);
    await foto("02-tipo");
    await js(`[...document.querySelectorAll('.tipo')].find(b=>b.textContent.includes('Montacargas')).click()`); await espera(200);
    await js(`const m=document.querySelector('#f-marca'); m.value='Toyota'; m.dispatchEvent(new Event('change'));
      document.querySelector('#f-modelo').value='8FGU25'; document.querySelector('#f-anio').value='2016';
      document.querySelector('#f-uso').value='12500'; document.querySelector('#f-cliente').value='Bodega Norte';
      document.querySelector('#f-tel').value='5512345678';`);
    verificar(await js(`return document.querySelectorAll('#modelos option').length > 3`), "sugiere modelos de la marca");
    await foto("03-datos");
    await js(`[...document.querySelectorAll('.btn')].find(b=>b.textContent.includes('Siguiente')).click()`); await espera(200);
    await js(`const s=document.querySelector('.buscar-fallas'); s.value='sube'; s.dispatchEvent(new Event('input'));`); await espera(100);
    await js(`const c=document.querySelector('.catalogo input[value="mastil_no_sube"]'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true}));`);
    await js(`document.querySelector('#propia').value='chilla la bomba al levantar'; document.querySelector('#sugerir').click();`); await espera(100);
    verificar(await js(`return document.querySelector('#sugerencias').innerText.includes('Bomba hidráulica hace ruido')`), "motor local sugiere fallas desde texto libre");
    await foto("04-fallas");
    await js(`document.querySelector('#crear').click()`); await espera(500);
    verificar(await js(`return location.hash.startsWith('#/p/') && document.body.innerText.includes('Mástil no sube')`), "proyecto creado con su falla");
    await foto("05-proyecto-fallas");

    // Marcar un paso y agregar bitácora
    await js(`const c=document.querySelector('[data-check]'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true}));`); await espera(200);
    const id = await js(`return location.hash.split('/')[2]`);
    await js(`location.hash='#/p/${id}/bitacora'`); await espera(300);
    await js(`document.querySelector('#nota').value='Presión de levante medida 120 bar, P0302 no aplica'; document.querySelector('#guardar-nota').click();`); await espera(400);
    verificar(await js(`return document.querySelector('#linea').innerText.includes('120 bar')`), "nota guardada en bitácora");
    await foto("06-bitacora");

    // Estado
    await js(`const e=document.querySelector('#estado'); e.value='reparando'; e.dispatchEvent(new Event('change'));`); await espera(400);
    verificar(await js(`return document.querySelector('#estado').value==='reparando'`), "cambio de estado");

    // Cronómetro y piezas
    await js(`location.hash='#/p/${id}/resumen'`); await espera(300);
    await js(`document.querySelector('#crono').click()`); await espera(300);
    verificar(await js(`return document.querySelector('#crono').textContent.includes('Pausar')`), "cronómetro inicia");
    await js(`document.querySelector('#crono').click()`); await espera(300);
    await js(`document.querySelector('#pz-nombre').value='Filtro de succión'; document.querySelector('#pz-parte').value='67501-23600-71'; document.querySelector('#pz-agregar').click();`); await espera(300);
    verificar(await js(`return document.querySelector('#piezas').innerText.includes('Filtro de succión')`), "pieza agregada");
    await foto("06b-datos");

    // Resolver falla con causa real → el taller aprende
    await js(`location.hash='#/p/${id}/fallas'`); await espera(300);
    await js(`document.querySelector('[data-resolver="0"]').click()`); await espera(300);
    verificar(await js(`return !!document.querySelector('.modal')`), "pregunta la causa real al resolver");
    await foto("06c-causa-real");
    await js(`[...document.querySelectorAll('.modal .opcion')].find(b=>b.textContent.includes('Filtro de succión')).click()`); await espera(400);
    verificar(await js(`const t=document.querySelector('#contenido').textContent; return t.includes('Causa real: Filtro de succión tapado') && t.includes('En tu taller ha sido') && t.includes('✅')`), "guarda la causa real y la experiencia del taller");
    await js(`document.querySelector('details.falla').open=true`); await foto("06d-resuelta");

    // Guías
    await js(`location.hash='#/p/${id}/guias'`); await espera(300);
    verificar(await js(`return [...document.querySelectorAll('a')].some(a=>a.href.includes('youtube.com/results') && decodeURIComponent(a.href).includes('8FGU25'))`), "guías con búsqueda de YouTube del modelo");
    verificar(await js(`return document.body.innerText.includes('P0302')`), "detecta código en bitácora");
    await foto("07-guias");

    // Maestro local (sin llave)
    await js(`location.hash='#/p/${id}/maestro'`); await espera(300);
    await js(`document.querySelector('#pregunta').value='el mastil baja solo con carga'; document.querySelector('#enviar').click();`); await espera(500);
    verificar(await js(`return document.querySelector('#mensajes').innerText.includes('Mástil baja solo')`), "maestro local responde");
    await js(`document.querySelector('#pregunta').value='no sube el mastil'; document.querySelector('#enviar').click();`); await espera(500);
    verificar(await js(`return document.querySelector('#mensajes').innerText.includes('En tu taller')`), "maestro local usa la experiencia del taller");
    await foto("08-maestro");

    // Entregar → pide próximo servicio → aparece en recordatorios
    await js(`const e=document.querySelector('#estado'); e.value='entregado'; e.dispatchEvent(new Event('change'));`); await espera(300);
    verificar(await js(`return document.querySelector('.modal h3').textContent.includes('próximo servicio')`), "al entregar pregunta el próximo servicio");
    await js(`[...document.querySelectorAll('.modal .opcion')].find(b=>b.textContent==='En 1 mes').click()`); await espera(400);
    await js(`location.hash='#/'`); await espera(300);
    verificar(await js(`const r=document.querySelector('.recordatorios'); return !!r && r.innerText.includes('Toyota 8FGU25') && r.innerHTML.includes('wa.me/525512345678')`), "recordatorio de servicio con WhatsApp");
    await foto("08b-recordatorios");

    // Persistencia tras recargar
    await cdp("Page.reload"); await espera(1500);
    await js(`location.hash='#/'`); await espera(300);
    verificar(await js(`return document.body.innerText.includes('Toyota 8FGU25 2016')`), "datos siguen tras recargar");
    await foto("09-lista");

    // Diagnóstico y código
    await js(`location.hash='#/diagnostico'`); await espera(300);
    await js(`document.querySelector('#codigo').value='p0171'; document.querySelector('#c-ir').click();`); await espera(100);
    verificar(await js(`return document.querySelector('#c-resultado').innerText.includes('Mezcla pobre')`), "busca código OBD2");
    await js(`const c=document.querySelector('[data-calc="torque"]'); c.open=true; const i=c.querySelector('[data-k="lb"]'); i.value='100'; i.dispatchEvent(new Event('input',{bubbles:true}));`); await espera(100);
    verificar(await js(`return document.querySelector('[data-calc="torque"] .resultado').innerText.includes('135.6 N·m')`), "calculadora de torque");
    await js(`const c=document.querySelector('[data-calc="horquilla"]'); c.open=true; const a=c.querySelector('[data-k="orig"]'); a.value='45'; const b=c.querySelector('[data-k="actual"]'); b.value='40'; b.dispatchEvent(new Event('input',{bubbles:true}));`); await espera(100);
    verificar(await js(`return document.querySelector('[data-calc="horquilla"] .resultado').innerText.includes('Retirar')`), "calculadora de horquillas");
    await foto("10-diagnostico");
    await js(`location.hash='#/ajustes'`); await espera(300); await foto("11-ajustes");
    await js(`location.hash='#/guias'`); await espera(300); await foto("12-guias");

    // ---------- Manuales ----------
    await js(`sessionStorage.setItem('buscarManual',''); location.hash='#/guias'`); await espera(400);
    verificar(await js(`return document.body.innerText.includes('Manuales del taller') && document.querySelectorAll('#m-listas .fila-manual').length >= 18`), "lista de manuales del taller por categoría");
    await foto("13-manuales");
    await js(`const b=document.querySelector('#m-buscar'); b.value='valvula de alivio'; b.dispatchEvent(new Event('input'));`); await espera(500);
    verificar(await js(`const r=document.querySelector('#m-resultados .tarjeta'); return !!r && r.getAttribute('href').startsWith('#/manual/mc_hidraulico') && !!document.querySelector('#m-resultados mark')`), "buscador general encuentra el capítulo sin acentos y resalta");
    await foto("14-buscar-manuales");
    await js(`document.querySelector('#m-resultados .tarjeta').click()`); await espera(600);
    verificar(await js(`return location.hash.startsWith('#/manual/mc_hidraulico') && document.querySelectorAll('#mm-texto mark').length > 0 && document.body.innerText.includes('Índice')`), "abre el manual con índice y palabras resaltadas");
    await foto("15-manual");

    // Agregar un PDF y buscar dentro
    const rutaPdf = path.join(os.tmpdir(), "Manual-Toyota-8FGU25-prueba.pdf");
    fs.writeFileSync(rutaPdf, crearPdf(["Indice general Toyota 8FGU25", "Ajuste de la valvula de alivio: 175 bar", "Cadenas de levante"]));
    await js(`sessionStorage.setItem('buscarManual',''); location.hash='#/guias'`); await espera(400);
    const docu = await cdp("DOM.getDocument", { depth: -1 });
    const nodo = await cdp("DOM.querySelector", { nodeId: docu.result.root.nodeId, selector: "#m-pdf" });
    await cdp("DOM.setFileInputFiles", { nodeId: nodo.result.nodeId, files: [rutaPdf] });
    await espera(400);
    verificar(await js(`return !!document.querySelector('#i-guardar')`), "formulario para clasificar el PDF");
    await js(`const t=document.querySelector('#i-tipo'); t.value='montacargas'; t.dispatchEvent(new Event('change'));
      document.querySelector('#i-marca').value='Toyota'; document.querySelector('#i-modelo').value='8FGU25'; document.querySelector('#i-guardar').click();`);
    const inicioPdf = Date.now();
    for (let i = 0; i < 60 && !(await js(`return !document.querySelector('#i-guardar')`)); i++) await espera(500);
    const agregado = await js(`return document.querySelector('#m-listas').innerText.includes('Manual-Toyota-8FGU25-prueba') && document.querySelector('#m-listas').innerText.includes('3 pág.')`);
    verificar(agregado, `PDF agregado y ordenado por marca y modelo (${((Date.now() - inicioPdf) / 1000).toFixed(1)} s)`);
    if (!agregado) console.log("   progreso:", await js(`return (document.querySelector('#i-progreso')||{}).textContent`), "| avisos:", avisos.slice(-5).join(" | "));
    await foto("16-mis-pdf");
    await js(`const b=document.querySelector('#m-buscar'); b.value='175 bar'; b.dispatchEvent(new Event('input'));`); await espera(500);
    verificar(await js(`return [...document.querySelectorAll('#m-resultados .tarjeta')].some(a=>a.getAttribute('href').endsWith('/2'))`), "busca dentro del PDF y encuentra la página 2");
    await js(`[...document.querySelectorAll('#m-resultados .tarjeta')].find(a=>a.getAttribute('href').endsWith('/2')).click()`);
    for (let i = 0; i < 20 && !(await js(`return !!document.querySelector('#pv-lienzo canvas')`)); i++) await espera(500);
    verificar(await js(`return !!document.querySelector('#pv-lienzo canvas') && document.querySelector('#pv-pag').value==='2' && document.querySelector('#pv-resultados').innerText.includes('Pág. 2')`), "visor abre el PDF en la página encontrada");
    await foto("17-visor-pdf");

    // El vehículo muestra sus manuales
    await js(`location.hash='#/p/${id}/guias'`); await espera(400);
    verificar(await js(`return document.body.innerText.includes('Tus PDF de Toyota 8FGU25') && document.body.innerText.includes('Manuales del taller para estas fallas')`), "el proyecto muestra sus PDF y capítulos");
    await foto("18-proyecto-manuales");
    await js(`location.hash='#/p/${id}/fallas'`); await espera(300);
    verificar(await js(`return !!document.querySelector('.manual-enlace')`), "cada falla enlaza a su capítulo del manual");

    verificar(errores.length === 0, "sin errores en consola" + (errores.length ? ": " + errores.join(" | ") : ""));
    ws.close();
  } finally {
    nav.kill(); servidor.kill();
  }
  console.log(fallos ? `\n${fallos} verificación(es) fallaron` : "\nTodas las verificaciones pasaron");
  console.log("Capturas en", capturas);
  process.exit(fallos ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
