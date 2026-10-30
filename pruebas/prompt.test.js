// Verifica que el prompt del Maestro en la app sea idéntico al documentado en prompts/PROMPT-MAESTRO-IA.md
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const ctx = { TIPOS: {}, Motor: {}, fetch: () => {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, "www", "ai.js"), "utf8") + ";this.IA=IA;", ctx);
const doc = fs.readFileSync(path.join(raiz, "prompts", "PROMPT-MAESTRO-IA.md"), "utf8").replace(/\r\n/g, "\n");
const documentado = doc.match(/```text\n([\s\S]*?)\n```/)[1];
assert.strictEqual(ctx.IA.PROMPT_SISTEMA.replace(/\r\n/g, "\n"), documentado, "El prompt de www/ai.js no coincide con prompts/PROMPT-MAESTRO-IA.md");
console.log("✔ el prompt del Maestro IA coincide con su documentación");
