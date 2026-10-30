# Prompt maestro: app "Taller Mecánico" (v4)

> **Cómo usarlo:** copia todo este documento y pégalo en una IA que programe (Claude Code u otra). Está escrito para que construya la app completa, la pruebe y la deje lista para descargar sin tener que preguntar casi nada.
> Las secciones **[MEGA]** son la siguiente fase. El historial de mejoras de este prompt está en `prompts/HISTORIAL.md`.

---

## 0. Instrucción principal

Construye **"Taller Mecánico"**, una aplicación para **un mecánico que repara coches, camionetas y montacargas** en México.

- Debe funcionar en **Android (APK)**, **computadora Windows (instalador .exe y versión portable)** y como **web instalable (PWA)**, con **un solo código**.
- Tiene que funcionar **sin internet**. Con internet, suma un **Maestro IA** experto y búsquedas de **videos y manuales**.
- Entrega código que funcione, probado con pruebas automáticas y listo para descargar. No entregues maquetas. Si algo no lo pudiste verificar (por ejemplo, en un celular real), dilo claramente.

### Cómo debes trabajar (la IA que construye)
1. Trabaja por **fases** (sección 14). Al terminar cada fase, corre las pruebas y revisa capturas de pantalla antes de seguir.
2. Escribe las pruebas junto con cada función, no al final.
3. No agregues dependencias a la app web: HTML, CSS y JavaScript puros. Las únicas dependencias son las de empaquetado (Capacitor y Electron).
4. Cuida el disco: compila Android y Windows en **GitHub Actions**, no en la PC.
5. Nunca subas la llave de firma del APK a internet (sección 3.2).
6. Todo el texto que ve el usuario va en **español de México**, sencillo y con palabras de taller.

---

## 1. ¿Para quién es? (piensa siempre en esta persona)

- Mecánico de taller, de 25 a 60 años. Sabe mucho de motores pero no necesariamente de computadoras.
- Trabaja con **las manos sucias o con guantes**, de pie, con ruido y con **poca o ninguna señal**.
- Atiende **coches y camionetas** (gasolina y diésel) y **montacargas** (gas LP, gasolina, diésel y eléctricos), de particulares y de empresas (bodegas, fábricas, centrales de abasto).
- Habla con palabras de taller: *jalonea, afinación, balatas, clutch, marcha, bomba, mástil, uñas, horómetro, cargador, tanque de gas*.
- Necesita **velocidad**: registrar un vehículo en menos de 1 minuto y anotar algo en la bitácora en menos de 10 segundos.

### Historias de uso (la app debe resolverlas todas)
1. Llega un **Nissan Versa 2015 que jalonea**. El mecánico lo registra, elige "Jalonea / falla de cilindro", sigue los pasos con casillas, anota "P0302, bobina 2 cambiada", lo marca resuelto con la causa real "Bobina" y le manda el reporte por WhatsApp al cliente.
2. Una bodega manda un **montacargas Toyota 8FGU25 de gas que no sube el mástil con carga**. Sin señal en la bodega, el motor local le da causas y pasos con la advertencia de seguridad. Mide la presión, la anota, agrega el filtro de succión como pieza usada y cronometra 1 h 40 min de trabajo.
3. Un caso raro: **Crown eléctrico con un código del controlador**. Ya con internet, le pregunta al Maestro IA con foto de la pantalla. La IA lee la bitácora y no repite pruebas ya hechas.
4. Meses después, cuando otro montacargas "no sube", la app le dice: **"En tu taller esta falla ha sido: Filtro de succión tapado (3 veces)"**.
5. En la bodega sin señal necesita la presión de la válvula de alivio del 8FGU25: escribe "válvula de alivio" en **Manuales** y la app le muestra el capítulo del manual del taller y la **página exacta del PDF de Toyota** que descargó semanas antes.

---

## 2. Principios de diseño (no negociables)

