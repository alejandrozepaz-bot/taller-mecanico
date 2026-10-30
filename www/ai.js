// Maestro IA: asistente en línea con Claude. La llave la pone el mecánico en Ajustes y se guarda sólo en su equipo.

const IA = (() => {
  const MODELO = "claude-opus-5-5";

  const PROMPT_SISTEMA = `Eres "Maestro", un mecánico con 30 años de experiencia en coches, camionetas y montacargas (gasolina, diésel, gas LP, eléctricos e híbridos; marcas como Nissan, VW, Chevrolet, Ford, Toyota, RAM, Hyster, Yale, Crown, Caterpillar, Komatsu, Linde y más). Le hablas a otro mecánico en un taller de México: español sencillo, directo, como maestro a aprendiz con confianza.

Cómo trabajas:
1. Si falta un dato que cambia el diagnóstico (motor, combustible, códigos, cuándo pasa la falla, qué ya se cambió), pregunta máximo 2 cosas y da mientras tanto lo más probable.
2. Ordena las causas de la más probable y barata de revisar a la menos probable.
3. Da pruebas concretas, paso a paso, con valores de referencia típicos. Si un dato exacto (torque, presión, capacidad, resistencia) depende del modelo y no estás seguro, da el rango típico y di "confírmalo en el manual de servicio". Nunca inventes cifras exactas.
4. Toma en cuenta la bitácora del proyecto: no repitas pruebas que ya se hicieron; usa sus resultados para descartar causas.
5. Seguridad primero cuando aplique: calzar ruedas, bajar horquillas o bloquear el mástil, liberar presión hidráulica, desconectar batería, sistema de enfriamiento caliente, gas LP, bolsas de aire, alto voltaje en híbridos y eléctricos, capacitores del controlador.
6. Si te mandan foto, describe lo que ves y lo que eso indica.
7. Termina siempre con "**Siguiente paso:**" y una sola acción concreta, y luego "**Buscar en YouTube:**" con 1 o 2 búsquedas útiles.

Formato: breve, con títulos cortos y listas numeradas. Nada de relleno. Si algo es peligroso o ilegal (por ejemplo quitar el catalizador o puentear sistemas de seguridad del operador), dilo y ofrece la alternativa correcta.`;

  function contextoProyecto(p) {
    if (!p) return "No hay un vehículo seleccionado; es una consulta general.";
    const fallas = (p.fallas || []).map(f => "- " + (f.id ? (Motor.porId(f.id) || {}).n || f.texto : f.texto)).join("\n") || "- (sin fallas registradas)";
    const bitacora = (p.bitacora || []).slice(-30).map(b => `- [${new Date(b.fecha).toLocaleString("es-MX")}] ${b.tipo}: ${b.texto}`).join("\n") || "- (vacía)";
    return `Vehículo del proyecto:
Tipo: ${TIPOS[p.tipo].nombre}
Marca y modelo: ${p.marca} ${p.modelo}
Año: ${p.anio || "?"}
Motor / versión: ${p.motor || "?"}
Combustible: ${p.combustible || "?"}
${p.tipo === "montacargas" ? "Horómetro: " + (p.horas || "?") + " h" : "Kilometraje: " + (p.km || "?") + " km"}
Estado del trabajo: ${p.estado}

Fallas reportadas:
${fallas}

Bitácora (lo que ya se hizo):
${bitacora}`;
  }

  // historial: [{rol: "usuario"|"ia", texto, foto?}]
  async function preguntar(historial, proyecto, llave) {
    const messages = historial.slice(-20).map(m => {
      if (m.rol === "usuario" && m.foto) {
        const [cabecera, datos] = m.foto.split(",");
        const media = cabecera.match(/data:(.*?);/)[1];
        return { role: "user", content: [
          { type: "image", source: { type: "base64", media_type: media, data: datos } },
          { type: "text", text: m.texto || "¿Qué ves en esta foto?" },
        ] };
      }
      return { role: m.rol === "usuario" ? "user" : "assistant", content: m.texto };
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": llave,
        "anthropic-version": "2026-10-21",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 16000,
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: PROMPT_SISTEMA, cache_control: { type: "ephemeral" } },
          { type: "text", text: contextoProyecto(proyecto) },
        ],
        messages,
      }),
    });

    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (datos.error && datos.error.message) || res.statusText;
      if (res.status === 401) throw new Error("La llave de la IA no es válida. Revísala en Ajustes.");
      if (res.status === 429) throw new Error("Muchas preguntas seguidas. Espera un minuto.");
      throw new Error("Error de la IA (" + res.status + "): " + msg);
    }
    if (datos.stop_reason === "refusal") throw new Error("La IA no pudo responder esa pregunta. Intenta redactarla de otra forma.");
    const texto = (datos.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return texto || "(La IA no devolvió texto.)";
  }

  return { MODELO, PROMPT_SISTEMA, contextoProyecto, preguntar };
})();
