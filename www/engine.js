// Motor local: diagnóstico sin internet usando la base de conocimiento (data.js).

const Motor = (() => {
  const normal = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const grupoDe = tipo => (TIPOS[tipo] ? TIPOS[tipo].grupo : null);

  const aplica = (falla, tipo) => {
    const g = grupoDe(tipo);
    return !g || falla.t === "x" || falla.t === g;
  };

  const fallasPara = tipo => FALLAS.filter(f => aplica(f, tipo));

  const porId = id => FALLAS.find(f => f.id === id);

  function buscarCodigos(texto) {
    const encontrados = (texto.toUpperCase().match(/\b[PBCU][0-9A-F]{4}\b/g) || []);
    return [...new Set(encontrados)].map(explicarCodigo);
  }

  function explicarCodigo(codigo) {
    codigo = codigo.toUpperCase();
    const conocido = CODIGOS[codigo];
    const area = PREFIJOS[codigo[0]] || "Desconocido";
    const generico = codigo[1] === "0" || codigo[1] === "2" || (codigo[1] === "3" && codigo[0] !== "P");
    let sub = codigo[0] === "P" ? SUBSISTEMA[codigo[2]] : null;
    return {
      codigo,
      texto: conocido || (`Código ${generico ? "genérico" : "del fabricante (consulta el manual de la marca)"} del área: ${area}` + (sub ? ` — ${sub}` : "") + "."),
      conocido: !!conocido,
      area,
    };
  }

  // Califica cada falla contra el texto libre: palabras clave completas valen más que palabras sueltas.
  function diagnosticar(texto, tipo) {
    const t = normal(texto);
    const palabras = t.split(/[^a-z0-9ñ]+/).filter(p => p.length > 3);
    const resultados = [];
    for (const f of fallasPara(tipo)) {
      let puntos = 0;
      for (const k of f.k) {
        const kn = normal(k);
        if (t.includes(kn)) puntos += 3 + kn.split(" ").length;
      }
      const nombre = normal(f.n);
      for (const p of palabras) if (nombre.includes(p)) puntos += 1;
      if (puntos > 0) resultados.push({ falla: f, puntos });
    }
    for (const c of buscarCodigos(texto)) {
      for (const f of fallasPara(tipo)) {
        if (f.k.some(k => normal(k) === normal(c.codigo))) {
          const r = resultados.find(x => x.falla === f);
          if (r) r.puntos += 5; else resultados.push({ falla: f, puntos: 5 });
        }
      }
    }
    return resultados.sort((a, b) => b.puntos - a.puntos).slice(0, 5);
  }

  // ---------- Manuales ----------
  const manualesTaller = () => (typeof MANUALES !== "undefined" ? MANUALES : []);
  const manualPorId = id => manualesTaller().find(m => m.id === id);

  // Capítulos de los manuales del taller que hablan de una falla del catálogo.
  function capitulosDeFalla(idFalla) {
    const r = [];
    for (const m of manualesTaller()) m.caps.forEach((c, i) => { if ((c.f || []).includes(idFalla)) r.push({ manual: m, cap: c, i }); });
    return r;
  }

  const VACIAS = new Set(["de", "la", "el", "en", "y", "a", "los", "las", "del", "con", "por", "para", "que", "no", "se", "un", "una", "al", "lo", "su", "es", "o"]);
  const palabrasDe = consulta => [...new Set(normal(consulta).split(/[^a-z0-9ñ.]+/).map(p => p.replace(/^\.+|\.+$/g, "")).filter(p => p.length >= 2 && !VACIAS.has(p)))];

  const cacheNormal = new Map();
  const normalCache = t => { let n = cacheNormal.get(t); if (n === undefined) { n = normal(t); if (cacheNormal.size > 5000) cacheNormal.clear(); cacheNormal.set(t, n); } return n; };

  // Documentos buscables: cada capítulo de un manual del taller y cada página de cada PDF.
  function documentos(pdfs, tipo) {
    const docs = [];
    for (const m of manualesTaller()) {
      if (tipo && !aplica(m, tipo)) continue;
      m.caps.forEach((c, i) => docs.push({ origen: "taller", id: m.id, i, titulo: `${m.n} › ${c.n}`, texto: c.x, ruta: `#/manual/${m.id}/${i}` }));
    }
    for (const p of pdfs || []) {
      if (tipo && p.tipo && p.tipo !== tipo && !(TIPOS[p.tipo] && TIPOS[tipo] && TIPOS[p.tipo].grupo === TIPOS[tipo].grupo)) continue;
      const meta = [p.titulo, p.marca, p.modelo, p.anios].filter(Boolean).join(" ");
      (p.texto && p.texto.length ? p.texto : [""]).forEach((t, i) => docs.push({ origen: "pdf", id: p.id, i, pagina: i + 1, titulo: `${p.titulo} · pág. ${i + 1}`, texto: t, meta, ruta: `#/pdf/${p.id}/${i + 1}` }));
    }
    return docs;
  }

  // Busca palabras sin importar acentos. Primero los documentos con TODAS las palabras; más puntos por repeticiones y por estar en el título.
  function buscarManuales(consulta, { pdfs = [], tipo = null, limite = 30 } = {}) {
    const palabras = palabrasDe(consulta);
    if (!palabras.length) return [];
    const resultados = [];
    for (const d of documentos(pdfs, tipo)) {
      const texto = normalCache(d.texto);
      const titulo = normalCache(d.titulo + " " + (d.meta || ""));
      let encontradas = 0, puntos = 0, primera = -1;
      for (const p of palabras) {
        const enTitulo = buscarInicio(titulo, p, 0) >= 0;
        let veces = 0, pos = buscarInicio(texto, p, 0);
        if (pos >= 0 && (primera < 0 || pos < primera)) primera = pos;
        while (pos >= 0 && veces < 10) { veces++; pos = buscarInicio(texto, p, pos + p.length); }
        if (veces || enTitulo) encontradas++;
        puntos += veces + (enTitulo ? 8 : 0);
      }
      if (!encontradas) continue;
      puntos += encontradas === palabras.length ? 100 : encontradas * 10;
      resultados.push({ ...d, puntos, completo: encontradas === palabras.length, fragmento: fragmento(d.texto, primera) });
    }
    return resultados.sort((a, b) => b.puntos - a.puntos).slice(0, limite);
  }

  // Busca la palabra al inicio de una palabra del texto: "cadena" encuentra "cadenas".
  // Las palabras cortas (unidades como bar, psi, mm) deben coincidir completas: "bar" no encuentra "barata".
  function buscarInicio(texto, palabra, desde) {
    const letra = c => c !== undefined && /[a-z0-9ñ]/.test(c);
    const completa = palabra.length <= 3;
    let pos = texto.indexOf(palabra, desde);
    while (pos >= 0 && (letra(texto[pos - 1]) || (completa && letra(texto[pos + palabra.length])))) pos = texto.indexOf(palabra, pos + 1);
    return pos;
  }

  function fragmento(texto, pos) {
    const limpio = t => t.replace(/[*#|`>\[\]]/g, " ").replace(/\s+/g, " ").trim();
    if (pos < 0) return limpio(texto.slice(0, 160));
    const ini = Math.max(0, pos - 70);
    return (ini > 0 ? "…" : "") + limpio(texto.slice(ini, pos + 130)) + "…";
  }

  // Lo que el taller ha aprendido: { idFalla: { "causa real": veces } } → las causas ordenadas por veces.
  function experiencia(aprendido, idFalla) {
    const conteo = (aprendido || {})[idFalla];
    return conteo ? Object.entries(conteo).sort((a, b) => b[1] - a[1]) : [];
  }

  // Respuesta de chat del "Maestro local" en texto con formato sencillo.
  function responder(texto, proyecto, aprendido) {
    const tipo = proyecto ? proyecto.tipo : null;
    const codigos = buscarCodigos(texto);
    const lista = diagnosticar(texto, tipo);
    let r = "";
    if (proyecto) r += `**${TIPOS[proyecto.tipo].nombre} ${proyecto.marca} ${proyecto.modelo} ${proyecto.anio || ""}**\n\n`;
    if (codigos.length) {
      r += "### Códigos\n";
      for (const c of codigos) r += `- **${c.codigo}**: ${c.texto}\n`;
      r += "\n";
    }
    if (!lista.length && !codigos.length) {
      return r + "No encontré esa falla en mi base local. Prueba describirla con palabras como: *no arranca, se calienta, jalonea, no sube el mástil, baja solo, fuga, ruido al frenar*, o escribe el código (ej. P0300).\n\nSi tienes internet, el **Maestro IA** puede ayudarte con casos más raros.";
    }
    const [mejor, ...otras] = lista;
    if (mejor) {
      const f = mejor.falla;
      r += `### Lo más probable: ${f.n}\n`;
      if (f.w) r += `> ⚠️ ${f.w}\n\n`;
      const exp = experiencia(aprendido, f.id);
      if (exp.length) r += `**En tu taller** esta falla ha sido: ${exp.slice(0, 3).map(([c, n]) => `${c} (${n} ${n === 1 ? "vez" : "veces"})`).join(", ")}.\n\n`;
      r += "**Causas (de más a menos común):**\n";
      f.c.forEach((c, i) => (r += `${i + 1}. ${c}\n`));
      r += "\n**Qué revisar, paso a paso:**\n";
      f.p.forEach((p, i) => (r += `${i + 1}. ${p}\n`));
      if (f.h && f.h.length) r += `\n**Herramientas:** ${f.h.join(", ")}\n`;
      const caps = capitulosDeFalla(f.id);
      if (caps.length) {
        r += "\n**📖 Léelo en el manual:**\n";
        for (const c of caps.slice(0, 3)) r += `- [${c.manual.n} › ${c.cap.n}](#/manual/${c.manual.id}/${c.i})\n`;
      }
    }
    if (otras.length) {
      r += "\n### También podría ser\n";
      for (const o of otras) r += `- ${o.falla.n}\n`;
    }
    r += `\n**Siguiente paso:** ${mejor ? mejor.falla.p[0] : "escanear los códigos y anotar el cuadro congelado"}.`;
    return r;
  }

  return { normal, aplica, fallasPara, porId, buscarCodigos, explicarCodigo, diagnosticar, experiencia, responder, manualPorId, capitulosDeFalla, palabrasDe, buscarManuales };
})();
