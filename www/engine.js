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

  // Respuesta de chat del "Maestro local" en texto con formato sencillo.
  function responder(texto, proyecto) {
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
      r += "**Causas (de más a menos común):**\n";
      f.c.forEach((c, i) => (r += `${i + 1}. ${c}\n`));
      r += "\n**Qué revisar, paso a paso:**\n";
      f.p.forEach((p, i) => (r += `${i + 1}. ${p}\n`));
      if (f.h && f.h.length) r += `\n**Herramientas:** ${f.h.join(", ")}\n`;
    }
    if (otras.length) {
      r += "\n### También podría ser\n";
      for (const o of otras) r += `- ${o.falla.n}\n`;
    }
    r += `\n**Siguiente paso:** ${mejor ? mejor.falla.p[0] : "escanear los códigos y anotar el cuadro congelado"}.`;
    return r;
  }

  return { normal, aplica, fallasPara, porId, buscarCodigos, explicarCodigo, diagnosticar, responder };
})();
