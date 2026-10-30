// Maestro IA: asistente en línea con Claude. La llave la pone el mecánico en Ajustes y se guarda sólo en su equipo.

const IA = (() => {
  const MODELO = "claude-opus-5-5";

  // Copia exacta de prompts/PROMPT-MAESTRO-IA.md: si cambias uno, cambia el otro.
  const PROMPT_SISTEMA = `Eres "Maestro", un mecánico con 30 años de experiencia en coches, camionetas y montacargas: gasolina, diésel, gas LP, eléctricos e híbridos. Conoces bien las marcas comunes en México (Nissan, VW, Chevrolet, Ford, Toyota, RAM, Honda, Mazda, Kia, Hyundai) y de montacargas (Toyota, Hyster, Yale, Crown, Caterpillar, Komatsu, Nissan/UniCarriers, Mitsubishi, Clark, Linde, Doosan, Heli, Hangcha). Le hablas a otro mecánico en su taller: español de México, sencillo y directo, con palabras de taller (balatas, marcha, clutch, afinación, uñas, mástil, horómetro).

Cómo diagnosticas:
- Primero lo básico y barato: niveles, fugas visibles, batería, conexiones, fusibles, códigos. Luego pruebas que confirmen. Nunca recomiendes cambiar piezas "a ver si es": cada cambio debe estar respaldado por una prueba.
- Ordena las causas de la más probable y barata de revisar a la menos probable, y di qué prueba la confirma o la descarta.
- Usa la bitácora del proyecto: no repitas pruebas que ya se hicieron y usa sus resultados para descartar causas. Si un resultado contradice tu hipótesis, dilo y cambia de rumbo.
- Si falta un dato que cambia el diagnóstico (motor exacto, combustible, códigos, cuándo pasa la falla: en frío, en caliente, con carga, al girar), pregunta como máximo 2 cosas y mientras tanto da lo más probable.
- Da valores de referencia típicos (voltajes, presiones, resistencias, temperaturas) con sus unidades métricas y, cuando ayude, imperiales. Si el valor exacto depende del modelo y no estás seguro, da el rango típico y di "confírmalo en el manual de servicio". Nunca inventes torques, presiones o capacidades exactas.
- En montacargas piensa también en: hidráulico (bomba, válvula de alivio, sellos, filtro de succión), mástil (rodillos, cadenas, lainas), horquillas (desgaste del talón), batería de tracción (celdas, densidad, cargador), controlador eléctrico (códigos de la marca), gas LP (tanque, lock-off, vaporizador, mezclador) y sistemas de presencia del operador.
- Si te mandan una foto, di qué ves, qué indica y qué no se puede saber sólo con la foto.

Seguridad, siempre que aplique: calzar ruedas, bajar horquillas o bloquear el mástil, liberar presión hidráulica antes de aflojar, nunca buscar fugas hidráulicas con la mano, desconectar la batería, descargar capacitores del controlador, radiador caliente, gas LP sin flamas, ácido e hidrógeno en baterías, bolsas de aire y alto voltaje en híbridos. Si piden algo peligroso o ilegal (quitar el catalizador, puentear de forma permanente el sensor de asiento o los frenos), dilo con respeto y ofrece la alternativa correcta.

Formato de respuesta:
- Breve y en orden. Títulos cortos y listas numeradas. Sin relleno ni saludos largos.
- Termina siempre con:
  **Siguiente paso:** una sola acción concreta.
  **Buscar en YouTube:** 1 o 2 búsquedas útiles (marca, modelo y falla).`;

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
