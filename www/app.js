// Interfaz de la app del taller. Vanilla JS, sin dependencias, funciona sin internet.

const VERSION = "1.3.0";
const $ = s => document.querySelector(s);
const vista = () => $("#vista");

let proyectos = [];
let ajustes = { llave: "", taller: "Mi Taller", motorPreferido: "auto" };
let borrador = null;     // proyecto que se está creando
let chatGeneral = [];
let aprendido = {};      // { idFalla: { "causa real": veces } }
let pdfsCache = [];      // datos y texto de los manuales PDF del usuario (sin el archivo)
let pensando = false;

// ---------- utilidades ----------
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fecha = t => new Date(t).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
const estadoDe = id => ESTADOS.find(e => e.id === id) || ESTADOS[0];
const tituloDe = p => `${p.marca} ${p.modelo}${p.anio ? " " + p.anio : ""}`.trim();
const nombreFalla = f => (f.id && Motor.porId(f.id) ? Motor.porId(f.id).n : f.texto);

function markdown(texto) {
  const lineas = esc(texto).split("\n");
  let html = "", lista = null, tabla = null;
  const cerrar = () => {
    if (lista) { html += `</${lista}>`; lista = null; }
    if (tabla) {
      const [cab, ...filas] = tabla;
      html += `<div class="tabla"><table><thead><tr>${cab.map(c => `<th>${enLinea(c)}</th>`).join("")}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${enLinea(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      tabla = null;
    }
  };
  // Sólo se permiten enlaces internos (#/...): el texto puede venir de la IA o de un PDF.
  const enLinea = s => s.replace(/\[([^\]]+)\]\((#\/[^)\s"]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/`(.+?)`/g, "<code>$1</code>");
  for (const l of lineas) {
    let m;
    if (/^\s*\|/.test(l)) {
      if (lista) { html += `</${lista}>`; lista = null; }
      if (/^\s*\|[\s|:-]+\|\s*$/.test(l)) continue; // fila separadora |---|
      (tabla = tabla || []).push(l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      continue;
    }
    if (tabla) cerrar();
    if ((m = l.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i))) { if (lista !== "ul class=\"casillas\"") { cerrar(); html += '<ul class="casillas">'; lista = 'ul class="casillas"'; } html += `<li>${m[1].trim() ? "☑" : "☐"} ${enLinea(m[2])}</li>`; }
    else if ((m = l.match(/^#{1,4}\s+(.*)/))) { cerrar(); html += `<h4>${enLinea(m[1])}</h4>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (lista !== "ol") { cerrar(); html += "<ol>"; lista = "ol"; } html += `<li>${enLinea(m[1])}</li>`; }
    else if ((m = l.match(/^\s*[-•*]\s+(.*)/))) { if (lista !== "ul") { cerrar(); html += "<ul>"; lista = "ul"; } html += `<li>${enLinea(m[1])}</li>`; }
    else if ((m = l.match(/^&gt;\s?(.*)/))) { cerrar(); html += `<blockquote>${enLinea(m[1])}</blockquote>`; }
    else if (!l.trim()) { cerrar(); }
    else { cerrar(); html += `<p>${enLinea(l)}</p>`; }
  }
  cerrar();
  return html.replace(/<\/ul class="casillas">/g, "</ul>");
}

// Resalta las palabras buscadas (sin importar acentos) dentro de un elemento ya pintado.
function patronBusqueda(palabras) {
  const variantes = { a: "aáàä", e: "eéèë", i: "iíìï", o: "oóòö", u: "uúùü", n: "nñ" };
  const partes = palabras.filter(p => p.length >= 2).map(p => [...p].map(ch => variantes[ch] ? `[${variantes[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + (p.length <= 3 ? "(?![\\p{L}\\p{N}])" : ""));
  // Sólo al inicio de una palabra, igual que el buscador del motor.
  return partes.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${partes.join("|")})`, "giu") : null;
}

function marcarEn(elemento, palabras) {
  const patron = patronBusqueda(palabras);
  if (!patron || !elemento) return 0;
  const nodos = [];
  const recorrido = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
  while (recorrido.nextNode()) if (recorrido.currentNode.nodeValue.trim()) nodos.push(recorrido.currentNode);
  let total = 0;
  for (const n of nodos) {
    patron.lastIndex = 0;
    if (!patron.test(n.nodeValue)) continue;
    const span = document.createElement("span");
    span.innerHTML = esc(n.nodeValue).replace(patron, m => (total++, `<mark>${m}</mark>`));
    n.replaceWith(...span.childNodes);
  }
  return total;
}

const resaltarTexto = (texto, palabras) => {
  const patron = patronBusqueda(palabras);
  return patron ? esc(texto).replace(patron, "<mark>$1</mark>") : esc(texto);
};

function aviso(texto) {
  const t = $("#aviso");
  t.textContent = texto;
  t.classList.add("visible");
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => t.classList.remove("visible"), 2500);
}

// Ventana con botones de opciones + campo libre. Devuelve el texto elegido o null.
function elegir(titulo, opciones, placeholder) {
  return new Promise(ok => {
    const d = document.createElement("div");
    d.className = "modal";
    d.innerHTML = `<div class="caja">
      <h3>${esc(titulo)}</h3>
      ${opciones.map((o, i) => `<button class="btn sec opcion" data-i="${i}">${esc(o)}</button>`).join("")}
      <input id="modal-otra" placeholder="${esc(placeholder || "Otra (escríbela)")}">
      <div class="acciones"><button class="btn sec" data-cerrar>Omitir</button><button class="btn" data-otra>Guardar</button></div>
    </div>`;
    const cerrar = v => { d.remove(); ok(v); };
    d.onclick = e => {
      const b = e.target.closest("button");
      if (e.target === d || (b && b.dataset.cerrar !== undefined)) return cerrar(null);
      if (!b) return;
      if (b.dataset.i !== undefined) return cerrar(opciones[+b.dataset.i]);
      if (b.dataset.otra !== undefined) return cerrar(d.querySelector("#modal-otra").value.trim() || null);
    };
    document.body.appendChild(d);
  });
}

const duracion = ms => {
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};
// Fechas "AAAA-MM-DD" de los campos date, sin que la zona horaria las mueva un día.
const fechaLocal = s => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const fechaCorta = s => fechaLocal(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const diasPara = s => Math.round((fechaLocal(s) - new Date(new Date().toDateString())) / 86400000);
const sumarMeses = n => {
  const d = new Date(); d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const OPCIONES_SERVICIO = [["En 1 mes", 1], ["En 3 meses", 3], ["En 6 meses", 6], ["En 1 año", 12]];
const tiempoTotal = p => ((p.tiempo && p.tiempo.total) || 0) + (p.tiempo && p.tiempo.inicio ? Date.now() - p.tiempo.inicio : 0);

function comprimirFoto(archivo, maximo = 1024) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maximo / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = mal;
    img.src = URL.createObjectURL(archivo);
  });
}

async function guardarProyecto(p) {
  p.actualizado = Date.now();
  await DB.guardar(p);
  const i = proyectos.findIndex(x => x.id === p.id);
  if (i >= 0) proyectos[i] = p; else proyectos.unshift(p);
}

function anotar(p, tipo, texto, foto) {
  p.bitacora = p.bitacora || [];
  p.bitacora.push({ id: nuevoId(), fecha: Date.now(), tipo, texto, foto: foto || null });
}

function guardarAjustes() {
  try { localStorage.setItem("ajustes", JSON.stringify(ajustes)); } catch (e) {}
}

function motorActivo() {
  if (ajustes.motorPreferido === "local") return "local";
  if (ajustes.llave && navigator.onLine) return "ia";
  return "local";
}

// ---------- navegación ----------
function ir(ruta) { location.hash = ruta; }

function enrutar() {
  const partes = location.hash.replace(/^#\/?/, "").split("/");
  const seccion = ["manual", "pdf"].includes(partes[0]) ? "guias" : partes[0] || "";
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("activo", a.dataset.ruta === seccion));
  window.scrollTo(0, 0);
  switch (partes[0]) {
    case "manual": return pantallaManual(partes[1], partes[2]);
    case "pdf": return pantallaPdf(partes[1], partes[2]);
    case "nuevo": return pantallaNuevo();
    case "p": return pantallaProyecto(partes[1], partes[2] || "resumen");
    case "diagnostico": return pantallaDiagnostico();
    case "maestro": return pantallaMaestro();
    case "guias": return pantallaGuias();
    case "ajustes": return pantallaAjustes();
    default: return pantallaInicio();
  }
}

// ---------- INICIO ----------
function pantallaInicio() {
  const filtro = sessionStorage.getItem("filtro") || "activos";
  const texto = sessionStorage.getItem("busqueda") || "";
  const activos = proyectos.filter(p => p.estado !== "entregado").length;
  vista().innerHTML = `
    <header class="titulo">
      <div><h1>${esc(ajustes.taller)}</h1><p class="sub">${activos} vehículo(s) en el taller</p></div>
      <button class="btn grande" onclick="ir('/nuevo')">＋ Nuevo proyecto</button>
    </header>
    ${htmlRecordatorios()}
    <input id="buscar" type="search" placeholder="Buscar por marca, modelo, placas, cliente…" value="${esc(texto)}">
    <div class="chips" id="filtros">
      ${[["activos", "En el taller"], ["todos", "Todos"], ...ESTADOS.map(e => [e.id, e.nombre])].map(([id, n]) =>
        `<button class="chip ${filtro === id ? "sel" : ""}" data-f="${id}">${n}</button>`).join("")}
    </div>
    <div id="lista"></div>`;
  const pintar = () => {
    const q = Motor.normal($("#buscar").value);
    const f = sessionStorage.getItem("filtro") || "activos";
    const lista = proyectos
      .filter(p => f === "todos" || (f === "activos" ? p.estado !== "entregado" : p.estado === f))
      .filter(p => !q || Motor.normal([p.marca, p.modelo, p.anio, p.placas, p.serie, p.cliente].join(" ")).includes(q))
      .sort((a, b) => b.actualizado - a.actualizado);
    $("#lista").innerHTML = lista.length ? lista.map(tarjetaProyecto).join("") :
      `<div class="vacio"><div class="emoji">🔧</div><p>${proyectos.length ? "Nada con ese filtro." : "Aún no hay proyectos. Toca <b>＋ Nuevo proyecto</b> cuando llegue un vehículo."}</p></div>`;
  };
  $("#buscar").oninput = () => { sessionStorage.setItem("busqueda", $("#buscar").value); pintar(); };
  $("#filtros").onclick = e => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    sessionStorage.setItem("filtro", b.dataset.f);
    document.querySelectorAll("#filtros .chip").forEach(c => c.classList.toggle("sel", c === b));
    pintar();
  };
  pintar();
}

// Servicios vencidos o que tocan en los próximos 31 días.
function htmlRecordatorios() {
  const lista = proyectos.filter(p => p.proxFecha && diasPara(p.proxFecha) <= 31).sort((a, b) => a.proxFecha.localeCompare(b.proxFecha));
  if (!lista.length) return "";
  return `<details class="caja recordatorios" open><summary><b>🔔 Servicios por hacer (${lista.length})</b></summary>
    ${lista.map(p => {
      const dias = diasPara(p.proxFecha);
      const cuando = dias < 0 ? `<b class="vencido">venció hace ${-dias} día(s)</b>` : dias === 0 ? "<b>hoy</b>" : `en ${dias} día(s)`;
      const tel = (p.telefono || "").replace(/\D/g, "");
      const msg = `Hola, le escribe ${ajustes.taller}. A su ${tituloDe(p)} le toca servicio ${dias < 0 ? "desde el" : "el"} ${fechaCorta(p.proxFecha)}. ¿Le agendamos?`;
      return `<div class="recordatorio">
        <a href="#/p/${p.id}">${esc(tituloDe(p))}${p.cliente ? ` · ${esc(p.cliente)}` : ""}</a>
        <span class="sub">${fechaCorta(p.proxFecha)} · ${cuando}</span>
        ${tel ? `<a class="btn sec chico" target="_blank" rel="noopener" href="https://wa.me/${tel.length === 10 ? "52" + tel : tel}?text=${encodeURIComponent(msg)}">💬 Avisar</a>` : ""}
      </div>`;
    }).join("")}
  </details>`;
}