1. **Sin internet primero:** todo lo esencial funciona sin señal. Internet sólo suma: IA, videos y manuales.
2. **Dedos grandes:** botones de al menos 48 × 48 px, separación de 8 px, letra base de 17 px.
3. **Tres toques máximo** para lo frecuente: nuevo proyecto, anotar en bitácora, cambiar estado, iniciar cronómetro.
4. **Nada se pierde:** todo se guarda al instante; notas, casillas y cronómetro no tienen botón de "guardar".
5. **Privado:** los datos viven en el equipo. La llave de la IA sólo viaja a la API de la IA.
6. **Seguridad del mecánico:** cada falla peligrosa muestra su advertencia.
7. **Honestidad técnica:** nunca inventes valores exactos (torques, presiones). Da rangos típicos y di "confirma en el manual".
8. **Rápida en celulares baratos:** la app web completa (sin íconos) pesa menos de 300 KB y abre en menos de 1 segundo.

---

## 3. Arquitectura

| Capa | Tecnología | Por qué |
|---|---|---|
| App | HTML + CSS + JavaScript **sin frameworks ni dependencias** | Ligera y fácil de mantener |
| Datos | **IndexedDB** v2 (`proyectos`; `kv`: chat general, biblioteca, aprendido; `manuales`: datos y texto de cada PDF; `archivos`: el PDF como Blob) + `localStorage` (ajustes) | Sin internet; aguanta fotos y PDFs grandes |
| PDF | **pdf.js 3.11.174** guardado en `www/vendor/` (sin CDN), cargado sólo al usarlo, con `isEvalSupported: false` | Leer y buscar PDFs sin internet, también en Android (su WebView no trae visor de PDF) |
| Offline | **Service Worker** con caché versionado (`taller-vX.Y.Z`) | Abre sin señal |
| Android | **Capacitor 7** (`webDir: www`, `androidScheme: https`) + `@capacitor/share` y `@capacitor/filesystem` | Mismo código dentro de un APK |
| Windows | **Electron** + `electron-builder` (`nsis` + `portable`), enlaces externos al navegador del sistema | Instalador y versión USB |
| IA | API de Claude (`claude-opus-5-5`) llamada directo desde la app con la llave del usuario | Sin servidor, sin costos fijos |
| Compilación | **GitHub Actions**: pruebas → APK + EXE → Release al crear una etiqueta `v*` | No usa el disco de la PC |

### 3.1 Carpetas
```
www/            index.html, styles.css, data.js (conocimiento), manuales.js (manuales del taller),
                engine.js (motor local y buscador), db.js (IndexedDB), ai.js (Maestro IA),
                app.js (interfaz), sw.js, manifest, íconos, vendor/ (pdf.js)
escritorio/     main.js y package.json de Electron
pruebas/        motor.test.js, prompt.test.js, interfaz.test.js, servidor.js
prompts/        PROMPT-APP.md, PROMPT-MAESTRO-IA.md, HISTORIAL.md
docs/           COMO-INSTALAR.md (también es el texto del Release)
recursos/       icon.png 1024 px (genera íconos de Android y Windows)
firmar-apk.ps1  firma local del APK
.github/workflows/compilar.yml
```

### 3.2 Firma del APK (importante)
- La llave (`firma/taller-mecanico.jks` + clave) **se queda en la PC del dueño** y está en `.gitignore`. No la subas como secreto ni a ningún servicio.
- GitHub compila el APK **sin firmar** (alineado con `zipalign`) y lo deja como artefacto.
- `firmar-apk.ps1` descarga ese APK, lo firma con `apksigner`, lo verifica, lo copia al Escritorio y lo sube al Release (`gh release upload --clobber`).
- Usa **siempre la misma llave** para que las actualizaciones se instalen encima sin borrar datos.
- `versionCode` = número de corrida de GitHub; `versionName` = versión de `package.json`.

---

## 4. Modelo de datos

