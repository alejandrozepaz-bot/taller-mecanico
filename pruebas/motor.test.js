// Pruebas del motor local: node pruebas/motor.test.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const ctx = {};
vm.createContext(ctx);
const codigo = ["data.js", "engine.js"].map(f => fs.readFileSync(path.join(__dirname, "..", "www", f), "utf8")).join("\n");
vm.runInContext(codigo + "\n;this.FALLAS=FALLAS;this.SISTEMAS=SISTEMAS;this.Motor=Motor;this.MARCAS=MARCAS;this.TIPOS=TIPOS;", ctx);
const { FALLAS, SISTEMAS, Motor, MARCAS, TIPOS } = ctx;

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

console.log(`\n${ok} pruebas pasaron`);
