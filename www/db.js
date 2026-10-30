// Guardado local en IndexedDB. Nada sale del equipo.

const DB = (() => {
  let conexion;

  function abrir() {
    if (conexion) return Promise.resolve(conexion);
    return new Promise((ok, mal) => {
      const req = indexedDB.open("taller-mecanico", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("proyectos", { keyPath: "id" });
        db.createObjectStore("kv");
      };
      req.onsuccess = () => ok((conexion = req.result));
      req.onerror = () => mal(req.error);
    });
  }

  async function operar(almacen, modo, accion) {
    const db = await abrir();
    return new Promise((ok, mal) => {
      const tx = db.transaction(almacen, modo);
      const req = accion(tx.objectStore(almacen));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => mal(tx.error);
    });
  }

  return {
    todos: () => operar("proyectos", "readonly", s => s.getAll()),
    guardar: p => operar("proyectos", "readwrite", s => s.put(p)),
    borrar: id => operar("proyectos", "readwrite", s => s.delete(id)),
    leer: k => operar("kv", "readonly", s => s.get(k)),
    escribir: (k, v) => operar("kv", "readwrite", s => s.put(v, k)),
    vaciar: async () => {
      await operar("proyectos", "readwrite", s => s.clear());
      await operar("kv", "readwrite", s => s.clear());
    },
  };
})();