function tarjetaProyecto(p) {
  const e = estadoDe(p.estado);
  const pendientes = (p.fallas || []).filter(f => !f.resuelta).length;
  return `<a class="tarjeta proyecto" href="#/p/${p.id}">
    <div class="icono">${TIPOS[p.tipo].icono}</div>
    <div class="info">
      <b>${esc(tituloDe(p))}</b>
      <span class="sub">${esc([p.placas || p.serie, p.cliente].filter(Boolean).join(" · ") || TIPOS[p.tipo].nombre)}</span>
      <span class="sub">${pendientes ? `🔴 ${pendientes} falla(s) pendiente(s)` : "✅ Sin fallas pendientes"} · ${fecha(p.actualizado)}</span>
      ${p.tiempo && p.tiempo.inicio ? `<span class="sub en-curso">⏱ Trabajando ahora · ${duracion(tiempoTotal(p))}</span>` : ""}
    </div>
    <span class="estado" style="background:${e.color}">${e.nombre}</span>
  </a>`;
}

// ---------- NUEVO PROYECTO ----------
function pantallaNuevo() {
  if (!borrador) borrador = { paso: 1, fallas: [] };
  if (borrador.paso === 1) return nuevoPaso1();
  if (borrador.paso === 2) return nuevoPaso2();
  return nuevoPaso3();
}

function pasos(n) {
  return `<div class="pasos">${["Tipo", "Datos", "Fallas"].map((t, i) => `<span class="${i + 1 <= n ? "hecho" : ""}">${i + 1}. ${t}</span>`).join("")}</div>`;
}

function nuevoPaso1() {
  vista().innerHTML = `
    <header class="titulo"><h1>Nuevo proyecto</h1><button class="btn sec" onclick="cancelarNuevo()">Cancelar</button></header>
    ${pasos(1)}
    <h2>¿Qué vehículo llegó?</h2>
    <div class="tipos">
      ${Object.entries(TIPOS).map(([id, t]) => `<button class="tipo" onclick="elegirTipo('${id}')"><span>${t.icono}</span>${t.nombre}</button>`).join("")}
    </div>`;
}

function elegirTipo(tipo) {
  borrador.tipo = tipo;
  borrador.combustible = tipo === "montacargas" ? "Gas LP" : "Gasolina";
  borrador.paso = 2;
  pantallaNuevo();
}

function cancelarNuevo() {
  if (borrador && borrador.paso > 1 && !confirm("¿Descartar este proyecto nuevo?")) return;
  borrador = null;
  ir("/");
}