```js
Proyecto = {
  id, tipo: "coche" | "camioneta" | "montacargas",
  marca, modelo, anio, motor,
  combustible: "Gasolina" | "Diésel" | "Gas LP" | "Eléctrico" | "Híbrido" | "Gasolina / LP (dual)",
  placas, vin, km,                       // coche y camioneta
  serie, horas, capacidad,               // montacargas: serie, horómetro, kg
  cliente, telefono, notas,              // notas = cómo llegó
  estado: "recibido" | "diagnostico" | "esperando" | "reparando" | "pruebas" | "listo" | "entregado",
  fallas: [{ id?, texto?, fecha, resuelta?, causaReal? }],   // id = del catálogo; texto = escrita a mano
  checks: { "idFalla-númeroPaso": true },
  bitacora: [{ id, fecha, tipo, texto, foto? }],             // foto = JPEG comprimido (dataURL)
  piezas: [{ nombre, parte, cantidad }],
  tiempo: { total: ms, inicio: ms | null },                  // cronómetro
  proxFecha: "AAAA-MM-DD", proxUso: km u horas,              // próximo servicio (fecha local, sin zona horaria)
  chat: [{ rol: "usuario" | "ia", texto, foto?, motor? }],
  enlaces: [{ titulo, url }],
  creado, actualizado
}

aprendido = { idFalla: { "causa real": veces } }             // experiencia del taller

Falla del catálogo = {
  id, s: sistema, t: "a" (coche/camioneta) | "m" (montacargas) | "x" (ambos),
  n: nombre, k: [palabras clave como las dice el mecánico],
  c: [causas de más a menos común], p: [pasos de revisión],
  h: [herramientas], d: 1-3, w?: advertencia de seguridad
}

Manual del taller = { id, c: categoría, t: "a"|"m"|"x", n: nombre,
  caps: [{ n: título, x: texto en markdown (tablas, listas, casillas - [ ]), f?: [ids de fallas] }] }

Manual PDF = { id, titulo, tipo?, categoria, marca, modelo, anios, paginas, tamano, nombreArchivo,
  texto: ["texto de la página 1", ...], sinTexto: bool (escaneado), creado }   // el archivo va aparte en "archivos"

Respaldo (JSON) = { app: "taller-mecanico", version, fecha, ajustes: { taller }, proyectos, biblioteca, aprendido }
// Los PDF NO van en el respaldo (pesan mucho): el usuario conserva los archivos originales.
```

---

## 5. Pantallas (detalle exacto)

Barra inferior fija: **Proyectos · Diagnóstico · Maestro · Manuales · Ajustes**.

### 5.1 Proyectos (inicio)
- Nombre del taller y "N vehículo(s) en el taller"; botón **"＋ Nuevo proyecto"**.
- Buscador (marca, modelo, año, placas, serie, cliente; sin importar acentos ni mayúsculas).
- Chips: En el taller · Todos · cada estado. Se recuerdan durante la sesión.
- Tarjetas: ícono del tipo, "Marca Modelo Año", placas/serie · cliente, fallas pendientes, última actualización, **"⏱ Trabajando ahora"** si el cronómetro corre, chip de estado con color.
- Vacío: mensaje que explique qué hacer.
- Arriba, **"🔔 Servicios por hacer"**: vehículos cuyo próximo servicio venció o toca en los próximos 31 días, con "venció hace N días" en rojo y botón **💬 Avisar** (WhatsApp con mensaje listo para agendar).

### 5.2 Nuevo proyecto (3 pasos con barra de progreso)
1. **Tipo:** tres tarjetas grandes con **íconos SVG dibujados** (el emoji de camioneta no existe en Windows y no hay emoji de montacargas).
2. **Datos:** marca (lista por tipo + "Otra"), modelo con sugerencias, año, combustible (montacargas = Gas LP por defecto), motor; coche/camioneta: placas, km, VIN; montacargas: serie, horómetro, capacidad. Cliente, teléfono, cómo llegó y **próximo servicio** (fecha y km u horas). Sólo el modelo es obligatorio.
3. **Fallas:** buscador + catálogo por sistema con casillas (sólo lo que aplica al tipo); "Otra falla" + **"🧠 ¿Qué podría ser?"** (motor local propone fallas). **"✔ Crear proyecto"** guarda, anota "Recepción" en la bitácora y abre Fallas.

### 5.3 Proyecto (pestañas: Datos · Fallas · Bitácora · Guías · Maestro)
Encabezado con ←, ícono, título, placas/serie · cliente y selector de **estado** (cada cambio se anota solo). Al pasar a **Entregado** sin próximo servicio, pregunta "¿Cuándo le toca el próximo servicio?" (1, 3, 6 o 12 meses, o una fecha) y lo anota como "Recordatorio".

