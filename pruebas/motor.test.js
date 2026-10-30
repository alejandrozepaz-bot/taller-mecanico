// Pruebas del motor local: node pruebas/motor.test.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const ctx = {};
vm.createContext(ctx);
const codigo = ["data.js", "manuales.js", "engine.js"].map(f => fs.readFileSync(path.join(__dirname, "..", "www", f), "utf8")).join("\n");
vm.runInContext(codigo + "\n;this.FALLAS=FALLAS;this.SISTEMAS=SISTEMAS;this.Motor=Motor;this.MARCAS=MARCAS;this.TIPOS=TIPOS;this.MANUALES=MANUALES;this.CATEGORIAS_MANUAL=CATEGORIAS_MANUAL;", ctx);
const { FALLAS, SISTEMAS, Motor, MARCAS, TIPOS, MANUALES, CATEGORIAS_MANUAL } = ctx;

let ok = 0;
const prueba = (nombre, fn) => { fn(); ok++; console.log("✔", nombre); };

prueba("ids únicos y sistemas válidos", () => {
  const ids = new Set();
  for (const f of FALLAS) {
    assert(!ids.has(f.id), "id repetido " + f.id);
    ids.add(f.id);
    assert(SISTEMAS[f.s], "sistema inválido en " + f.id);
    assert(["a", "m", "x"].includes(f.t), "tipo inválido en " + f.id);
    assert(f.c.length && f.p.length && f.k.length, "falla incompleta " + f.id);
  }
});

prueba("cada tipo de vehículo tiene marcas y fallas", () => {
  for (const t of Object.keys(TIPOS)) {
    assert(Object.keys(MARCAS[t]).length > 5);
    assert(Motor.fallasPara(t).length > 30, t);
  }
});

prueba("montacargas: el mástil no sube", () => {
  assert.strictEqual(Motor.diagnosticar("el mastil no sube con carga", "montacargas")[0].falla.id, "mastil_no_sube");
});

prueba("coche: se calienta", () => {
  assert.strictEqual(Motor.diagnosticar("se calienta mucho", "coche")[0].falla.id, "sobrecalienta");
});

prueba("coche no recibe fallas sólo de montacargas", () => {
  assert(!Motor.diagnosticar("no sube el mastil", "coche").some(r => r.falla.t === "m"));
});

prueba("acentos no importan", () => {
  assert.strictEqual(Motor.diagnosticar("RALENTÍ inestable", "coche")[0].falla.id, "ralenti");
});

prueba("códigos OBD2 conocidos y desconocidos", () => {
  assert(Motor.explicarCodigo("p0302").conocido);
  const d = Motor.explicarCodigo("P1234");
  assert(!d.conocido && /fabricante/.test(d.texto));
  assert.strictEqual(Motor.buscarCodigos("tiene P0171 y p0300").map(c => c.codigo).join(","), "P0171,P0300");
});

prueba("respuesta del maestro local trae siguiente paso", () => {
  const r = Motor.responder("P0302 jalonea", null);
  assert(/P0302/.test(r) && /Siguiente paso/.test(r));
});

prueba("texto sin sentido da ayuda en lugar de fallar", () => {
  assert(/No encontré/.test(Motor.responder("hola", null)));
});

prueba("la experiencia del taller aparece en la respuesta, ordenada por veces", () => {
  const aprendido = { mastil_no_sube: { "Bomba hidráulica gastada": 1, "Filtro de succión tapado": 3 } };
  assert.strictEqual(Motor.experiencia(aprendido, "mastil_no_sube")[0][0], "Filtro de succión tapado");
  const r = Motor.responder("no sube el mastil", { tipo: "montacargas", marca: "Toyota", modelo: "8FGU25" }, aprendido);
  assert(/En tu taller.*Filtro de succión tapado \(3 veces\)/.test(r));
  assert.strictEqual(Motor.experiencia(null, "x").length, 0);
});

prueba("manuales del taller bien formados y enlazados a fallas reales", () => {
  const ids = new Set();
  assert(MANUALES.length >= 18);
  for (const m of MANUALES) {
    assert(!ids.has(m.id), "manual repetido " + m.id); ids.add(m.id);
    assert(CATEGORIAS_MANUAL[m.c], "categoría inválida en " + m.id);
    assert(["a", "m", "x"].includes(m.t));
    assert(m.caps.length >= 2, "pocos capítulos en " + m.id);
    for (const c of m.caps) {
      assert(c.n && c.x.trim().length > 150, "capítulo corto en " + m.id + ": " + c.n);
      for (const f of c.f || []) assert(Motor.porId(f), `capítulo "${c.n}" enlaza falla inexistente ${f}`);
    }
  }
  const sinManual = FALLAS.filter(f => !Motor.capitulosDeFalla(f.id).length).map(f => f.id);
  assert(sinManual.length <= 25, "demasiadas fallas sin capítulo: " + sinManual.join(", "));
});

prueba("buscador de manuales: sin acentos, filtro por tipo y páginas de PDF", () => {
  const r = Motor.buscarManuales("valvula de alivio presion");
  assert.strictEqual(r[0].id, "mc_hidraulico");
  assert(r[0].completo && r[0].ruta.startsWith("#/manual/mc_hidraulico/"));
  assert(Motor.buscarManuales("cadenas estiramiento")[0].id === "mc_mastil");
  assert(!Motor.buscarManuales("cadenas", { tipo: "coche" }).some(x => x.id.startsWith("mc_")));
  const pdf = { id: "p1", titulo: "Manual Toyota 8FGU25", tipo: "montacargas", marca: "Toyota", modelo: "8FGU25", texto: ["Índice general", "Ajuste de la válvula de alivio: 175 bar", "Cadenas"] };
  const rp = Motor.buscarManuales("valvula alivio", { pdfs: [pdf], tipo: "montacargas" }).find(x => x.origen === "pdf");
  assert.strictEqual(rp.pagina, 2);
  assert(/175 bar/.test(rp.fragmento));
  assert.strictEqual(Motor.buscarManuales("de la el").length, 0);
  const bar = Motor.buscarManuales("bar");
  assert(bar.length && !bar.some(x => /barat|barret/i.test(x.fragmento)), "'bar' no debe encontrar 'barata' ni 'barreta'");
  assert(Motor.buscarManuales("cadena").some(x => x.id === "mc_mastil"), "'cadena' encuentra 'cadenas'");
});

prueba("el maestro local manda al capítulo del manual", () => {
  const r = Motor.responder("el mastil no sube", { tipo: "montacargas", marca: "Toyota", modelo: "8FGU25" });
  assert(/Léelo en el manual/.test(r) && /\(#\/manual\/mc_hidraulico\/\d\)/.test(r));
});

console.log(`\n${ok} pruebas pasaron`);
