# Prompt maestro: app "Taller Mecánico" (v2)

> **Cómo usarlo:** copia todo este documento y pégalo en una IA que programe (Claude Code u otra). Está escrito para que la IA construya la app completa sin tener que preguntar casi nada. Las secciones marcadas **[MEGA]** son funciones avanzadas para fases posteriores.

---

## 0. Instrucción principal

Construye **"Taller Mecánico"**, una aplicación para **un mecánico que repara coches, camionetas y montacargas** en México. Debe funcionar en **Android (APK)**, **computadora Windows (instalador .exe y portable)** y como **web instalable (PWA)**, con **un solo código** compartido. Tiene que funcionar **sin internet**. Cuando hay internet, suma un **Maestro IA** experto.

Entrega código que funciona, probado y listo para descargar. No entregues maquetas ni "ejemplos". Si algo no se puede verificar, dilo con claridad.

---

## 1. ¿Para quién es? (piensa siempre en esta persona)

- Mecánico de taller, de 25 a 60 años. Sabe mucho de motores pero no necesariamente de computadoras.
- Trabaja con **las manos sucias o con guantes**, de pie, con ruido, con **poca o ninguna señal**.
- Atiende **coches y camionetas** (gasolina y diésel) y **montacargas** (gas LP, gasolina, diésel y eléctricos) de clientes y de empresas (bodegas, fábricas, centrales de abasto).
- Habla **español de México**. Usa palabras de taller: *jalonea, afinación, balatas, clutch, marcha, bomba, mástil, uñas, horómetro, cargador, tanque de gas*.
- Necesita **velocidad**: registrar un vehículo en menos de 1 minuto y anotar algo en la bitácora en menos de 10 segundos.

---

## 2. Principios de diseño (no negociables)

1. **Sin internet primero (offline-first):** todo lo esencial funciona sin señal. Internet sólo suma: IA, videos y manuales.
2. **Dedos grandes:** botones de al menos 48 × 48 px, separación de 8 px, letra base de 17 px.
3. **Tres toques máximo** para lo frecuente: nuevo proyecto, anotar en bitácora, cambiar estado.
4. **Nada se pierde:** todo se guarda al instante en el equipo, sin botón de "guardar" para notas y casillas.
5. **Privado:** los datos viven en el equipo del mecánico. La llave de la IA no sale del equipo salvo hacia la API de la IA.
6. **Seguridad del mecánico:** cada falla peligrosa muestra su advertencia (presión hidráulica, mástil levantado, gas LP, ácido de baterías, alto voltaje, radiador caliente).
7. **Honestidad técnica:** nunca inventes valores exactos (torques, presiones). Da rangos típicos y di "confirma en el manual".

---

## 3. Arquitectura

| Capa | Tecnología | Por qué |
|---|---|---|
| App | HTML + CSS + JavaScript **sin frameworks ni dependencias** | Ligera, rápida en celulares baratos, fácil de mantener |
| Datos | **IndexedDB** (proyectos, chat, biblioteca) + `localStorage` (ajustes) | Funciona sin internet y aguanta fotos |
| Offline | **Service Worker** que guarda la app en caché | Abre sin señal |
| Android | **Capacitor 7** (`webDir: www`) + plugins `@capacitor/share` y `@capacitor/filesystem` | Mismo código web dentro de un APK |
| Windows | **Electron** + `electron-builder` (`nsis` + `portable`) | Instalador y versión USB |
| IA | API de Claude (`claude-opus-5-5`) llamada directo desde la app con la llave del usuario | Sin servidor propio, sin costos fijos |
| Compilación | **GitHub Actions**: pruebas → APK + EXE → Release al crear una etiqueta `v*` | No usa el disco de la PC |

**Estructura de carpetas:**
```
www/            app (index.html, styles.css, data.js, engine.js, db.js, ai.js, app.js, sw.js, manifest, íconos)
escritorio/     Electron (main.js, package.json)
pruebas/        pruebas del motor y de la interfaz
prompts/        este prompt, el prompt del Maestro IA y el historial de mejoras
docs/           cómo instalar
recursos/       ícono 1024 px para generar íconos de Android/Windows
.github/workflows/compilar.yml
```