- **Datos:** contadores; **cronómetro** ▶ Iniciar / ⏸ Pausar (al pausar anota "Trabajo: 45 min (total 2 h 10 min)"); **piezas usadas** (nombre, n.º de parte, cantidad; cada una se anota en la bitácora); ficha; editar; 📞 llamar; 💬 WhatsApp (agrega 52 a números de 10 dígitos) con el estado; 🧾 reporte; 🗑 borrar con confirmación.
- **Fallas:** por falla: causa real (si ya se resolvió), advertencia, **"📈 En tu taller ha sido…"**, causas, pasos con casillas (contador x/y), herramientas, **botones 📖 a los capítulos del manual** que tratan esa falla; botones Marcar resuelta / Anotar / Preguntar / Quitar. Al marcar resuelta aparece la ventana **"¿Cuál fue la causa real?"** con las causas del catálogo y un campo libre (se puede omitir). Las fallas escritas a mano muestran sugerencias del motor local para agregarlas.
- **Bitácora:** chips de tipo (Nota, Diagnóstico, Prueba/medición, Pieza cambiada, Reparación, Pendiente, Foto), texto, 📷 foto (cámara trasera, 1024 px, JPEG 72 %), 🎤 dictado si el equipo lo soporta (si no, el botón no aparece), línea de tiempo, foto en grande, borrar entrada.
- **Guías:** primero **"📖 En los manuales (sin internet)"**: los PDF del usuario de la misma marca y modelo (sin importar mayúsculas, acentos ni espacios: "8FGU 25" = "8fgu25") y los capítulos del manual del taller de sus fallas. Después, por falla, búsqueda con "marca modelo año falla" en YouTube, manual de servicio, ManualsLib, diagramas y foros; códigos OBD2 encontrados en la bitácora (enlace a obd-codes.com); temas del vehículo; charm.li para coches de 1982 a 2013; enlaces guardados. Aviso si no hay internet.
- **Maestro:** chat del proyecto (sección 7).

### 5.4 Diagnóstico (sin internet)
- Chips de tipo, "Describe la falla" con dictado → respuesta del motor local.
- Buscador de código OBD2 (letra + 4 caracteres).
- **🧮 Calculadoras** (sección 6.3).
- Catálogo completo por sistema.

### 5.5 Manuales (todo sin internet)
- Encabezado: "N del taller · N PDF tuyos".
- **Buscador general** que busca a la vez en los capítulos de los manuales del taller y en cada página de los PDF; chips de tipo (Todos · Coche/camioneta · Montacargas). Resultados como tarjetas: 📘 o 📄, "Manual › Capítulo" o "PDF · pág. N", fragmento con las palabras **resaltadas**. Al tocar uno se abre justo ahí, con las palabras resaltadas.
- **📘 Manuales del taller** agrupados por categoría (Eléctrico y diagnóstico, Motor, Combustible, Enfriamiento, Frenos, Suspensión, Transmisión, Diésel, A/C, Montacargas, Mantenimiento preventivo).
- **📄 Mis manuales PDF:** botón **"＋ Agregar PDF"** (uno o varios) → formulario: título, tipo, categoría (Manual de servicio, de partes, Diagrama eléctrico, Diagrama hidráulico, Manual del operador, Códigos de falla, Boletín técnico, Otro), marca (sugerencias), modelo, años → lee el texto página por página mostrando "leyendo página X de N" → guarda. Lista ordenada **tipo → marca → modelo → título** (alfabético), con categoría, páginas, tamaño y "🖼 escaneado" si no tiene texto.
- **🌐 Buscar en internet:** búsqueda libre, sitios de confianza (charm.li, ManualsLib, obd-codes.com, YouTube) y biblioteca de enlaces.
- **Ver manual del taller** (`#/manual/id/capítulo`): índice con enlaces, buscador interno con contador de coincidencias, capítulos numerados con tablas y casillas, "Fallas relacionadas", aviso de que son valores típicos.
- **Visor de PDF** (`#/pdf/id/página`): ◀ página / total ▶, ir a página, zoom − ＋ (se recuerda), buscador interno con la lista de páginas que tienen la palabra, editar datos, borrar. Dibuja la página en un `canvas` del ancho de la pantalla (nítido en pantallas de alta densidad) y reutiliza el documento abierto al cambiar de página.