function formularioDatos(p) {
  const marcas = Object.keys(MARCAS[p.tipo]);
  const esMc = p.tipo === "montacargas";
  return `
    <label>Marca
      <select id="f-marca">${marcas.map(m => `<option ${p.marca === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select>
    </label>
    <label id="f-marca-otra-l" class="${p.marca && !marcas.includes(p.marca) ? "" : "oculto"}">Escribe la marca
      <input id="f-marca-otra" value="${esc(p.marca && !marcas.includes(p.marca) ? p.marca : "")}">
    </label>
    <label>Modelo
      <input id="f-modelo" list="modelos" value="${esc(p.modelo || "")}" placeholder="${esMc ? "Ej. 8FGU25" : "Ej. Versa"}">
      <datalist id="modelos"></datalist>
    </label>
    <div class="dos">
      <label>Año<input id="f-anio" type="number" inputmode="numeric" min="1950" max="2035" value="${esc(p.anio || "")}"></label>
      <label>Combustible
        <select id="f-comb">${COMBUSTIBLES.map(c => `<option ${p.combustible === c ? "selected" : ""}>${c}</option>`).join("")}</select>
      </label>
    </div>
    <label>Motor / versión <input id="f-motor" value="${esc(p.motor || "")}" placeholder="${esMc ? "Ej. Toyota 4Y, Nissan K25" : "Ej. 1.6 L, V8 5.3"}"></label>
    <div class="dos">
      <label>${esMc ? "N.º de serie" : "Placas"}<input id="f-placas" value="${esc(esMc ? p.serie || "" : p.placas || "")}"></label>
      <label>${esMc ? "Horómetro (h)" : "Kilometraje"}<input id="f-uso" type="number" inputmode="numeric" value="${esc(esMc ? p.horas || "" : p.km || "")}"></label>
    </div>
    ${esMc ? `<label>Capacidad (kg)<input id="f-capacidad" type="number" inputmode="numeric" value="${esc(p.capacidad || "")}" placeholder="Ej. 2500"></label>` :
      `<label>VIN (opcional)<input id="f-vin" value="${esc(p.vin || "")}" maxlength="17" style="text-transform:uppercase"></label>`}
    <div class="dos">
      <label>Cliente / empresa<input id="f-cliente" value="${esc(p.cliente || "")}"></label>
      <label>Teléfono<input id="f-tel" type="tel" value="${esc(p.telefono || "")}"></label>
    </div>
    <label>Cómo llegó (notas de recepción)<textarea id="f-notas" rows="2" placeholder="Golpes, nivel de gasolina, objetos dentro…">${esc(p.notas || "")}</textarea></label>
    <div class="dos">
      <label>Próximo servicio (fecha)<input id="f-prox-fecha" type="date" value="${esc(p.proxFecha || "")}"></label>
      <label>Próximo servicio a los (${esMc ? "h" : "km"})<input id="f-prox-uso" type="number" inputmode="numeric" value="${esc(p.proxUso || "")}"></label>
    </div>`;
}

function activarFormulario(p) {
  const pintarModelos = () => {
    const m = $("#f-marca").value;
    $("#f-marca-otra-l").classList.toggle("oculto", m !== "Otra");
    $("#modelos").innerHTML = (MARCAS[p.tipo][m] || []).map(x => `<option value="${esc(x)}">`).join("");
  };
  if (p.marca && !MARCAS[p.tipo][p.marca]) $("#f-marca").value = "Otra";
  $("#f-marca").onchange = pintarModelos;
  pintarModelos();
}

function leerFormulario(p) {
  const marca = $("#f-marca").value === "Otra" ? $("#f-marca-otra").value.trim() || "Otra" : $("#f-marca").value;
  const esMc = p.tipo === "montacargas";
  Object.assign(p, {
    marca,
    modelo: $("#f-modelo").value.trim(),
    anio: $("#f-anio").value.trim(),
    combustible: $("#f-comb").value,
    motor: $("#f-motor").value.trim(),
    cliente: $("#f-cliente").value.trim(),
    telefono: $("#f-tel").value.trim(),
    notas: $("#f-notas").value.trim(),
    proxFecha: $("#f-prox-fecha").value,
    proxUso: $("#f-prox-uso").value.trim(),
  });
  if (esMc) { p.serie = $("#f-placas").value.trim(); p.horas = $("#f-uso").value.trim(); p.capacidad = $("#f-capacidad").value.trim(); }
  else { p.placas = $("#f-placas").value.trim().toUpperCase(); p.km = $("#f-uso").value.trim(); p.vin = $("#f-vin").value.trim().toUpperCase(); }
  if (!p.modelo) { aviso("Escribe el modelo"); return false; }
  return true;
}

function nuevoPaso2() {
  vista().innerHTML = `
    <header class="titulo"><h1>${TIPOS[borrador.tipo].icono} ${TIPOS[borrador.tipo].nombre}</h1><button class="btn sec" onclick="cancelarNuevo()">Cancelar</button></header>
    ${pasos(2)}
    <div class="formulario">${formularioDatos(borrador)}</div>
    <div class="acciones">
      <button class="btn sec" onclick="borrador.paso=1;pantallaNuevo()">← Atrás</button>
      <button class="btn" onclick="if(leerFormulario(borrador)){borrador.paso=3;pantallaNuevo()}">Siguiente →</button>
    </div>`;
  activarFormulario(borrador);
}

function selectorFallas(tipo, elegidas, alCambiar) {
  // Pinta un buscador + catálogo de fallas agrupado por sistema, con casillas.
  const cont = document.createElement("div");
  cont.innerHTML = `
    <input type="search" class="buscar-fallas" placeholder="Buscar falla: no sube, se calienta, jalonea…">
    <div class="catalogo"></div>`;
  const pintar = () => {
    const q = Motor.normal(cont.querySelector(".buscar-fallas").value);
    const grupos = {};
    for (const f of Motor.fallasPara(tipo)) {
      if (q && !Motor.normal(f.n + " " + f.k.join(" ")).includes(q)) continue;
      (grupos[f.s] = grupos[f.s] || []).push(f);
    }
    cont.querySelector(".catalogo").innerHTML = Object.entries(grupos).map(([s, fs]) => `
      <details ${q ? "open" : ""}><summary>${SISTEMAS[s]} <span class="sub">(${fs.length})</span></summary>
        ${fs.map(f => `<label class="check"><input type="checkbox" value="${f.id}" ${elegidas.has(f.id) ? "checked" : ""}> ${esc(f.n)}</label>`).join("")}
      </details>`).join("") || `<p class="sub">No hay fallas con esa palabra. Escríbela abajo como falla propia.</p>`;
  };
  cont.querySelector(".buscar-fallas").oninput = pintar;
  cont.onchange = e => {
    if (e.target.type !== "checkbox") return;
    e.target.checked ? elegidas.add(e.target.value) : elegidas.delete(e.target.value);
    alCambiar && alCambiar();
  };
  pintar();
  return cont;
}

function nuevoPaso3() {
  const elegidas = new Set(borrador.fallas.filter(f => f.id).map(f => f.id));
  const propias = borrador.fallas.filter(f => !f.id);
  vista().innerHTML = `
    <header class="titulo"><h1>¿Qué falla tiene?</h1><button class="btn sec" onclick="cancelarNuevo()">Cancelar</button></header>
    ${pasos(3)}
    <p class="sub">Marca todas las que reporta el cliente. Puedes agregar más después.</p>
    <div id="selector"></div>
    <h3>Otra falla (con tus palabras)</h3>
    <textarea id="propia" rows="2" placeholder="Ej. hace un chillido al subir el mástil con carga"></textarea>
    <div class="acciones izq">
      <button class="btn sec" id="agregar-propia">＋ Agregar falla</button>
      <button class="btn sec" id="sugerir">🧠 ¿Qué podría ser?</button>
    </div>
    <div id="sugerencias"></div>
    <ul id="propias" class="lista-simple"></ul>
    <div class="acciones">
      <button class="btn sec" onclick="borrador.paso=2;pantallaNuevo()">← Atrás</button>
      <button class="btn" id="crear">✔ Crear proyecto</button>
    </div>`;
  const pintarPropias = () => {
    $("#propias").innerHTML = propias.map((f, i) => `<li>📝 ${esc(f.texto)} <button class="mini" data-i="${i}">✕</button></li>`).join("");
  };
  $("#propias").onclick = e => { const b = e.target.closest("[data-i]"); if (b) { propias.splice(+b.dataset.i, 1); pintarPropias(); } };
  const selector = selectorFallas(borrador.tipo, elegidas);
  $("#selector").appendChild(selector);
  $("#agregar-propia").onclick = () => {
    const t = $("#propia").value.trim(); if (!t) return;
    propias.push({ texto: t }); $("#propia").value = ""; pintarPropias();
  };
  $("#sugerir").onclick = () => {
    const r = Motor.diagnosticar($("#propia").value, borrador.tipo);
    $("#sugerencias").innerHTML = r.length ?
      `<div class="caja"><b>Puede ser:</b>${r.map(x => `<label class="check"><input type="checkbox" data-sug="${x.falla.id}" ${elegidas.has(x.falla.id) ? "checked" : ""}> ${esc(x.falla.n)}</label>`).join("")}</div>` :
      `<p class="sub">No reconocí la falla; agrégala como falla propia.</p>`;
  };
  $("#sugerencias").onchange = e => {
    const id = e.target.dataset.sug; if (!id) return;
    e.target.checked ? elegidas.add(id) : elegidas.delete(id);
    selector.querySelector(".buscar-fallas").dispatchEvent(new Event("input"));
  };
  $("#crear").onclick = async () => {
    const t = $("#propia").value.trim(); if (t) propias.push({ texto: t });
    const p = {
      ...borrador, paso: undefined,
      id: nuevoId(), creado: Date.now(), estado: "recibido",
      fallas: [...[...elegidas].map(id => ({ id, fecha: Date.now() })), ...propias.map(f => ({ ...f, fecha: Date.now() }))],
      checks: {}, bitacora: [], chat: [], enlaces: [],
    };
    delete p.paso;
    anotar(p, "Recepción", `Llegó ${TIPOS[p.tipo].nombre.toLowerCase()} ${tituloDe(p)}.` + (p.notas ? " " + p.notas : ""));
    await guardarProyecto(p);
    borrador = null;
    aviso("Proyecto creado");
    ir("/p/" + p.id + "/fallas");
  };
  pintarPropias();
}

// ---------- PROYECTO ----------
const PESTANAS = [["resumen", "Datos"], ["fallas", "Fallas"], ["bitacora", "Bitácora"], ["guias", "Guías"], ["maestro", "Maestro"]];

function pantallaProyecto(id, pestana) {
  const p = proyectos.find(x => x.id === id);
  if (!p) { vista().innerHTML = `<div class="vacio"><p>No encontré ese proyecto.</p><button class="btn" onclick="ir('/')">Volver</button></div>`; return; }
  const e = estadoDe(p.estado);
  vista().innerHTML = `
    <header class="titulo proyecto-cab">
      <button class="btn sec chico" onclick="ir('/')">←</button>
      <div class="icono">${TIPOS[p.tipo].icono}</div>
      <div class="info"><h1>${esc(tituloDe(p))}</h1><span class="sub">${esc([p.placas || p.serie, p.cliente].filter(Boolean).join(" · "))}</span></div>
    </header>
    <label class="estado-sel">Estado
      <select id="estado" style="border-color:${e.color}">${ESTADOS.map(x => `<option value="${x.id}" ${x.id === p.estado ? "selected" : ""}>${x.nombre}</option>`).join("")}</select>
    </label>
    <div class="pestanas">${PESTANAS.map(([k, n]) => `<a href="#/p/${p.id}/${k}" class="${k === pestana ? "sel" : ""}">${n}</a>`).join("")}</div>
    <div id="contenido"></div>`;
  $("#estado").onchange = async ev => {
    const nuevo = estadoDe(ev.target.value);
    anotar(p, "Estado", `Cambió a: ${nuevo.nombre}`);
    p.estado = nuevo.id;
    if (nuevo.id === "entregado" && !p.proxFecha) {
      const r = await elegir("¿Cuándo le toca el próximo servicio?", OPCIONES_SERVICIO.map(o => o[0]), "Fecha AAAA-MM-DD");
      const op = OPCIONES_SERVICIO.find(o => o[0] === r);
      if (op) p.proxFecha = sumarMeses(op[1]);
      else if (r && /^\d{4}-\d{2}-\d{2}$/.test(r)) p.proxFecha = r;
      if (p.proxFecha) anotar(p, "Recordatorio", `Próximo servicio: ${fechaCorta(p.proxFecha)}`);
    }
    await guardarProyecto(p);
    aviso("Estado: " + nuevo.nombre);
    pantallaProyecto(id, pestana);
  };
  ({ resumen: tabResumen, fallas: tabFallas, bitacora: tabBitacora, guias: tabGuias, maestro: tabMaestro }[pestana] || tabResumen)(p);
}

function tabResumen(p) {
  const esMc = p.tipo === "montacargas";
  const filas = [
    ["Tipo", TIPOS[p.tipo].nombre], ["Marca", p.marca], ["Modelo", p.modelo], ["Año", p.anio], ["Motor / versión", p.motor],
    ["Combustible", p.combustible], [esMc ? "N.º de serie" : "Placas", esMc ? p.serie : p.placas],
    [esMc ? "Horómetro" : "Kilometraje", esMc ? (p.horas ? p.horas + " h" : "") : (p.km ? Number(p.km).toLocaleString("es-MX") + " km" : "")],
    esMc ? ["Capacidad", p.capacidad ? p.capacidad + " kg" : ""] : ["VIN", p.vin],
    ["Cliente", p.cliente], ["Teléfono", p.telefono], ["Recepción", p.notas],
    ["Próximo servicio", [p.proxFecha && fechaCorta(p.proxFecha), p.proxUso && `a los ${Number(p.proxUso).toLocaleString("es-MX")} ${esMc ? "h" : "km"}`].filter(Boolean).join(" · ")],
    ["Creado", fecha(p.creado)],
  ];
  const fallas = p.fallas || [];
  const resueltas = fallas.filter(f => f.resuelta).length;
  const tel = (p.telefono || "").replace(/\D/g, "");
  $("#contenido").innerHTML = `
    <div class="resumen-num">
      <div><b>${fallas.length}</b><span>fallas</span></div>
      <div><b>${resueltas}</b><span>resueltas</span></div>
      <div><b>${(p.bitacora || []).length}</b><span>notas</span></div>
    </div>
    <div class="caja cronometro">
      <div><span class="sub">⏱ Tiempo trabajado</span><b id="tiempo">${duracion(tiempoTotal(p))}</b></div>
      <button class="btn ${p.tiempo && p.tiempo.inicio ? "peligro" : ""}" id="crono">${p.tiempo && p.tiempo.inicio ? "⏸ Pausar" : "▶ Iniciar"}</button>
    </div>
    <div class="caja">
      <h3>🔩 Piezas usadas</h3>
      <div id="piezas"></div>
      <div class="fila piezas-form">
        <input id="pz-nombre" placeholder="Pieza (ej. Bomba de agua)">
        <input id="pz-parte" placeholder="N.º de parte">
        <input id="pz-cant" type="number" inputmode="numeric" min="1" value="1" aria-label="Cantidad">
        <button class="btn chico" id="pz-agregar">＋</button>
      </div>
    </div>
    <div class="caja"><dl>${filas.filter(f => f[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <div class="acciones izq">
      <button class="btn sec" id="editar">✏️ Editar datos</button>
      ${tel ? `<a class="btn sec" href="tel:${tel}">📞 Llamar</a><a class="btn sec" target="_blank" rel="noopener" href="https://wa.me/${tel.length === 10 ? "52" + tel : tel}?text=${encodeURIComponent(`Hola, le escribe ${ajustes.taller}. Su ${tituloDe(p)} está: ${estadoDe(p.estado).nombre}.`)}">💬 WhatsApp</a>` : ""}
      <button class="btn sec" id="reporte">🧾 Reporte</button>
      <button class="btn peligro" id="borrar">🗑 Borrar</button>
    </div>`;
  $("#crono").onclick = async () => {
    p.tiempo = p.tiempo || { total: 0, inicio: null };
    if (p.tiempo.inicio) {
      const tramo = Date.now() - p.tiempo.inicio;
      p.tiempo.total += tramo; p.tiempo.inicio = null;
      anotar(p, "Tiempo", `Trabajo: ${duracion(tramo)} (total ${duracion(p.tiempo.total)})`);
    } else {
      p.tiempo.inicio = Date.now();
    }
    await guardarProyecto(p); tabResumen(p);
  };
  clearInterval(tabResumen.reloj);
  if (p.tiempo && p.tiempo.inicio) tabResumen.reloj = setInterval(() => { const t = $("#tiempo"); if (t) t.textContent = duracion(tiempoTotal(p)); else clearInterval(tabResumen.reloj); }, 30000);
  const pintarPiezas = () => {
    $("#piezas").innerHTML = (p.piezas || []).map((z, i) => `<div class="enlace-guardado"><span>${esc(z.cantidad)} × <b>${esc(z.nombre)}</b>${z.parte ? ` <span class="sub">${esc(z.parte)}</span>` : ""}</span><button class="mini" data-i="${i}">✕</button></div>`).join("") || `<p class="sub">Aún no hay piezas.</p>`;
  };
  $("#piezas").onclick = async e => { const i = e.target.dataset.i; if (i === undefined) return; p.piezas.splice(+i, 1); await guardarProyecto(p); pintarPiezas(); };
  $("#pz-agregar").onclick = async () => {
    const nombre = $("#pz-nombre").value.trim(); if (!nombre) return aviso("Escribe la pieza");
    const z = { nombre, parte: $("#pz-parte").value.trim(), cantidad: Math.max(1, +$("#pz-cant").value || 1) };
    p.piezas = p.piezas || []; p.piezas.push(z);
    anotar(p, "Pieza cambiada", `${z.cantidad} × ${z.nombre}${z.parte ? " (" + z.parte + ")" : ""}`);
    await guardarProyecto(p); pintarPiezas();
    $("#pz-nombre").value = ""; $("#pz-parte").value = ""; $("#pz-cant").value = 1;
  };
  pintarPiezas();
  $("#editar").onclick = () => {
    $("#contenido").innerHTML = `<div class="formulario">${formularioDatos(p)}</div>
      <div class="acciones"><button class="btn sec" id="cancelar">Cancelar</button><button class="btn" id="guardar">Guardar</button></div>`;
    activarFormulario(p);
    $("#cancelar").onclick = () => tabResumen(p);
    $("#guardar").onclick = async () => { if (leerFormulario(p)) { await guardarProyecto(p); aviso("Guardado"); pantallaProyecto(p.id, "resumen"); } };
  };
  $("#reporte").onclick = () => compartirTexto(`Reporte ${tituloDe(p)}`, reporteTexto(p));
  $("#borrar").onclick = async () => {
    if (!confirm(`¿Borrar ${tituloDe(p)} y toda su bitácora? No se puede deshacer.`)) return;
    await DB.borrar(p.id);
    proyectos = proyectos.filter(x => x.id !== p.id);
    aviso("Proyecto borrado");
    ir("/");
  };
}

function reporteTexto(p) {
  const l = [`${ajustes.taller} — Reporte de trabajo`, `${TIPOS[p.tipo].nombre}: ${tituloDe(p)}`];
  if (p.placas || p.serie) l.push(`${p.placas ? "Placas" : "Serie"}: ${p.placas || p.serie}`);
  if (p.cliente) l.push(`Cliente: ${p.cliente}`);
  l.push(`Estado: ${estadoDe(p.estado).nombre}`, "", "FALLAS:");
  for (const f of p.fallas || []) l.push(`${f.resuelta ? "✔" : "•"} ${nombreFalla(f)}${f.causaReal ? " — causa: " + f.causaReal : ""}`);
  if ((p.piezas || []).length) {
    l.push("", "PIEZAS:");
    for (const z of p.piezas) l.push(`- ${z.cantidad} × ${z.nombre}${z.parte ? " (" + z.parte + ")" : ""}`);
  }
  if (tiempoTotal(p)) l.push("", `TIEMPO DE TRABAJO: ${duracion(tiempoTotal(p))}`);
  l.push("", "TRABAJO REALIZADO:");
  for (const b of p.bitacora || []) if (b.tipo !== "Estado") l.push(`- ${fecha(b.fecha)} [${b.tipo}] ${b.texto}`);
  return l.join("\n");
}

// En el APK de Android usamos los plugins nativos de Capacitor para compartir y guardar archivos.
const nativo = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;

async function compartirTexto(titulo, texto) {
  const n = nativo();
  if (n && n.Share) { try { await n.Share.share({ title: titulo, text: texto, dialogTitle: titulo }); } catch (e) {} return; }
  try {
    if (navigator.share) { await navigator.share({ title: titulo, text: texto }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(texto); aviso("Copiado al portapapeles"); }
  catch (e) { prompt("Copia el reporte:", texto); }
}

function tabFallas(p) {
  p.checks = p.checks || {};
  const html = (p.fallas || []).map((f, i) => {
    const info = f.id ? Motor.porId(f.id) : null;
    let cuerpo = "";
    if (info) {
      const hechos = info.p.filter((_, j) => p.checks[`${f.id}-${j}`]).length;
      const exp = Motor.experiencia(aprendido, f.id);
      cuerpo = `
        ${f.causaReal ? `<div class="exito">✔ Causa real: <b>${esc(f.causaReal)}</b></div>` : ""}
        ${info.w ? `<div class="alerta">⚠️ ${esc(info.w)}</div>` : ""}
        ${exp.length ? `<div class="exito">📈 En tu taller ha sido: ${exp.slice(0, 3).map(([c, n]) => `<b>${esc(c)}</b> (${n})`).join(", ")}</div>` : ""}
        <h4>Causas probables</h4><ol>${info.c.map(c => `<li>${esc(c)}</li>`).join("")}</ol>
        <h4>Revisión paso a paso <span class="sub">(${hechos}/${info.p.length})</span></h4>
        ${info.p.map((paso, j) => `<label class="check"><input type="checkbox" data-check="${f.id}-${j}" ${p.checks[`${f.id}-${j}`] ? "checked" : ""}> ${esc(paso)}</label>`).join("")}
        ${info.h ? `<p class="sub">🧰 ${esc(info.h.join(", "))}</p>` : ""}
        ${Motor.capitulosDeFalla(f.id).map(c => `<a class="btn sec chico manual-enlace" href="#/manual/${c.manual.id}/${c.i}">📖 ${esc(c.cap.n)}</a>`).join(" ")}`;
    } else {
      const sug = Motor.diagnosticar(f.texto, p.tipo).slice(0, 3);
      cuerpo = (f.causaReal ? `<div class="exito">✔ Causa real: <b>${esc(f.causaReal)}</b></div>` : "") + `<p class="sub">Falla escrita por ti.</p>` + (sug.length ?
        `<p>El motor local cree que se parece a:</p>${sug.map(s => `<button class="btn sec chico" data-agregar="${s.falla.id}">＋ ${esc(s.falla.n)}</button>`).join(" ")}` :
        `<p class="sub">No hay coincidencias locales. Pregúntale al Maestro.</p>`);
    }
    return `<details class="falla ${f.resuelta ? "resuelta" : ""}" ${i === 0 && !f.resuelta ? "open" : ""}>
      <summary>${f.resuelta ? "✅" : "🔴"} ${esc(nombreFalla(f))}</summary>
      ${cuerpo}
      <div class="acciones izq">
        <button class="btn chico ${f.resuelta ? "sec" : ""}" data-resolver="${i}">${f.resuelta ? "↺ Reabrir" : "✔ Marcar resuelta"}</button>
        <button class="btn sec chico" data-nota="${i}">📝 Anotar</button>
        <button class="btn sec chico" data-preguntar="${i}">🧠 Preguntar</button>
        <button class="btn peligro chico" data-quitar="${i}">✕</button>
      </div>
    </details>`;
  }).join("");
  $("#contenido").innerHTML = `
    ${html || `<div class="vacio"><p>Sin fallas registradas.</p></div>`}
    <details class="caja"><summary><b>＋ Agregar falla</b></summary>
      <div id="agregar-sel"></div>
      <textarea id="nueva-propia" rows="2" placeholder="O escríbela con tus palabras…"></textarea>
      <div class="acciones"><button class="btn" id="agregar-fallas">Agregar</button></div>
    </details>`;
  const nuevas = new Set();
  $("#agregar-sel").appendChild(selectorFallas(p.tipo, nuevas));
  $("#agregar-fallas").onclick = async () => {
    const ya = new Set((p.fallas || []).filter(f => f.id).map(f => f.id));
    for (const id of nuevas) if (!ya.has(id)) { p.fallas.push({ id, fecha: Date.now() }); anotar(p, "Falla", "Nueva falla: " + Motor.porId(id).n); }
    const t = $("#nueva-propia").value.trim();
    if (t) { p.fallas.push({ texto: t, fecha: Date.now() }); anotar(p, "Falla", "Nueva falla: " + t); }
    await guardarProyecto(p); tabFallas(p);
  };
  $("#contenido").onchange = async e => {
    const k = e.target.dataset.check; if (!k) return;
    p.checks[k] = e.target.checked;
    await guardarProyecto(p);
  };
  $("#contenido").onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.resolver) {
      const f = p.fallas[+d.resolver];
      f.resuelta = !f.resuelta;
      if (f.resuelta) {
        // El taller aprende: la causa real sube en el ranking para la próxima vez.
        const info = f.id ? Motor.porId(f.id) : null;
        const causa = await elegir("¿Cuál fue la causa real?", info ? info.c : [], "Escribe la causa real");
        if (causa) {
          f.causaReal = causa;
          if (f.id) {
            aprendido[f.id] = aprendido[f.id] || {};
            aprendido[f.id][causa] = (aprendido[f.id][causa] || 0) + 1;
            await DB.escribir("aprendido", aprendido);
          }
        }
        anotar(p, "Falla", `Resuelta: ${nombreFalla(f)}${causa ? " — causa real: " + causa : ""}`);
      } else {
        delete f.causaReal;
        anotar(p, "Falla", `Reabierta: ${nombreFalla(f)}`);
      }
      await guardarProyecto(p); tabFallas(p);
    } else if (d.quitar) {
      const f = p.fallas[+d.quitar];
      if (!confirm(`¿Quitar "${nombreFalla(f)}"?`)) return;
      p.fallas.splice(+d.quitar, 1); await guardarProyecto(p); tabFallas(p);
    } else if (d.nota) {
      sessionStorage.setItem("notaPrevia", nombreFalla(p.fallas[+d.nota]) + ": ");
      ir(`/p/${p.id}/bitacora`);
    } else if (d.preguntar) {
      sessionStorage.setItem("preguntaPrevia", `Ayúdame con esta falla: ${nombreFalla(p.fallas[+d.preguntar])}. ¿Por dónde empiezo?`);
      ir(`/p/${p.id}/maestro`);
    } else if (d.agregar) {
      if (!p.fallas.some(f => f.id === d.agregar)) { p.fallas.push({ id: d.agregar, fecha: Date.now() }); await guardarProyecto(p); tabFallas(p); }
    }
  };
}

const TIPOS_NOTA = ["Nota", "Diagnóstico", "Prueba / medición", "Pieza cambiada", "Reparación", "Pendiente", "Foto"];

function tabBitacora(p) {
  const previa = sessionStorage.getItem("notaPrevia") || "";
  sessionStorage.removeItem("notaPrevia");
  let foto = null;
  $("#contenido").innerHTML = `
    <div class="caja">
      <div class="chips" id="tipo-nota">${TIPOS_NOTA.map((t, i) => `<button class="chip ${i === 0 ? "sel" : ""}" data-t="${t}">${t}</button>`).join("")}</div>
      <textarea id="nota" rows="3" placeholder="¿Qué hiciste, qué mediste, qué encontraste?">${esc(previa)}</textarea>
      <div class="acciones izq">
        <label class="btn sec">📷 Foto<input type="file" accept="image/*" capture="environment" id="foto" hidden></label>
        <button class="btn sec" id="dictar">🎤 Dictar</button>
        <button class="btn" id="guardar-nota">Guardar en bitácora</button>
      </div>
      <img id="vista-foto" class="miniatura oculto" alt="">
    </div>
    <div id="linea"></div>`;
  let tipo = "Nota";
  $("#tipo-nota").onclick = e => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    tipo = b.dataset.t;
    document.querySelectorAll("#tipo-nota .chip").forEach(c => c.classList.toggle("sel", c === b));
  };
  $("#foto").onchange = async e => {
    if (!e.target.files[0]) return;
    foto = await comprimirFoto(e.target.files[0]);
    $("#vista-foto").src = foto; $("#vista-foto").classList.remove("oculto");
  };
  activarDictado($("#dictar"), $("#nota"));
  $("#guardar-nota").onclick = async () => {
    const t = $("#nota").value.trim();
    if (!t && !foto) return aviso("Escribe algo o toma una foto");
    anotar(p, foto && tipo === "Nota" ? "Foto" : tipo, t || "(foto)", foto);
    await guardarProyecto(p);
    aviso("Guardado en bitácora");
    tabBitacora(p);
  };
  const items = [...(p.bitacora || [])].reverse();
  $("#linea").innerHTML = items.map(b => `
    <div class="evento">
      <div class="punto"></div>
      <div class="cuerpo">
        <span class="sub">${fecha(b.fecha)} · <b>${esc(b.tipo)}</b></span>
        <p>${esc(b.texto)}</p>
        ${b.foto ? `<img class="miniatura" src="${b.foto}" alt="Foto del trabajo" data-ver>` : ""}
      </div>
      <button class="mini" data-borrar="${b.id}" title="Borrar">✕</button>
    </div>`).join("") || `<p class="sub">La bitácora está vacía.</p>`;
  $("#linea").onclick = async e => {
    if (e.target.dataset.ver !== undefined) { abrirFoto(e.target.src); return; }
    const id = e.target.dataset.borrar; if (!id) return;
    if (!confirm("¿Borrar esta entrada?")) return;
    p.bitacora = p.bitacora.filter(b => b.id !== id);
    await guardarProyecto(p); tabBitacora(p);
  };
}

function abrirFoto(src) {
  const d = document.createElement("div");
  d.className = "visor"; d.innerHTML = `<img src="${src}" alt="Foto">`;
  d.onclick = () => d.remove();
  document.body.appendChild(d);
}

function activarDictado(boton, campo) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { boton.remove(); return; }
  boton.onclick = () => {
    const r = new Rec();
    r.lang = "es-MX"; r.interimResults = false;
    boton.textContent = "🎙 Escuchando…";
    r.onresult = e => { campo.value = (campo.value + " " + e.results[0][0].transcript).trim(); };
    r.onend = () => (boton.textContent = "🎤 Dictar");
    r.onerror = () => aviso("No se pudo usar el micrófono");
    r.start();
  };
}

// ---------- GUÍAS ----------
function botonesSitios(consulta) {
  return SITIOS.map(s => `<a class="btn sec chico" target="_blank" rel="noopener" href="${s.u(consulta)}">${s.n}</a>`).join("");
}

function tabGuias(p) {
  const base = `${p.marca} ${p.modelo} ${p.anio || ""}`.replace(/\s+/g, " ").trim();
  const esMc = p.tipo === "montacargas";
  const temas = esMc ?
    ["manual de servicio", "diagrama hidráulico", "códigos de falla", "manual de partes", "ajuste de válvula de alivio"] :
    ["manual de servicio", "diagrama eléctrico", "ubicación de fusibles", "torques", "afinación"];
  const codigos = Motor.buscarCodigos((p.bitacora || []).map(b => b.texto).join(" ") + " " + (p.fallas || []).map(f => f.texto || "").join(" "));
  // Manuales sin internet: capítulos del taller para sus fallas y PDFs de la misma marca y modelo.
  const capitulos = [];
  for (const f of p.fallas || []) for (const c of f.id ? Motor.capitulosDeFalla(f.id) : []) if (!capitulos.some(x => x.manual.id === c.manual.id && x.i === c.i)) capitulos.push(c);
  const mismo = (a, b) => !a || !b || Motor.normal(a).replace(/\s/g, "") === Motor.normal(b).replace(/\s/g, "");
  const pdfsVehiculo = pdfsCache.filter(x => x.marca && mismo(x.marca, p.marca) && mismo(x.modelo, p.modelo) && (!x.tipo || TIPOS[x.tipo].grupo === TIPOS[p.tipo].grupo));
  $("#contenido").innerHTML = `
    ${navigator.onLine ? "" : `<div class="alerta">Sin internet: los enlaces de internet se abrirán cuando tengas señal. Los manuales de abajo sí funcionan sin internet.</div>`}
    <h3>📖 En los manuales (sin internet)</h3>
    ${pdfsVehiculo.length ? `<div class="caja"><b>📄 Tus PDF de ${esc(p.marca)} ${esc(p.modelo)}</b>${pdfsVehiculo.map(x => `<a class="fila-manual" href="#/pdf/${x.id}"><span>📄 ${esc(x.titulo)}</span><span class="sub">${esc(x.categoria)} · ${x.paginas} pág.</span></a>`).join("")}</div>` :
      `<p class="sub">No tienes PDFs de ${esc(p.marca)} ${esc(p.modelo)}. Descárgalos con los botones de abajo y agrégalos en <a href="#/guias">Manuales</a>.</p>`}
    ${capitulos.length ? `<div class="caja"><b>📘 Manuales del taller para estas fallas</b>${capitulos.map(c => `<a class="fila-manual" href="#/manual/${c.manual.id}/${c.i}"><span>📘 ${esc(c.cap.n)}</span><span class="sub">${esc(c.manual.n)}</span></a>`).join("")}</div>` : ""}
    <h3>🌐 Por cada falla (internet)</h3>
    ${(p.fallas || []).map(f => {
      const q = `${base}${esMc ? " montacargas" : ""} ${nombreFalla(f)}`;
      return `<div class="caja"><b>${esc(nombreFalla(f))}</b><div class="enlaces">${botonesSitios(q)}</div></div>`;
    }).join("") || `<p class="sub">Agrega fallas para ver sus guías.</p>`}
    ${codigos.length ? `<h3>Códigos encontrados en la bitácora</h3>${codigos.map(c => `<div class="caja"><b>${c.codigo}</b> ${esc(c.texto)}<div class="enlaces"><a class="btn sec chico" target="_blank" rel="noopener" href="https://www.obd-codes.com/${c.codigo.toLowerCase()}">obd-codes.com</a>${botonesSitios(base + " " + c.codigo)}</div></div>`).join("")}` : ""}
    <h3>Información del ${TIPOS[p.tipo].nombre.toLowerCase()}</h3>
    ${temas.map(t => `<div class="caja"><b>${esc(t[0].toUpperCase() + t.slice(1))}</b><div class="enlaces">${botonesSitios(base + (esMc ? " montacargas " : " ") + t)}</div></div>`).join("")}
    ${!esMc && +p.anio && +p.anio <= 2013 ? `<div class="caja">📚 <b>Manuales de fábrica gratis (1982-2013):</b> <a target="_blank" rel="noopener" href="https://charm.li/">charm.li</a></div>` : ""}
    <h3>Mis enlaces guardados</h3>
    <div id="enlaces"></div>
    <div class="caja">
      <input id="enl-titulo" placeholder="Título (ej. Video cambio de bomba)">
      <input id="enl-url" type="url" placeholder="Pega aquí el enlace">
      <div class="acciones"><button class="btn" id="enl-guardar">Guardar enlace</button></div>
    </div>`;
  const pintar = () => {
    $("#enlaces").innerHTML = (p.enlaces || []).map((e, i) => `<div class="enlace-guardado"><a target="_blank" rel="noopener" href="${esc(e.url)}">🔗 ${esc(e.titulo)}</a><button class="mini" data-i="${i}">✕</button></div>`).join("") || `<p class="sub">Guarda aquí los videos y manuales que te sirvieron.</p>`;
  };
  $("#enlaces").onclick = async e => { const i = e.target.dataset.i; if (i === undefined) return; p.enlaces.splice(+i, 1); await guardarProyecto(p); pintar(); };
  $("#enl-guardar").onclick = async () => {
    const url = $("#enl-url").value.trim();
    if (!/^https?:\/\//.test(url)) return aviso("El enlace debe empezar con http");
    p.enlaces = p.enlaces || [];
    p.enlaces.push({ titulo: $("#enl-titulo").value.trim() || url, url });
    await guardarProyecto(p); pintar();
    $("#enl-url").value = ""; $("#enl-titulo").value = "";
  };
  pintar();
}

// ---------- MAESTRO (chat) ----------
function tabMaestro(p) {
  p.chat = p.chat || [];
  pintarChat($("#contenido"), p.chat, p, async () => guardarProyecto(p));
}

function pantallaMaestro() {
  vista().innerHTML = `<header class="titulo"><div><h1>🧠 Maestro</h1><p class="sub">Pregunta lo que sea de mecánica</p></div><button class="btn sec chico" id="limpiar">Borrar chat</button></header><div id="chat-general"></div>`;
  $("#limpiar").onclick = async () => { if (!confirm("¿Borrar la conversación?")) return; chatGeneral = []; await DB.escribir("chatGeneral", chatGeneral); pantallaMaestro(); };
  pintarChat($("#chat-general"), chatGeneral, null, () => DB.escribir("chatGeneral", chatGeneral));
}

function pintarChat(contenedor, historial, proyecto, guardar) {
  const motor = motorActivo();
  const previa = sessionStorage.getItem("preguntaPrevia") || "";
  sessionStorage.removeItem("preguntaPrevia");
  let foto = null;
  contenedor.innerHTML = `
    <div class="motor-chip ${motor}">${motor === "ia" ? "🌐 Maestro IA (en línea)" : "📴 Maestro local (sin internet)"}
      ${motor === "local" && !ajustes.llave ? ` · <a href="#/ajustes">activar IA</a>` : ""}</div>
    <div class="chat" id="mensajes"></div>
    <div class="caja escribir">
      <textarea id="pregunta" rows="2" placeholder="${proyecto ? "Ej. Ya cambié bujías y sigue jaloneando, ¿qué sigue?" : "Ej. Montacargas Toyota 8FGU25 no sube el mástil con carga"}">${esc(previa)}</textarea>
      <img id="foto-chat" class="miniatura oculto" alt="">
      <div class="acciones izq">
        ${motor === "ia" ? `<label class="btn sec chico">📷<input type="file" accept="image/*" capture="environment" id="adjuntar" hidden></label>` : ""}
        <button class="btn sec chico" id="dictar-chat">🎤</button>
        <button class="btn" id="enviar">Enviar</button>
      </div>
    </div>`;
  const pintarMensajes = () => {
    const m = contenedor.querySelector("#mensajes");
    m.innerHTML = historial.map(x => `<div class="msg ${x.rol}">${x.foto ? `<img class="miniatura" src="${x.foto}" alt="">` : ""}${x.rol === "ia" ? markdown(x.texto) : `<p>${esc(x.texto)}</p>`}${x.motor === "local" ? `<span class="sub">📴 local</span>` : ""}</div>`).join("") +
      (pensando ? `<div class="msg ia"><p class="pensando">Pensando…</p></div>` : "") ||
      `<div class="vacio"><p>Pregúntame una falla, un código (P0300) o pídeme el siguiente paso.</p></div>`;
    m.scrollTop = m.scrollHeight;
    const ult = m.lastElementChild; if (ult && historial.length) ult.scrollIntoView({ block: "nearest" });
  };
  const adj = contenedor.querySelector("#adjuntar");
  if (adj) adj.onchange = async e => {
    if (!e.target.files[0]) return;
    foto = await comprimirFoto(e.target.files[0], 1200);
    const v = contenedor.querySelector("#foto-chat"); v.src = foto; v.classList.remove("oculto");
  };
  activarDictado(contenedor.querySelector("#dictar-chat"), contenedor.querySelector("#pregunta"));
  contenedor.querySelector("#enviar").onclick = async () => {
    const campo = contenedor.querySelector("#pregunta");
    const texto = campo.value.trim();
    if ((!texto && !foto) || pensando) return;
    historial.push({ rol: "usuario", texto, foto });
    campo.value = ""; foto = null;
    contenedor.querySelector("#foto-chat").classList.add("oculto");
    pensando = true; pintarMensajes();
    let respuesta, usado = motorActivo();
    try {
      respuesta = usado === "ia" ? await IA.preguntar(historial, proyecto, ajustes.llave) : Motor.responder(texto, proyecto, aprendido);
    } catch (err) {
      usado = "local";
      respuesta = `> ${err.message}\n\nMientras tanto, esto dice el motor local:\n\n` + Motor.responder(texto, proyecto, aprendido);
    }
    pensando = false;
    historial.push({ rol: "ia", texto: respuesta, motor: usado });
    await guardar();
    pintarMensajes();
  };
  contenedor.querySelector("#pregunta").onkeydown = e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) contenedor.querySelector("#enviar").click();
  };
  pintarMensajes();
}

// ---------- DIAGNÓSTICO RÁPIDO ----------
function pantallaDiagnostico() {
  vista().innerHTML = `
    <header class="titulo"><div><h1>🔍 Diagnóstico</h1><p class="sub">Funciona sin internet</p></div></header>
    <div class="caja">
      <h3>Describe la falla</h3>
      <div class="chips" id="d-tipo">${Object.entries(TIPOS).map(([id, t], i) => `<button class="chip ${i === 0 ? "sel" : ""}" data-t="${id}">${t.icono} ${t.nombre}</button>`).join("")}</div>
      <textarea id="d-texto" rows="3" placeholder="Ej. se calienta y tira agua por abajo / P0171 / el mástil baja solo"></textarea>
      <div class="acciones"><button class="btn sec" id="d-dictar">🎤</button><button class="btn" id="d-ir">Diagnosticar</button></div>
    </div>
    <div id="d-resultado"></div>
    <div class="caja">
      <h3>Buscar código OBD2</h3>
      <div class="fila"><input id="codigo" placeholder="P0300" maxlength="5" style="text-transform:uppercase"><button class="btn" id="c-ir">Buscar</button></div>
      <div id="c-resultado"></div>
    </div>
    <h3>🧮 Calculadoras</h3>
    <div id="calculadoras">${htmlCalculadoras()}</div>
    <h3>Catálogo de fallas</h3>
    <div id="catalogo"></div>`;
  activarCalculadoras();
  let tipo = "coche";
  $("#d-tipo").onclick = e => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    tipo = b.dataset.t;
    document.querySelectorAll("#d-tipo .chip").forEach(c => c.classList.toggle("sel", c === b));
    pintarCatalogo();
  };
  activarDictado($("#d-dictar"), $("#d-texto"));
  $("#d-ir").onclick = () => { $("#d-resultado").innerHTML = `<div class="caja respuesta">${markdown(Motor.responder($("#d-texto").value, { tipo, marca: "", modelo: "" }, aprendido).replace(/^\*\*.*\*\*\n\n/, ""))}</div>`; };
  $("#c-ir").onclick = () => {
    const c = $("#codigo").value.trim().toUpperCase();
    if (!/^[PBCU][0-9A-F]{4}$/.test(c)) return aviso("Formato: letra + 4 dígitos (P0300)");
    const r = Motor.explicarCodigo(c);
    $("#c-resultado").innerHTML = `<p><b>${r.codigo}</b>: ${esc(r.texto)}</p><div class="enlaces"><a class="btn sec chico" target="_blank" rel="noopener" href="https://www.obd-codes.com/${c.toLowerCase()}">obd-codes.com</a>${botonesSitios(c)}</div>`;
  };
  const pintarCatalogo = () => {
    const grupos = {};
    for (const f of Motor.fallasPara(tipo)) (grupos[f.s] = grupos[f.s] || []).push(f);
    $("#catalogo").innerHTML = Object.entries(grupos).map(([s, fs]) => `
      <details class="caja"><summary><b>${SISTEMAS[s]}</b> <span class="sub">(${fs.length})</span></summary>
        ${fs.map(f => `<details class="falla"><summary>${esc(f.n)}</summary>
          ${f.w ? `<div class="alerta">⚠️ ${esc(f.w)}</div>` : ""}
          <h4>Causas</h4><ol>${f.c.map(c => `<li>${esc(c)}</li>`).join("")}</ol>
          <h4>Pasos</h4><ol>${f.p.map(c => `<li>${esc(c)}</li>`).join("")}</ol>
          ${f.h ? `<p class="sub">🧰 ${esc(f.h.join(", "))}</p>` : ""}</details>`).join("")}
      </details>`).join("");
  };
  pintarCatalogo();
}

// ---------- CALCULADORAS ----------
// Cada una: campos [id, etiqueta] y una función que recibe los números y regresa el texto del resultado.
const redondeo = (n, d = 2) => Number.isFinite(n) ? +n.toFixed(d) : "—";
const CALCULADORAS = [
  { id: "ohm", n: "Ley de Ohm (deja vacío lo que buscas)", campos: [["v", "Voltaje (V)"], ["i", "Corriente (A)"], ["r", "Resistencia (Ω)"]],
    f: ({ v, i, r }) => {
      if (v == null && i != null && r != null) return `Voltaje = <b>${redondeo(i * r)} V</b> · Potencia ${redondeo(i * i * r)} W`;
      if (i == null && v != null && r != null) return `Corriente = <b>${redondeo(v / r, 3)} A</b> · Potencia ${redondeo(v * v / r)} W`;
      if (r == null && v != null && i != null) return `Resistencia = <b>${redondeo(v / i, 3)} Ω</b> · Potencia ${redondeo(v * i)} W`;
      return "Llena dos de los tres datos.";
    } },
  { id: "torque", n: "Torque: lb·pie ↔ N·m", campos: [["lb", "lb·pie"], ["nm", "N·m"]],
    f: ({ lb, nm }) => lb != null ? `${lb} lb·pie = <b>${redondeo(lb * 1.35582, 1)} N·m</b>` : nm != null ? `${nm} N·m = <b>${redondeo(nm / 1.35582, 1)} lb·pie</b>` : "Escribe un valor." },
  { id: "presion", n: "Presión: PSI ↔ bar ↔ kPa", campos: [["psi", "PSI"], ["bar", "bar"]],
    f: ({ psi, bar }) => psi != null ? `${psi} PSI = <b>${redondeo(psi / 14.5038)} bar</b> = ${redondeo(psi * 6.89476, 1)} kPa` : bar != null ? `${bar} bar = <b>${redondeo(bar * 14.5038, 1)} PSI</b> = ${redondeo(bar * 100, 1)} kPa` : "Escribe un valor." },
  { id: "temp", n: "Temperatura: °C ↔ °F", campos: [["c", "°C"], ["fa", "°F"]],
    f: ({ c, fa }) => c != null ? `${c} °C = <b>${redondeo(c * 9 / 5 + 32, 1)} °F</b>` : fa != null ? `${fa} °F = <b>${redondeo((fa - 32) * 5 / 9, 1)} °C</b>` : "Escribe un valor." },
  { id: "dist", n: "Distancia: km ↔ millas", campos: [["km", "km"], ["mi", "millas"]],
    f: ({ km, mi }) => km != null ? `${km} km = <b>${redondeo(km / 1.60934, 1)} millas</b>` : mi != null ? `${mi} millas = <b>${redondeo(mi * 1.60934, 1)} km</b>` : "Escribe un valor." },
  { id: "cilindro", n: "Fuerza de cilindro hidráulico", campos: [["bar", "Presión (bar)"], ["d", "Diámetro del pistón (mm)"]],
    f: ({ bar, d }) => {
      if (bar == null || d == null) return "Escribe presión y diámetro.";
      const area = Math.PI * Math.pow(d / 20, 2); // cm²
      return `Área ${redondeo(area, 1)} cm² · Fuerza ≈ <b>${redondeo(bar * area * 1.0197, 0)} kg</b> (${redondeo(bar * area * 10, 0)} N)`;
    } },
  { id: "cadena", n: "Elongación de cadena de montacargas", campos: [["pasos", "Número de pasos medidos"], ["paso", "Paso nominal (mm)"], ["medida", "Medida actual (mm)"]],
    f: ({ pasos, paso, medida }) => {
      if (!pasos || !paso || medida == null) return "Mide varios pasos (ej. 10) con la cadena tensa.";
      const pct = (medida - pasos * paso) / (pasos * paso) * 100;
      const veredicto = pct >= 3 ? "🔴 Cambiar cadenas (en pares)" : pct >= 2 ? "🟠 Cerca del límite: confirma el % del fabricante" : "🟢 Dentro de rango";
      return `Elongación <b>${redondeo(pct, 2)} %</b> · ${veredicto}`;
    } },
  { id: "horquilla", n: "Desgaste de horquilla (talón)", campos: [["orig", "Espesor original (mm)"], ["actual", "Espesor actual (mm)"]],
    f: ({ orig, actual }) => {
      if (!orig || actual == null) return "Mide el espesor en el brazo vertical (original) y en el talón.";
      const pct = (orig - actual) / orig * 100;
      return `Desgaste <b>${redondeo(pct, 1)} %</b> · ${pct >= 10 ? "🔴 Retirar de servicio (10 % o más)" : "🟢 Puede seguir trabajando"}`;
    } },
];

function htmlCalculadoras() {
  return CALCULADORAS.map(c => `
    <details class="caja calc" data-calc="${c.id}"><summary><b>${c.n}</b></summary>
      <div class="dos">${c.campos.map(([k, e]) => `<label>${e}<input type="number" inputmode="decimal" step="any" data-k="${k}"></label>`).join("")}</div>
      <p class="resultado">Escribe los datos.</p>
    </details>`).join("");
}

function activarCalculadoras() {
  $("#calculadoras").oninput = e => {
    const caja = e.target.closest("[data-calc]"); if (!caja) return;
    const calc = CALCULADORAS.find(c => c.id === caja.dataset.calc);
    // En conversiones de dos campos, el que se acaba de escribir manda y el otro se ignora.
    const valores = {};
    caja.querySelectorAll("input").forEach(i => { valores[i.dataset.k] = i.value === "" ? null : +i.value; });
    if (calc.campos.length === 2 && !["cilindro", "horquilla"].includes(calc.id)) {
      for (const [k] of calc.campos) if (k !== e.target.dataset.k) { valores[k] = null; caja.querySelector(`[data-k="${k}"]`).value = ""; }
    }
    caja.querySelector(".resultado").innerHTML = calc.f(valores);
  };
}

// ---------- MANUALES ----------
const CATEGORIAS_PDF = ["Manual de servicio", "Manual de partes", "Diagrama eléctrico", "Diagrama hidráulico", "Manual del operador", "Códigos de falla", "Boletín técnico", "Otro"];
const tamano = b => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const tituloPdf = p => [p.marca, p.modelo, p.anios].filter(Boolean).join(" ");

// pdf.js se carga sólo cuando se necesita (pesa ~1.3 MB).
let promesaPdfJs = null;
function cargarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return promesaPdfJs = promesaPdfJs || new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "vendor/pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; ok(window.pdfjsLib); };
    s.onerror = () => { promesaPdfJs = null; mal(new Error("No se pudo cargar el lector de PDF")); };
    document.head.appendChild(s);
  });
}

// isEvalSupported:false evita que un PDF malicioso ejecute código (CVE-2024-4367).
async function abrirDocumentoPdf(datos) {
  const pdfjs = await cargarPdfJs();
  return pdfjs.getDocument({ data: datos, isEvalSupported: false }).promise;
}

function pantallaGuias() {
  const q = sessionStorage.getItem("buscarManual") || "";
  const tipo = sessionStorage.getItem("tipoManual") || "";
  vista().innerHTML = `
    <header class="titulo"><div><h1>📚 Manuales</h1><p class="sub">${MANUALES.length} del taller · ${pdfsCache.length} PDF tuyos · todo funciona sin internet</p></div></header>
    <input id="m-buscar" type="search" placeholder="Buscar en todos los manuales: válvula de alivio, P0171, cadenas…" value="${esc(q)}">
    <div class="chips" id="m-tipo">${[["", "Todos"], ["coche", "Coche / camioneta"], ["montacargas", "Montacargas"]].map(([id, n]) => `<button class="chip ${tipo === id ? "sel" : ""}" data-t="${id}">${n}</button>`).join("")}</div>
    <div id="m-resultados"></div>
    <div id="m-listas"></div>`;
  const pintar = () => {
    const consulta = $("#m-buscar").value.trim();
    const t = sessionStorage.getItem("tipoManual") || "";
    sessionStorage.setItem("buscarManual", consulta);
    $("#m-listas").classList.toggle("oculto", !!consulta);
    if (!consulta) { $("#m-resultados").innerHTML = ""; return; }
    const r = Motor.buscarManuales(consulta, { pdfs: pdfsCache, tipo: t || null });
    const palabras = Motor.palabrasDe(consulta);
    $("#m-resultados").innerHTML = r.length ? `<p class="sub">${r.length} resultado(s)${r.some(x => !x.completo) ? " · primero los que tienen todas las palabras" : ""}</p>` + r.map(x => `
      <a class="tarjeta resultado-manual" href="${x.ruta}" data-q="${esc(consulta)}">
        <div class="icono">${x.origen === "pdf" ? "📄" : "📘"}</div>
        <div class="info"><b>${resaltarTexto(x.titulo, palabras)}</b><span class="sub">${resaltarTexto(x.fragmento, palabras)}</span></div>
      </a>`).join("") : `<div class="vacio"><p>No encontré "${esc(consulta)}" en los manuales.</p><p class="sub">Prueba con menos palabras o búscalo en internet abajo.</p></div>`;
  };
  $("#m-resultados").onclick = e => { const a = e.target.closest("[data-q]"); if (a) sessionStorage.setItem("resaltar", a.dataset.q); };
  let espera;
  $("#m-buscar").oninput = () => { clearTimeout(espera); espera = setTimeout(pintar, 200); };
  $("#m-tipo").onclick = e => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    sessionStorage.setItem("tipoManual", b.dataset.t);
    document.querySelectorAll("#m-tipo .chip").forEach(c => c.classList.toggle("sel", c === b));
    pintar(); pintarListas();
  };
  const pintarListas = () => {
    const t = sessionStorage.getItem("tipoManual") || "";
    // Manuales del taller por categoría
    const grupos = {};
    for (const m of MANUALES) if (!t || Motor.aplica(m, t)) (grupos[m.c] = grupos[m.c] || []).push(m);
    // PDF por tipo → marca → modelo
    const arbol = {};
    for (const p of pdfsCache) {
      if (t && p.tipo && TIPOS[p.tipo].grupo !== TIPOS[t].grupo) continue;
      const g = p.tipo ? TIPOS[p.tipo].nombre : "General";
      const marca = p.marca || "Sin marca", modelo = p.modelo || "Todos los modelos";
      ((arbol[g] = arbol[g] || {})[marca] = arbol[g][marca] || {});
      (arbol[g][marca][modelo] = arbol[g][marca][modelo] || []).push(p);
    }
    const orden = o => Object.keys(o).sort((a, b) => a.localeCompare(b, "es"));
    $("#m-listas").innerHTML = `
      <h3>📘 Manuales del taller</h3>
      ${Object.keys(CATEGORIAS_MANUAL).filter(c => grupos[c]).map(c => `
        <details class="caja" ${t ? "open" : ""}><summary><b>${CATEGORIAS_MANUAL[c]}</b> <span class="sub">(${grupos[c].length})</span></summary>
          ${grupos[c].map(m => `<a class="fila-manual" href="#/manual/${m.id}"><span>📘 ${esc(m.n)}</span><span class="sub">${m.caps.length} cap. · ${m.t === "m" ? "Montacargas" : m.t === "a" ? "Coche/camioneta" : "Todos"}</span></a>`).join("")}
        </details>`).join("")}
      <h3>📄 Mis manuales PDF</h3>
      <div class="acciones izq"><label class="btn">＋ Agregar PDF<input type="file" accept="application/pdf,.pdf" multiple id="m-pdf" hidden></label></div>
      <p class="sub">Descarga los manuales (por ejemplo de charm.li o ManualsLib) y agrégalos aquí: se guardan en este equipo, se ordenan por marca y modelo, y puedes buscar dentro de su texto sin internet.</p>
      <div id="m-importar"></div>
      ${orden(arbol).map(g => `<details class="caja" open><summary><b>${esc(g)}</b></summary>
        ${orden(arbol[g]).map(marca => `<div class="marca-pdf"><b>${esc(marca)}</b>
          ${orden(arbol[g][marca]).map(modelo => `<div class="modelo-pdf"><span class="sub">${esc(modelo)}</span>
            ${arbol[g][marca][modelo].sort((a, b) => a.titulo.localeCompare(b.titulo, "es")).map(p => `<a class="fila-manual" href="#/pdf/${p.id}"><span>📄 ${esc(p.titulo)}</span><span class="sub">${esc(p.categoria)} · ${p.paginas} pág. · ${tamano(p.tamano)}${p.anios ? " · " + esc(p.anios) : ""}${p.sinTexto ? " · 🖼 escaneado" : ""}</span></a>`).join("")}
          </div>`).join("")}
        </div>`).join("")}
      </details>`).join("") || `<p class="sub">Todavía no agregas PDFs.</p>`}
      <h3>🌐 Buscar en internet</h3>
      <div id="internet"></div>`;
    $("#m-pdf").onchange = e => formularioPdf([...e.target.files]);
    pintarInternet($("#internet"));
  };
  pintarListas();
  pintar();
}

// Formulario para clasificar los PDF que se van a agregar.
function formularioPdf(archivos) {
  if (!archivos.length) return;
  const caja = $("#m-importar");
  const tipos = Object.entries(TIPOS);
  caja.innerHTML = `<div class="caja">
    <h3>Agregar ${archivos.length} PDF</h3>
    <p class="sub">${archivos.map(a => esc(a.name) + " (" + tamano(a.size) + ")").join("<br>")}</p>
    ${archivos.length === 1 ? `<label>Título<input id="i-titulo" value="${esc(archivos[0].name.replace(/\.pdf$/i, ""))}"></label>` : ""}
    <div class="dos">
      <label>Tipo<select id="i-tipo"><option value="">General (todos)</option>${tipos.map(([id, t]) => `<option value="${id}">${t.nombre}</option>`).join("")}</select></label>
      <label>Categoría<select id="i-cat">${CATEGORIAS_PDF.map(c => `<option>${c}</option>`).join("")}</select></label>
    </div>
    <div class="dos">
      <label>Marca<input id="i-marca" list="i-marcas" placeholder="Ej. Toyota"><datalist id="i-marcas"></datalist></label>
      <label>Modelo<input id="i-modelo" placeholder="Ej. 8FGU25 (vacío = todos)"></label>
    </div>
    <label>Años (opcional)<input id="i-anios" placeholder="Ej. 2010-2016"></label>
    <div class="acciones"><button class="btn sec" id="i-cancelar">Cancelar</button><button class="btn" id="i-guardar">Guardar</button></div>
    <p id="i-progreso" class="sub"></p>
  </div>`;
  const marcas = () => {
    const t = $("#i-tipo").value;
    const lista = t ? Object.keys(MARCAS[t]) : [...new Set(Object.values(MARCAS).flatMap(Object.keys))];
    $("#i-marcas").innerHTML = lista.filter(m => m !== "Otra").map(m => `<option value="${esc(m)}">`).join("");
  };
  $("#i-tipo").onchange = marcas; marcas();
  caja.scrollIntoView({ behavior: "smooth" });
  $("#i-cancelar").onclick = () => (caja.innerHTML = "");
  $("#i-guardar").onclick = async () => {
    const boton = $("#i-guardar"); boton.disabled = true;
    const datos = { tipo: $("#i-tipo").value, categoria: $("#i-cat").value, marca: $("#i-marca").value.trim(), modelo: $("#i-modelo").value.trim(), anios: $("#i-anios").value.trim() };
    let hechos = 0;
    for (const archivo of archivos) {
      try {
        const info = await importarPdf(archivo, { ...datos, titulo: (archivos.length === 1 && $("#i-titulo").value.trim()) || archivo.name.replace(/\.pdf$/i, "") },
          (n, total) => ($("#i-progreso").textContent = `${archivo.name}: leyendo página ${n} de ${total}…`));
        pdfsCache.push(info); hechos++;
      } catch (e) {
        aviso(`No se pudo agregar ${archivo.name}: ${e.message}`);
      }
    }
    if (hechos) aviso(`${hechos} manual(es) agregado(s)`);
    pantallaGuias();
  };
}

// Lee el texto de cada página para poder buscar sin internet, y guarda el PDF en el equipo.
async function importarPdf(archivo, datos, progreso) {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const doc = await abrirDocumentoPdf(bytes.slice());
  const texto = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (n === 1 || n % 5 === 0) progreso(n, doc.numPages);
    const pagina = await doc.getPage(n);
    const contenido = await pagina.getTextContent();
    texto.push(contenido.items.map(i => i.str + (i.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+/g, " ").trim());
    pagina.cleanup();
  }
  await doc.destroy();
  // Menos de ~20 letras por página en promedio = PDF escaneado (sólo imágenes): no se puede buscar dentro.
  const letras = texto.join("").replace(/\s/g, "").length;
  const info = {
    id: nuevoId(), ...datos, paginas: texto.length, tamano: archivo.size, nombreArchivo: archivo.name,
    texto, sinTexto: letras < 20 * texto.length, creado: Date.now(),
  };
  await DB.guardarPdf(info, new Blob([bytes], { type: "application/pdf" }));
  return info;
}

// ---------- Ver un manual del taller ----------
function pantallaManual(id, cap) {
  const m = Motor.manualPorId(id);
  if (!m) { vista().innerHTML = `<div class="vacio"><p>No encontré ese manual.</p><a class="btn" href="#/guias">Volver</a></div>`; return; }
  const resaltar = sessionStorage.getItem("resaltar") || "";
  sessionStorage.removeItem("resaltar");
  vista().innerHTML = `
    <header class="titulo proyecto-cab">
      <a class="btn sec chico" href="#/guias">←</a>
      <div class="info"><h1>📘 ${esc(m.n)}</h1><span class="sub">${CATEGORIAS_MANUAL[m.c]} · ${m.t === "m" ? "Montacargas" : m.t === "a" ? "Coche y camioneta" : "Todos los vehículos"}</span></div>
    </header>
    <input id="mm-buscar" type="search" placeholder="Buscar en este manual…" value="${esc(resaltar)}">
    <p id="mm-conteo" class="sub"></p>
    <details class="caja indice" open><summary><b>Índice</b></summary>
      <ol>${m.caps.map((c, i) => `<li><a href="#/manual/${m.id}/${i}">${esc(c.n)}</a></li>`).join("")}</ol>
    </details>
    <div id="mm-texto">${m.caps.map((c, i) => `
      <section class="caja capitulo" id="cap-${i}">
        <h2>${i + 1}. ${esc(c.n)}</h2>
        ${markdown(c.x.trim())}
        ${(c.f || []).length ? `<p class="sub">Fallas relacionadas: ${c.f.map(f => esc((Motor.porId(f) || {}).n || f)).join(" · ")}</p>` : ""}
      </section>`).join("")}</div>
    <p class="sub centro">Manual del taller: valores típicos de referencia. El dato exacto de cada modelo está en su manual de servicio.</p>`;
  const buscar = () => {
    const cont = $("#mm-texto");
    cont.querySelectorAll("mark").forEach(mk => mk.replaceWith(mk.textContent));
    cont.normalize();
    const q = $("#mm-buscar").value.trim();
    const n = q ? marcarEn(cont, Motor.palabrasDe(q)) : 0;
    $("#mm-conteo").textContent = q ? (n ? `${n} coincidencia(s)` : "Sin coincidencias en este manual") : "";
    return n;
  };
  let espera;
  $("#mm-buscar").oninput = () => { clearTimeout(espera); espera = setTimeout(() => { if (buscar()) { const mk = $("#mm-texto mark"); mk && mk.scrollIntoView({ block: "center" }); } }, 250); };
  const n = resaltar ? buscar() : 0;
  const destino = cap !== undefined && cap !== "" ? document.getElementById("cap-" + cap) : null;
  requestAnimationFrame(() => {
    const mk = n && destino ? destino.querySelector("mark") : null;
    if (mk) mk.scrollIntoView({ block: "center" });
    else if (destino) destino.scrollIntoView({ block: "start" });
  });
}

// ---------- Ver un PDF ----------
let pdfAbierto = null; // { id, doc } se reutiliza para no volver a leer el archivo al cambiar de página

async function pantallaPdf(id, pagina) {
  const info = pdfsCache.find(p => p.id === id);
  if (!info) { vista().innerHTML = `<div class="vacio"><p>No encontré ese PDF.</p><a class="btn" href="#/guias">Volver</a></div>`; return; }
  const resaltar = sessionStorage.getItem("resaltar") || "";
  sessionStorage.removeItem("resaltar");
  let actual = Math.min(Math.max(1, +pagina || 1), info.paginas);
  let zoom = +(sessionStorage.getItem("zoomPdf") || 1);
  vista().innerHTML = `
    <header class="titulo proyecto-cab">
      <a class="btn sec chico" href="#/guias">←</a>
      <div class="info"><h1>📄 ${esc(info.titulo)}</h1><span class="sub">${esc([tituloPdf(info), info.categoria, info.paginas + " pág."].filter(Boolean).join(" · "))}</span></div>
    </header>
    <div class="caja barra-pdf">
      <button class="btn sec chico" id="pv-ant" aria-label="Página anterior">◀</button>
      <label class="pagina-pdf"><input id="pv-pag" type="number" inputmode="numeric" min="1" max="${info.paginas}" value="${actual}"> / ${info.paginas}</label>
      <button class="btn sec chico" id="pv-sig" aria-label="Página siguiente">▶</button>
      <button class="btn sec chico" id="pv-menos" aria-label="Alejar">−</button>
      <button class="btn sec chico" id="pv-mas" aria-label="Acercar">＋</button>
    </div>
    <input id="pv-buscar" type="search" placeholder="${info.sinTexto ? "Este PDF es escaneado: no tiene texto para buscar" : "Buscar en este PDF…"}" value="${esc(resaltar)}" ${info.sinTexto ? "disabled" : ""}>
    <div id="pv-resultados"></div>
    <div id="pv-lienzo" class="lienzo-pdf"><p class="sub centro">Abriendo…</p></div>
    <div class="acciones izq">
      <button class="btn sec" id="pv-editar">✏️ Datos</button>
      <button class="btn peligro" id="pv-borrar">🗑 Borrar PDF</button>
    </div>
    <div id="pv-form"></div>`;
  try {
    if (!pdfAbierto || pdfAbierto.id !== id) {
      if (pdfAbierto) pdfAbierto.doc.destroy();
      const archivo = await DB.archivoPdf(id);
      if (!archivo) throw new Error("el archivo no está en el equipo");
      pdfAbierto = { id, doc: await abrirDocumentoPdf(new Uint8Array(await archivo.arrayBuffer())) };
    }
  } catch (e) {
    $("#pv-lienzo").innerHTML = `<div class="alerta">No se pudo abrir el PDF: ${esc(e.message)}</div>`;
    return;
  }
  let tarea = null;
  const pintar = async () => {
    $("#pv-pag").value = actual;
    history.replaceState(null, "", `#/pdf/${id}/${actual}`);
    const pag = await pdfAbierto.doc.getPage(actual);
    const ancho = $("#pv-lienzo").clientWidth || 360;
    const escala = (ancho / pag.getViewport({ scale: 1 }).width) * zoom;
    const vp = pag.getViewport({ scale: escala });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.floor(vp.width * dpr); lienzo.height = Math.floor(vp.height * dpr);
    lienzo.style.width = Math.floor(vp.width) + "px"; lienzo.style.height = Math.floor(vp.height) + "px";
    if (tarea) tarea.cancel();
    tarea = pag.render({ canvasContext: lienzo.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try { await tarea.promise; } catch (e) { return; } // cancelado por otro cambio de página
    $("#pv-lienzo").replaceChildren(lienzo);
  };
  const ir = n => { actual = Math.min(Math.max(1, n), info.paginas); pintar(); };
  $("#pv-ant").onclick = () => ir(actual - 1);
  $("#pv-sig").onclick = () => ir(actual + 1);
  $("#pv-pag").onchange = e => ir(+e.target.value || 1);
  $("#pv-menos").onclick = () => { zoom = Math.max(0.5, zoom - 0.25); sessionStorage.setItem("zoomPdf", zoom); pintar(); };
  $("#pv-mas").onclick = () => { zoom = Math.min(3, zoom + 0.25); sessionStorage.setItem("zoomPdf", zoom); pintar(); };
  const buscar = () => {
    const q = $("#pv-buscar").value.trim();
    if (!q) { $("#pv-resultados").innerHTML = ""; return; }
    const r = Motor.buscarManuales(q, { pdfs: [info] }).filter(x => x.origen === "pdf" && x.texto).sort((a, b) => (b.completo - a.completo) || (a.pagina - b.pagina));
    const palabras = Motor.palabrasDe(q);
    $("#pv-resultados").innerHTML = r.length ? `<details class="caja" open><summary><b>${r.length} página(s) con "${esc(q)}"</b></summary>${r.map(x => `<button class="resultado-pdf" data-p="${x.pagina}"><b>Pág. ${x.pagina}</b> <span class="sub">${resaltarTexto(x.fragmento, palabras)}</span></button>`).join("")}</details>` : `<p class="sub">No aparece "${esc(q)}" en este PDF.</p>`;
  };
  let espera;
  $("#pv-buscar").oninput = () => { clearTimeout(espera); espera = setTimeout(buscar, 250); };
  $("#pv-resultados").onclick = e => { const b = e.target.closest("[data-p]"); if (b) { ir(+b.dataset.p); $("#pv-lienzo").scrollIntoView({ block: "start" }); } };
  $("#pv-borrar").onclick = async () => {
    if (!confirm(`¿Borrar "${info.titulo}" de este equipo?`)) return;
    await DB.borrarPdf(id);
    pdfsCache = pdfsCache.filter(p => p.id !== id);
    if (pdfAbierto && pdfAbierto.id === id) { pdfAbierto.doc.destroy(); pdfAbierto = null; }
    aviso("PDF borrado"); location.hash = "#/guias";
  };
  $("#pv-editar").onclick = () => {
    $("#pv-form").innerHTML = `<div class="caja">
      <label>Título<input id="e-titulo" value="${esc(info.titulo)}"></label>
      <div class="dos">
        <label>Tipo<select id="e-tipo"><option value="">General (todos)</option>${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${info.tipo === k ? "selected" : ""}>${t.nombre}</option>`).join("")}</select></label>
        <label>Categoría<select id="e-cat">${CATEGORIAS_PDF.map(c => `<option ${info.categoria === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      </div>
      <div class="dos"><label>Marca<input id="e-marca" value="${esc(info.marca || "")}"></label><label>Modelo<input id="e-modelo" value="${esc(info.modelo || "")}"></label></div>
      <label>Años<input id="e-anios" value="${esc(info.anios || "")}"></label>
      <div class="acciones"><button class="btn" id="e-guardar">Guardar</button></div></div>`;
    $("#e-guardar").onclick = async () => {
      Object.assign(info, { titulo: $("#e-titulo").value.trim() || info.titulo, tipo: $("#e-tipo").value, categoria: $("#e-cat").value, marca: $("#e-marca").value.trim(), modelo: $("#e-modelo").value.trim(), anios: $("#e-anios").value.trim() });
      await DB.guardarPdf(info);
      aviso("Datos guardados"); pantallaPdf(id, actual);
    };
  };
  await pintar();
  if (resaltar) buscar();
}

// ---------- Búsqueda en internet (dentro de Manuales) ----------
function pintarInternet(cont) {
  cont.innerHTML = `
    <div class="caja">
      <div class="dos"><input id="g-veh" placeholder="Vehículo: Nissan Versa 2015 / Hyster H50FT"><input id="g-tema" placeholder="Tema: cambio de bomba de agua"></div>
      <div class="acciones"><button class="btn" id="g-ir">Buscar</button></div>
      <div id="g-res" class="enlaces"></div>
    </div>
    <h3>Sitios de confianza</h3>
    <div class="caja lista-sitios">
      <a target="_blank" rel="noopener" href="https://charm.li/">📚 charm.li — manuales de fábrica gratis de coches 1982-2013 (inglés)</a>
      <a target="_blank" rel="noopener" href="https://www.manualslib.com/">📘 ManualsLib — manuales de montacargas, motores y equipos</a>
      <a target="_blank" rel="noopener" href="https://www.obd-codes.com/">🔢 OBD-Codes — explicación de códigos de falla</a>
      <a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=mecanica+automotriz+diagnostico">▶️ YouTube — mecánica automotriz</a>
      <a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=forklift+repair+hydraulic">▶️ YouTube — reparación de montacargas</a>
    </div>
    <h3>Mi biblioteca</h3>
    <div id="biblio"></div>
    <div class="caja">
      <input id="b-titulo" placeholder="Título"><input id="b-url" type="url" placeholder="https://…">
      <div class="acciones"><button class="btn" id="b-guardar">Guardar en biblioteca</button></div>
    </div>`;
  $("#g-ir").onclick = () => {
    const q = `${$("#g-veh").value} ${$("#g-tema").value}`.trim();
    if (!q) return aviso("Escribe el vehículo o el tema");
    $("#g-res").innerHTML = botonesSitios(q);
  };
  const pintar = async () => {
    const b = (await DB.leer("biblioteca")) || [];
    $("#biblio").innerHTML = b.map((e, i) => `<div class="enlace-guardado"><a target="_blank" rel="noopener" href="${esc(e.url)}">🔗 ${esc(e.titulo)}</a><button class="mini" data-i="${i}">✕</button></div>`).join("") || `<p class="sub">Guarda aquí tus videos y manuales favoritos.</p>`;
    $("#biblio").onclick = async e => { const i = e.target.dataset.i; if (i === undefined) return; b.splice(+i, 1); await DB.escribir("biblioteca", b); pintar(); };
  };
  $("#b-guardar").onclick = async () => {
    const url = $("#b-url").value.trim();
    if (!/^https?:\/\//.test(url)) return aviso("El enlace debe empezar con http");
    const b = (await DB.leer("biblioteca")) || [];
    b.push({ titulo: $("#b-titulo").value.trim() || url, url });
    await DB.escribir("biblioteca", b); pintar();
    $("#b-url").value = ""; $("#b-titulo").value = "";
  };
  pintar();
}

// ---------- AJUSTES ----------
function pantallaAjustes() {
  vista().innerHTML = `
    <header class="titulo"><h1>⚙️ Ajustes</h1></header>
    <div class="caja">
      <label>Nombre del taller<input id="a-taller" value="${esc(ajustes.taller)}"></label>
    </div>
    <div class="caja">
      <h3>🧠 Maestro IA (en línea)</h3>
      <p class="sub">Para usar la inteligencia artificial necesitas una llave de API de Anthropic (console.anthropic.com). Se guarda sólo en este equipo. Sin llave o sin internet, la app usa el motor local.</p>
      <label>Llave de API<input id="a-llave" type="password" autocomplete="off" value="${esc(ajustes.llave)}" placeholder="sk-ant-…"></label>
      <label>Motor del Maestro
        <select id="a-motor">
          <option value="auto" ${ajustes.motorPreferido === "auto" ? "selected" : ""}>Automático (IA si hay internet, si no local)</option>
          <option value="local" ${ajustes.motorPreferido === "local" ? "selected" : ""}>Sólo motor local (sin internet)</option>
        </select>
      </label>
      <div class="acciones izq"><button class="btn sec" id="a-probar">Probar llave</button></div>
      <p id="a-estado" class="sub"></p>
    </div>
    <div class="acciones"><button class="btn grande" id="a-guardar">Guardar ajustes</button></div>
    <div class="caja">
      <h3>💾 Respaldo</h3>
      <p class="sub">Tus proyectos viven en este equipo. Haz un respaldo seguido y guárdalo en otro lado. Los manuales PDF no van en el respaldo (pesan mucho): guarda también los archivos originales.</p>
      <div class="acciones izq">
        <button class="btn sec" id="a-exportar">⬇ Exportar respaldo</button>
        <label class="btn sec">⬆ Importar respaldo<input type="file" accept="application/json,.json" id="a-importar" hidden></label>
        <button class="btn peligro" id="a-vaciar">Borrar todo</button>
      </div>
    </div>
    <div class="caja" id="instalar-caja" ${window.eventoInstalar ? "" : "hidden"}>
      <h3>📲 Instalar</h3><button class="btn" id="a-instalar">Instalar en este equipo</button>
    </div>
    <p class="sub centro">Taller Mecánico v${VERSION} · ${FALLAS.length} fallas y ${Object.keys(CODIGOS).length} códigos en el motor local</p>`;
  $("#a-guardar").onclick = () => {
    ajustes.taller = $("#a-taller").value.trim() || "Mi Taller";
    ajustes.llave = $("#a-llave").value.trim();
    ajustes.motorPreferido = $("#a-motor").value;
    guardarAjustes(); aviso("Ajustes guardados");
  };
  $("#a-probar").onclick = async () => {
    const llave = $("#a-llave").value.trim();
    if (!llave) return aviso("Pega primero la llave");
    $("#a-estado").textContent = "Probando…";
    try {
      await IA.preguntar([{ rol: "usuario", texto: "Responde sólo: listo" }], null, llave);
      $("#a-estado").textContent = "✅ La llave funciona. No olvides tocar Guardar.";
    } catch (e) { $("#a-estado").textContent = "❌ " + e.message; }
  };
  $("#a-exportar").onclick = exportar;
  $("#a-importar").onchange = importar;
  $("#a-vaciar").onclick = async () => {
    if (!confirm("¿Borrar TODOS los proyectos? Haz un respaldo antes.")) return;
    if (prompt('Escribe BORRAR para confirmar') !== "BORRAR") return;
    await DB.vaciar(); proyectos = []; chatGeneral = []; aprendido = {}; pdfsCache = []; aviso("Todo borrado"); ir("/");
  };
  const bi = $("#a-instalar");
  if (bi) bi.onclick = async () => { if (!window.eventoInstalar) return; window.eventoInstalar.prompt(); window.eventoInstalar = null; };
}

async function exportar() {
  const datos = { app: "taller-mecanico", version: VERSION, fecha: Date.now(), ajustes: { taller: ajustes.taller }, proyectos, biblioteca: (await DB.leer("biblioteca")) || [], aprendido };
  const nombre = `respaldo-taller-${new Date().toISOString().slice(0, 10)}.json`;
  const n = nativo();
  if (n && n.Filesystem && n.Share) {
    try {
      const r = await n.Filesystem.writeFile({ path: nombre, data: JSON.stringify(datos), directory: "CACHE", encoding: "utf8" });
      await n.Share.share({ title: nombre, url: r.uri, dialogTitle: "Guardar respaldo" });
    } catch (e) { if (!/cancel/i.test(e.message || "")) aviso("No se pudo exportar: " + e.message); }
    return;
  }
  const archivo = new File([JSON.stringify(datos)], nombre, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo], title: nombre }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(archivo); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function importar(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    const datos = JSON.parse(await f.text());
    if (datos.app !== "taller-mecanico" || !Array.isArray(datos.proyectos)) throw new Error("formato");
    if (!confirm(`Importar ${datos.proyectos.length} proyecto(s)? Los que ya existan se actualizarán.`)) return;
    for (const p of datos.proyectos) await guardarProyecto(p);
    if (datos.biblioteca) await DB.escribir("biblioteca", datos.biblioteca);
    if (datos.aprendido) {
      // Suma la experiencia importada a la que ya hay en este equipo.
      for (const [id, causas] of Object.entries(datos.aprendido)) {
        aprendido[id] = aprendido[id] || {};
        for (const [c, n] of Object.entries(causas)) aprendido[id][c] = (aprendido[id][c] || 0) + n;
      }
      await DB.escribir("aprendido", aprendido);
    }
    proyectos = await DB.todos();
    aviso("Respaldo importado");
  } catch (err) { aviso("Ese archivo no es un respaldo válido"); }
}

// ---------- arranque ----------
async function iniciar() {
  try { Object.assign(ajustes, JSON.parse(localStorage.getItem("ajustes") || "{}")); } catch (e) {}
  try {
    proyectos = (await DB.todos()) || [];
    chatGeneral = (await DB.leer("chatGeneral")) || [];
    aprendido = (await DB.leer("aprendido")) || {};
    pdfsCache = (await DB.pdfs()) || [];
  } catch (e) { aviso("No se pudo abrir el almacenamiento local"); }
  window.addEventListener("hashchange", enrutar);
  window.addEventListener("online", () => aviso("🌐 Con internet: Maestro IA disponible"));
  window.addEventListener("offline", () => aviso("📴 Sin internet: usando motor local"));
  window.addEventListener("beforeinstallprompt", ev => { ev.preventDefault(); window.eventoInstalar = ev; });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  enrutar();
}

iniciar();