**Firma del APK:** la llave (`.jks`) se queda en la PC del dueño. GitHub compila el APK **sin firmar** y un script local (`firmar-apk.ps1`) lo firma, lo copia al Escritorio y lo sube al Release. Usa siempre la misma llave para que las actualizaciones se instalen encima.

---

## 4. Modelo de datos

```js
Proyecto = {
  id: "string único",
  tipo: "coche" | "camioneta" | "montacargas",
  marca, modelo, anio, motor, combustible,          // combustible: Gasolina | Diésel | Gas LP | Eléctrico | Híbrido | Gasolina / LP (dual)
  placas, vin, km,                                   // coche/camioneta
  serie, horas, capacidad,                           // montacargas (horómetro y kg)
  cliente, telefono, notas,                          // notas = cómo llegó
  estado: "recibido" | "diagnostico" | "esperando" | "reparando" | "pruebas" | "listo" | "entregado",
  fallas: [{ id?: "id del catálogo", texto?: "falla escrita", resuelta: bool, fecha }],
  checks: { "idFalla-númeroPaso": true },            // pasos de revisión palomeados
  bitacora: [{ id, fecha, tipo, texto, foto?: "dataURL JPEG comprimido" }],
  chat: [{ rol: "usuario" | "ia", texto, foto?, motor?: "ia" | "local" }],
  enlaces: [{ titulo, url }],
  creado, actualizado
}

Falla del catálogo = {
  id, s: "sistema", t: "a" (coche/camioneta) | "m" (montacargas) | "x" (ambos),
  n: "nombre", k: ["palabras clave como las dice el mecánico"],
  c: ["causas de más a menos común"], p: ["pasos de revisión"],
  h: ["herramientas"], d: 1-3 (dificultad), w?: "advertencia de seguridad"
}
```

---

## 5. Pantallas (detalle exacto)

Barra inferior fija con 5 botones: **Proyectos · Diagnóstico · Maestro · Guías · Ajustes**.

### 5.1 Proyectos (inicio)
- Título con el nombre del taller y "N vehículo(s) en el taller".
- Botón principal **"＋ Nuevo proyecto"**.
- Buscador (marca, modelo, placas, serie, cliente; sin importar acentos).
- Chips de filtro: En el taller · Todos · cada estado.
- Tarjetas: ícono del tipo, "Marca Modelo Año", placas/serie · cliente, fallas pendientes, fecha de última actualización y chip de estado con color.
- Si está vacío: mensaje amable que explique qué hacer.

### 5.2 Nuevo proyecto (asistente de 3 pasos con barra de progreso)
1. **Tipo:** tres tarjetas grandes con ícono dibujado (no emoji; el de montacargas no existe): Coche, Camioneta, Montacargas.
2. **Datos:**
   - Marca: lista según el tipo + "Otra" (muestra campo de texto).
   - Modelo: texto con sugerencias de la marca (`datalist`).
   - Año, combustible (por defecto Gasolina; montacargas = Gas LP), motor/versión.
   - Coche/camioneta: placas (mayúsculas), kilometraje, VIN (17 caracteres).
   - Montacargas: número de serie, horómetro, capacidad en kg.
   - Cliente/empresa, teléfono, "cómo llegó".
   - Validación: el modelo es obligatorio; todo lo demás opcional.
3. **Fallas:**
   - Buscador + catálogo agrupado por sistema con casillas (sólo fallas que aplican al tipo).
   - "Otra falla (con tus palabras)" + botón **"🧠 ¿Qué podría ser?"** que usa el motor local y propone fallas del catálogo para palomear.
   - **"✔ Crear proyecto"** → guarda, crea la primera entrada de bitácora ("Recepción") y abre la pestaña Fallas.

### 5.3 Proyecto (pestañas)
Encabezado: ←, ícono, título, placas/serie · cliente, selector de **estado** (cada cambio se anota solo en la bitácora).