### 5.6 Maestro (general), 5.7 Ajustes
- Maestro general: el mismo chat sin proyecto, con "Borrar chat".
- Ajustes: nombre del taller; llave de la IA (oculta) con **Probar llave**; motor (Automático / Sólo local); exportar respaldo (Android: menú nativo de compartir; PC: descarga); importar (suma la experiencia aprendida en vez de reemplazarla); borrar todo (pedir escribir "BORRAR"); instalar (si el navegador lo ofrece); versión y tamaño de la base.

---

## 6. Motor local (sin internet)

### 6.1 Conocimiento mínimo (`data.js`)
- **Marcas y modelos** comunes en México por tipo (al menos 20 de coche, 14 de camioneta y 17 de montacargas, con hasta 10 modelos sugeridos cada una; el modelo siempre se puede escribir libre).
- **Al menos 74 fallas** con todos sus campos, incluyendo como mínimo:
  - *Motor:* jalonea, ralentí inestable, pierde fuerza, humo azul, humo blanco, humo negro, fuga de aceite, baja presión de aceite, ruido o golpeteo, check engine, banda/cadena de tiempo.
  - *Arranque:* no da marcha, da marcha y no prende, difícil en frío.
  - *Eléctrico:* se descarga la batería, alternador, luces/accesorios, falla intermitente, red CAN.
  - *Combustible:* consumo alto, olor a gasolina, bomba de gasolina.
  - *Enfriamiento:* sobrecalentamiento, fuga de anticongelante, no calienta.
  - *Transmisión:* automática patina, clutch, vibra al acelerar, ruido de diferencial/baleros, **montacargas no avanza (powershift)**, **montacargas eléctrico no avanza**.
  - *Frenos:* rechinan, pedal esponjoso, vibra al frenar, se va de lado, ABS, **frenos de montacargas**.
  - *Suspensión y dirección:* ruido en baches, se va de lado, volante vibra, dirección dura, ruido al girar.
  - *Escape:* catalizador, fuga de escape. *A/C:* no enfría, soplador.
  - *Diésel:* no arranca en frío, turbo, presión de riel baja.
  - *Hidráulico:* mástil no sube, baja solo, se inclina solo, fuga hidráulica, bomba ruidosa, mástil se traba, aceite caliente, side shift.
  - *Mástil:* cadenas, horquillas, carro desnivelado.
  - *Batería de tracción:* no dura el turno, cargador, corrosión.
  - *Gas LP:* no arranca o se apaga, vaporizador se congela, jalonea, olor a gas.
  - *Seguridad:* claxon/alarma/torreta, sensor de asiento, llantas.
  - *Servicio:* afinación, cambio de aceite, montacargas 250 h y 1000/2000 h.
- **Al menos 70 códigos OBD2** genéricos con explicación y causas, más prefijos (P/B/C/U) y subsistemas para explicar los que no estén.

### 6.2 Algoritmo
1. Normaliza: minúsculas y sin acentos.
2. Por cada falla que aplique al tipo: +3 + (palabras de la frase) por cada palabra clave encontrada; +1 por cada palabra de más de 3 letras que aparezca en el nombre; +5 si el texto trae un código que la falla tiene como palabra clave.
3. Devuelve las 5 con más puntos.
4. Respuesta: códigos explicados → "Lo más probable" → advertencia → **"En tu taller esta falla ha sido: …"** (experiencia aprendida, 3 causas más frecuentes) → causas → pasos → herramientas → **"📖 Léelo en el manual"** (enlaces a los capítulos) → "También podría ser" → **"Siguiente paso"**.
5. Si no hay coincidencias: explica cómo describir la falla y sugiere el Maestro IA.

