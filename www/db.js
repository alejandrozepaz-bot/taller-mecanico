// Guardado local en IndexedDB. Nada sale del equipo.
// v2: "manuales" guarda los datos y el texto de cada PDF; "archivos" guarda el PDF (Blob) aparte para no cargarlo al listar.

const DB = (() => {
  let conexion;

  function abrir() {
    if (conexion) return Promise.resolve(conexion);
    return new Promise((ok, mal) => {
      const req = indexedDB.open("taller-mecanico", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("proyectos")) db.createObjectStore("proyectos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("manuales")) db.createObjectStore("manuales", { keyPath: "id" });
        if (!db.objectStoreNames.contains("archivos")) db.createObjectStore("archivos");
      };
      req.onsuccess = () => ok((conexion = req.result));
      req.onerror = () => mal(req.error);
    });
  }

  async function operar(almacenes, modo, accion) {
    const db = await abrir();
    return new Promise((ok, mal) => {
      const tx = db.transaction(almacenes, modo);
      const req = accion(...[].concat(almacenes).map(a => tx.objectStore(a)));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => mal(tx.error);
      tx.onabort = () => mal(tx.error || new Error("Operación cancelada (¿espacio lleno?)"));
    });
  }

  return {
    todos: () => operar("proyectos", "readonly", s => s.getAll()),
    guardar: p => operar("proyectos", "readwrite", s => s.put(p)),
    borrar: id => operar("proyectos", "readwrite", s => s.delete(id)),
    leer: k => operar("kv", "readonly", s => s.get(k)),
    escribir: (k, v) => operar("kv", "readwrite", s => s.put(v, k)),
    pdfs: () => operar("manuales", "readonly", s => s.getAll()),
    guardarPdf: (info, archivo) => operar(["manuales", "archivos"], "readwrite", (m, a) => { if (archivo) a.put(archivo, info.id); return m.put(info); }),
    archivoPdf: id => operar("archivos", "readonly", s => s.get(id)),
    borrarPdf: id => operar(["manuales", "archivos"], "readwrite", (m, a) => { a.delete(id); return m.delete(id); }),
    vaciar: () => operar(["proyectos", "kv", "manuales", "archivos"], "readwrite", (...s) => s.forEach(x => x.clear())),
  };
})();