- **Datos:** contadores (fallas, resueltas, notas), ficha completa, editar, 📞 llamar, 💬 WhatsApp con mensaje del estado, 🧾 reporte para compartir, 🗑 borrar con confirmación.
- **Fallas:** tarjeta por falla con causas, **pasos con casillas** (se guardan solos, contador x/y), herramientas, advertencia; botones Marcar resuelta / Anotar / Preguntar al Maestro / Quitar. Las fallas escritas a mano muestran sugerencias del motor local. Agregar falla desde el catálogo o con texto.
- **Bitácora:** chips de tipo (Nota, Diagnóstico, Prueba/medición, Pieza cambiada, Reparación, Pendiente, Foto), texto, 📷 foto (cámara trasera, comprimida a 1024 px JPEG), 🎤 dictado (si el equipo lo soporta), línea de tiempo con fecha y hora, ver foto en grande, borrar entrada.
- **Guías:** por cada falla, botones de búsqueda con "marca modelo año falla" en YouTube, manual de servicio, ManualsLib, diagramas eléctricos y foros; códigos OBD2 encontrados en la bitácora con enlace a obd-codes.com; temas del vehículo (coche: manual, diagrama eléctrico, fusibles, torques, afinación; montacargas: manual, diagrama hidráulico, códigos de falla, manual de partes, válvula de alivio); charm.li para coches de 1982-2013; enlaces guardados por el mecánico.
- **Maestro:** chat del proyecto (ver sección 7).

### 5.4 Diagnóstico (sin internet)
- Chips de tipo, cuadro "Describe la falla" (con dictado) → respuesta del motor local.
- Buscador de código OBD2 (letra + 4 dígitos).
- Catálogo completo navegable por sistema.

### 5.5 Maestro (general)
Mismo chat, sin proyecto, con botón "Borrar chat".

### 5.6 Guías (general)
Búsqueda libre (vehículo + tema), sitios de confianza y biblioteca personal de enlaces.

### 5.7 Ajustes
Nombre del taller; llave de la IA (campo oculto, botón **Probar llave**); motor del Maestro (Automático / Sólo local); exportar e importar respaldo JSON (en Android con el menú de compartir nativo); borrar todo (con confirmación escrita "BORRAR"); instalar (si el navegador lo permite); versión y tamaño de la base local.

---

## 6. Motor local (sin internet)

- **Base de conocimiento** en `data.js`: al menos **70 fallas** que cubran Motor, Arranque, Eléctrico, Combustible, Enfriamiento, Transmisión, Frenos, Suspensión y dirección, Escape, A/C, Diésel y turbo, **Hidráulico, Mástil/cadenas/horquillas, Batería de tracción, Gas LP, Seguridad del operador** y **Servicio preventivo** (incluye servicio de 250 h y 1000/2000 h de montacargas). Al menos **70 códigos OBD2** con explicación en español y causas.
- **Algoritmo:** normaliza el texto (minúsculas, sin acentos), suma puntos por cada palabra clave encontrada (más puntos a frases largas), suma 1 por palabra que aparezca en el nombre de la falla, +5 si el texto trae un código asociado, filtra por tipo de vehículo, devuelve las 5 mejores.
- **Respuesta:** "Lo más probable", advertencia, causas numeradas, pasos numerados, herramientas, "También podría ser" y **"Siguiente paso"**.
- **Códigos desconocidos:** explica por la estructura (P/B/C/U, genérico vs. fabricante, subsistema por el tercer carácter).

---

## 7. Maestro IA (en línea)

- **Modelo:** `claude-opus-5-5` vía `POST https://api.anthropic.com/v1/messages` con encabezados `x-api-key`, `anthropic-version: 2026-10-21`, `anthropic-dangerous-direct-browser-access: true` y `anthropic-beta: server-side-fallback-2026-07-01` (con `fallbacks: "default"`), `output_config.effort: "medium"`, `max_tokens: 16000`.
- **Sistema:** el prompt del Maestro (archivo `prompts/PROMPT-MAESTRO-IA.md`), con caché, más un segundo bloque con el **contexto del proyecto**: tipo, marca, modelo, año, motor, combustible, km/horómetro, estado, fallas y las últimas 30 entradas de bitácora.
- **Fotos:** el mecánico puede mandar una foto (se envía como imagen base64).
- **Historial:** se envían los últimos 20 mensajes.
- **Respaldo automático:** sin internet, sin llave o si la IA falla → responde el motor local y lo dice ("📴 local").
- **Errores claros:** 401 = "La llave no es válida"; 429 = "Espera un minuto"; `stop_reason: refusal` = "Intenta redactarlo distinto".