### 6.3 Calculadoras (fórmulas exactas)
| Calculadora | Fórmula |
|---|---|
| Ley de Ohm | V = I·R; deja vacío lo que buscas; muestra también la potencia |
| Torque | 1 lb·pie = 1.35582 N·m |
| Presión | 1 bar = 14.5038 PSI = 100 kPa |
| Temperatura | °F = °C × 9/5 + 32 |
| Distancia | 1 milla = 1.60934 km |
| Fuerza de cilindro hidráulico | área (cm²) = π·(d_mm/20)²; kg ≈ bar × área × 1.0197 |
| Elongación de cadena | % = (medida − pasos × paso) / (pasos × paso) × 100; 🟠 ≥ 2 %, 🔴 ≥ 3 % (cambiar en pares) |
| Desgaste de horquilla | % = (original − actual) / original × 100; 🔴 ≥ 10 % retirar de servicio |

En las conversiones de dos campos, el que se escribe manda y el otro se limpia.

### 6.4 Manuales del taller y buscador
- **18 manuales propios con 66 capítulos** (escritos para la app; los manuales de fábrica tienen derechos de autor y no se incluyen), de 2 a 5 capítulos cada uno:
  Multímetro y diagnóstico eléctrico · Batería, arranque y carga · Escáner OBD2 · Encendido y compresión · Inyección y sensores · Enfriamiento · Frenos · Suspensión, dirección y llantas · Transmisión y clutch · Diésel · Aire acondicionado · **Montacargas:** seguridad e inspección diaria · sistema hidráulico · mástil, cadenas y horquillas · eléctrico (batería de tracción y controlador) · gas LP · transmisión, frenos y dirección · Mantenimiento preventivo (por km y por horas).
- Cada capítulo lista las fallas del catálogo que trata (`f`); una prueba verifica que existan. Hoy 65 de las 74 fallas tienen al menos un capítulo; faltan fuga y presión de aceite, ruido de motor, banda de tiempo, arranque en frío, olor a gasolina, se va de lado al frenar, fuga de escape y side shift (siguiente versión).
- **Buscador** (`Motor.buscarManuales`): cada capítulo y cada página de PDF es un documento; quita acentos y palabras vacías (de, la, el…); la palabra debe estar **al inicio de una palabra** del texto ("cadena" encuentra "cadenas") y las de 3 letras o menos deben coincidir completas ("bar" no encuentra "barata"); puntos: +100 si están todas las palabras, +8 si están en el título o en marca/modelo, +1 por cada aparición (máx. 10); fragmento de ~200 letras alrededor de la primera coincidencia; filtro por tipo de vehículo.
- El resaltado usa la misma regla, sin importar acentos ("valvula" resalta "válvula").
- El texto de los manuales sólo admite enlaces internos `#/…` (nunca enlaces externos ni HTML).

### 6.5 Aprendizaje del taller
- Al resolver una falla del catálogo con causa real, suma 1 en `aprendido[idFalla][causa]` (IndexedDB).
- Se muestra en la pestaña Fallas y en las respuestas del motor local.
- Se exporta en el respaldo y al importar **se suma**.

---

## 7. Maestro IA (en línea)

- `POST https://api.anthropic.com/v1/messages` con encabezados `x-api-key`, `anthropic-version: 2026-10-21`, `anthropic-dangerous-direct-browser-access: true`, `anthropic-beta: server-side-fallback-2026-07-01`.
- Cuerpo: `model: "claude-opus-5-5"`, `max_tokens: 16000`, `fallbacks: "default"`, `output_config: { effort: "medium" }`, `system` = [prompt del Maestro con `cache_control: ephemeral`, contexto del proyecto], `messages` = últimos 20.
- **Prompt del Maestro:** `prompts/PROMPT-MAESTRO-IA.md`. Una prueba (`prompt.test.js`) verifica que el texto de `ai.js` sea idéntico al documentado.
- **Contexto del proyecto:** tipo, marca, modelo, año, motor, combustible, km/horómetro, estado, fallas y las últimas 30 entradas de bitácora.
- **Fotos:** imagen base64 (máx. 1200 px) + texto.
- Lee sólo los bloques `text` de la respuesta (puede traer bloques de razonamiento vacíos).
- **Respaldo automático:** sin internet, sin llave o con error → responde el motor local, con el error explicado arriba y la marca "📴 local".
- **Errores:** 401 → "La llave no es válida"; 429 → "Espera un minuto"; `stop_reason: "refusal"` → "Intenta redactarlo distinto".

---

## 8. Guías y manuales: fuentes

| Fuente | Uso |
|---|---|
| YouTube (búsqueda) | Videos paso a paso del modelo y la falla |
| Google "… manual de servicio pdf" | Manuales de taller |
| Google `site:manualslib.com …` | Manuales de montacargas, motores y equipos |
| charm.li | Manuales de fábrica gratis de coches 1982 a 2013 (inglés) |
| obd-codes.com/`<código>` | Explicación de códigos |
| Google "… diagrama eléctrico" / "… foro solución" | Diagramas y casos reales |

Los enlaces se abren fuera de la app: en Android con el navegador del sistema y en Windows con `shell.openExternal`.

---

## 9. Diseño visual

- Oscuro por defecto: fondo `#0f141b`, paneles `#18202b`, bordes `#2e3a4b`, texto `#e8edf3`, acento **naranja taller `#f59e0b`**. Claro automático con `prefers-color-scheme`.
- Estados: gris `#6b7280`, ámbar `#d97706`, morado `#9333ea`, azul `#2563eb`, cian `#0891b2`, verde `#16a34a`, gris oscuro `#374151`.
- Falla pendiente: borde izquierdo rojo; resuelta: verde. Avisos de seguridad: caja roja; aprendizaje y causa real: caja verde.
- Ventanas (causa real) desde abajo, fáciles de alcanzar con el pulgar.
- Sin desplazamiento horizontal a 360 px; respeta las zonas seguras del celular (`env(safe-area-inset-*)`).

---

## 10. Casos límite que deben funcionar

- Crear un proyecto sólo con el modelo (todo lo demás vacío).
- Marca "Otra" con texto libre; al editar se conserva.
- Falla escrita a mano sin coincidencias.
- Texto con acentos, mayúsculas o faltas comunes ("mastil", "ralenti").
- Código OBD2 en minúsculas o desconocido (P1xxx = del fabricante).
- Sin internet al abrir la app (debe abrir desde el caché).
- Llave de IA inválida → mensaje claro + respuesta local.
- Cronómetro corriendo al cerrar la app → al volver sigue contando bien.
- Respaldo de otra app o JSON roto → "Ese archivo no es un respaldo válido".
- Fotos grandes (12 MP) → se comprimen antes de guardar.
- PDF escaneado (sólo imágenes) → se guarda y se ve, pero se marca "🖼 escaneado" y el buscador interno se desactiva con una explicación.
- PDF dañado o con contraseña → "No se pudo agregar …" sin romper los demás del lote.
- Espacio lleno al guardar un PDF → mensaje claro (la transacción se cancela sin dejar datos a medias).
- Modelo escrito distinto en el PDF y en el proyecto ("8FGU 25" vs "8fgu25") → igual se relacionan.
- Teléfono de 10 dígitos → WhatsApp con 52 al inicio.

---

## 11. Pruebas y criterios de aceptación

- **`motor.test.js`:** ids únicos, sistemas y tipos válidos, cada tipo con más de 30 fallas, "el mástil no sube con carga" → *Mástil no sube*, "se calienta mucho" → *Sobrecalentamiento*, coche sin fallas de montacargas, acentos, códigos conocidos y desconocidos, texto sin sentido → ayuda, experiencia del taller ordenada por veces, manuales bien formados con fallas existentes, buscador ("valvula de alivio presion" → manual hidráulico; "bar" no encuentra "barata"; página correcta de un PDF), el Maestro local enlaza el capítulo.
- **`prompt.test.js`:** el prompt de `ai.js` es idéntico al documentado.
- **`interfaz.test.js`** (Chrome o Edge sin ventana vía protocolo DevTools, pantalla de 412 × 915): crear un montacargas Toyota 8FGU25, sugerencias de modelos, sugerencias desde texto libre, palomear un paso, nota en bitácora, cambio de estado, cronómetro, pieza, resolver con causa real, entregar → próximo servicio → recordatorio con WhatsApp, lista de manuales, buscador general con resaltado, abrir capítulo, **agregar un PDF real de 3 páginas generado por la prueba** (con `DOM.setFileInputFiles`), buscar "175 bar" → página 2 → el visor dibuja el `canvas` en esa página, el proyecto muestra su PDF y capítulos, guías con YouTube del modelo, código detectado en bitácora, Maestro local con experiencia, persistencia al recargar, OBD2, calculadoras de torque y horquillas, **cero errores en consola**. Guarda capturas.
- **CI:** si una prueba falla, no se compila nada.
- **Prueba manual en celular real** (pendiente cada versión): instalar APK, tomar foto, exportar respaldo, abrir un enlace de YouTube, usar sin datos móviles.