---

## 8. Guías y manuales: fuentes

| Fuente | Uso |
|---|---|
| YouTube (búsqueda) | Videos paso a paso del modelo y la falla |
| Google "manual de servicio pdf" | Manuales de taller |
| ManualsLib (`site:manualslib.com`) | Manuales de montacargas, motores y equipos |
| charm.li | Manuales de fábrica gratis de coches 1982-2013 |
| obd-codes.com | Explicación de códigos |
| Google "diagrama eléctrico" / "foro solución" | Diagramas y casos reales |

Los enlaces se abren en el navegador del sistema (en Android y Windows, fuera de la app).

---

## 9. Diseño visual

- Tema oscuro por defecto (`#0f141b` fondo, `#18202b` paneles, acento **naranja taller `#f59e0b`**), tema claro automático si el sistema lo pide.
- Colores de estado: gris, ámbar, morado, azul, cian, verde, gris oscuro.
- Fallas pendientes con borde rojo; resueltas con borde verde.
- Íconos dibujados en SVG para los tipos de vehículo.
- Funciona bien a 360 px de ancho sin desplazamiento horizontal.

---

## 10. Funciones avanzadas [MEGA] (fase 2 y 3)

1. **Escáner OBD2 Bluetooth (ELM327):** leer y borrar códigos, datos en vivo (RPM, temperatura, ajustes de combustible, MAF, O2) con gráficas, cuadro congelado y guardar la lectura en la bitácora. En Android con plugin BLE de Capacitor.
2. **Modo manos libres:** "Oye Maestro, anota: presión de levante 120 bar" → crea la nota por voz; lectura en voz alta de los pasos.
3. **Reconocer ruidos:** grabar 10 s de audio y que la IA sugiera (balero, banda, punterías, bomba hidráulica cavitando).
4. **QR por montacargas:** imprimir un QR que abra su historial completo; ideal para flotillas de empresas.
5. **Inspección diaria del operador** (checklist tipo OSHA/NOM para montacargas) con firma y PDF.
6. **Reporte PDF** con logo del taller, fotos antes/después y trabajos realizados, para mandar por WhatsApp.
7. **Recordatorios de mantenimiento** por kilometraje y por horómetro (250/500/1000/2000 h).
8. **Calculadoras:** ley de Ohm, caída de voltaje, conversión de unidades (lb-pie ↔ N·m, PSI ↔ bar), presión y fuerza hidráulica, elongación de cadenas, desgaste de horquillas.
9. **Cronómetro de horas de trabajo** por proyecto.
10. **Piezas usadas** por proyecto con número de parte y equivalencias.
11. **Varios mecánicos** con sincronización opcional en la nube.
12. **IA sin internet en el celular** (modelo pequeño descargable) como tercer motor entre el local y el en línea.
13. **Realidad aumentada:** apuntar la cámara al motor y marcar componentes.
14. **Base de conocimiento que aprende:** cuando una falla se marca resuelta, guardar "síntoma → causa real" y subir esa causa en el ranking del motor local para ese modelo.

---

## 11. Pruebas y criterios de aceptación

- **Motor local:** ids únicos, sistemas válidos, cada tipo con más de 30 fallas, "el mástil no sube con carga" → *Mástil no sube*, "se calienta" → *Sobrecalentamiento*, un coche nunca recibe fallas de montacargas, los acentos no importan, códigos conocidos y desconocidos, texto sin sentido → ayuda.
- **Interfaz (navegador sin ventana):** crear un montacargas Toyota 8FGU25 completo, sugerencias de modelos, sugerencias desde texto libre, palomear un paso, nota en bitácora, cambio de estado, guías con YouTube del modelo, Maestro local responde, datos persisten al recargar, buscador OBD2, **cero errores en consola**.
- **CI:** las pruebas corren en GitHub antes de compilar; si fallan, no hay APK.

---

## 12. Entregables

1. Repositorio privado en GitHub con todo el código.
2. Release con **APK de Android** (firmado) e **instalador + portable de Windows**.
3. `README.md`, `docs/COMO-INSTALAR.md` y este prompt con su historial de versiones.