---

## 12. Publicar una versión

1. Sube la versión en `package.json`, `escritorio/package.json`, `VERSION` en `www/app.js` y el caché en `www/sw.js`.
2. `git tag vX.Y.Z && git push origin vX.Y.Z` → GitHub corre pruebas, compila y crea el Release con los `.exe`.
3. En la PC: `powershell -ExecutionPolicy Bypass -File firmar-apk.ps1` → APK firmado en el Escritorio y en el Release.

---

## 13. Funciones avanzadas [MEGA] (siguiente fase)

1. **Escáner OBD2 Bluetooth (ELM327):** leer y borrar códigos, datos en vivo con gráficas (RPM, temperatura, ajustes de combustible, MAF, O2), cuadro congelado y guardar la lectura en la bitácora. Plugin BLE de Capacitor en Android.
2. **Manos libres:** "Oye Maestro, anota: presión de levante 120 bar" → nota por voz; lectura en voz alta de los pasos.
3. **Reconocer ruidos:** grabar 10 s y que la IA sugiera la causa (balero, banda, punterías, bomba cavitando).
4. **QR por montacargas:** etiqueta que abre su historial; ideal para flotillas.
5. **Inspección diaria del operador** (checklist tipo OSHA/NOM) con firma.
6. **Reporte PDF** con logo, fotos antes/después, piezas y tiempo.
7. **Recordatorios por horómetro automáticos:** calcular la fecha probable del siguiente servicio de 250/500/1000/2000 h con el promedio de horas por día de cada montacargas.
8. **Varios mecánicos** con sincronización opcional en la nube y quién hizo cada nota.
9. **IA sin internet en el celular** (modelo pequeño descargable) como tercer motor.
10. **Realidad aumentada:** apuntar la cámara al motor y marcar componentes.
11. **Catálogo que crece:** compartir (opcional y anónimo) la experiencia aprendida entre talleres.
12. **Escanear VIN y placas con la cámara** para llenar marca, modelo y año.
13. **OCR para PDFs escaneados:** reconocer el texto de las páginas-imagen (Tesseract.js guardado en la app) para poder buscar en ellos.
14. **Marcadores y notas en los PDF:** guardar "pág. 214 = torques de cabeza" por modelo y enlazarlos desde la bitácora.

---

## 14. Fases de construcción

| Fase | Entregable | Cómo se verifica |
|---|---|---|
| 1 | `data.js` + `engine.js` | `motor.test.js` pasa |
| 2 | Interfaz completa (secciones 5.1 a 5.7) | `interfaz.test.js` pasa y las capturas se ven bien a 412 px |
| 3 | Maestro IA + `prompt.test.js` | Probar llave en Ajustes; respaldo local sin llave |
| 4 | Offline (service worker, manifest, íconos) | Abrir sin red tras la primera carga |
| 5 | Android + Windows + GitHub Actions + firma local | Corrida verde; APK firmado y `.exe` en el Release |
| 6 | Calculadoras, cronómetro, piezas, aprendizaje, recordatorios de servicio | Pruebas ampliadas en verde |
| 7 | Manuales: 18 del taller + PDFs del usuario con buscador y visor | Pruebas del buscador y de importar/abrir un PDF real |
| 8 | [MEGA] | Una función a la vez, cada una con sus pruebas |

---

## 15. Entregables

1. Repositorio **privado** en GitHub con todo el código y las pruebas.
2. Release con **APK de Android firmado** e **instalador + portable de Windows**.
3. `README.md`, `docs/COMO-INSTALAR.md`, este prompt, el prompt del Maestro IA y su historial.
4. Un resumen honesto: qué se probó, qué no (por ejemplo, el celular real) y qué sigue.
