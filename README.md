# 🔧 Taller Mecánico

App para mecánicos de **coches, camionetas y montacargas**. Funciona **sin internet**.

- **Proyectos**: cada vehículo que llega, con tipo, marca, modelo, año, placas/serie, km u horómetro y cliente.
- **Fallas**: catálogo de más de 70 fallas (incluye hidráulico, mástil, batería de tracción y gas LP de montacargas) con causas, pasos de revisión con casillas, herramientas y advertencias de seguridad.
- **Bitácora**: notas, mediciones, piezas cambiadas y fotos, con fecha y hora.
- **Manuales sin internet**: 18 manuales del taller por capítulos (incluye 6 de montacargas) y tus propios PDF ordenados por tipo → marca → modelo, con buscador dentro del texto y visor de PDF.
- **Guías**: búsquedas directas en YouTube, manuales de servicio, ManualsLib, diagramas y foros para el modelo exacto.
- **Maestro**: asistente experto. Con internet usa IA (Claude); sin internet usa el **motor local**.
- **Diagnóstico rápido**, buscador de **códigos OBD2** y **8 calculadoras** (Ohm, torque, presión, temperatura, distancia, cilindro hidráulico, cadenas y horquillas de montacargas).
- **Cronómetro** de horas trabajadas y **piezas usadas** por proyecto, incluidas en el reporte.
- **El taller aprende**: al resolver una falla eliges la causa real y la app la recuerda en los siguientes diagnósticos.
- **Recordatorios de servicio**: al entregar, la app pregunta cuándo le toca el próximo servicio y luego te avisa con un botón de WhatsApp para el cliente.
- **Respaldo** para exportar e importar.

## Descargar
- 📱 **Android:** [Taller-Mecanico.apk](https://github.com/alejandrozepaz-bot/taller-mecanico/releases/latest/download/Taller-Mecanico.apk)
- 💻 **Windows:** instalador o portable en la [versión más nueva](https://github.com/alejandrozepaz-bot/taller-mecanico/releases/latest) → **Assets**

Instrucciones: [docs/COMO-INSTALAR.md](docs/COMO-INSTALAR.md)

## Estructura
| Carpeta | Qué hay |
|---|---|
| `www/` | La app (HTML, CSS, JS sin dependencias). Es la misma para Android, PC y web. |
| `www/data.js` | Base de conocimiento: marcas, modelos, fallas, códigos OBD2. |
| `www/manuales.js` | Los 18 manuales del taller (capítulos en texto). |
| `www/engine.js` | Motor local de diagnóstico y buscador de manuales (sin internet). |
| `www/vendor/` | pdf.js 3.11.174 para leer y buscar en los PDF sin internet. |
| `www/ai.js` | Maestro IA en línea (Claude) y su prompt. |
| `escritorio/` | Versión Windows (Electron). |
| `prompts/` | Prompt maestro de la app y prompt del Maestro IA, con su historial de mejoras. |
| `pruebas/` | Pruebas del motor y de la interfaz. |
| `.github/workflows/` | Compila el APK y los `.exe` en GitHub. |

## Probar en la computadora
```
node pruebas/servidor.js       # abre http://localhost:8123
node pruebas/motor.test.js     # pruebas del motor local
```

## Publicar una versión nueva
1. Cambia `version` en `package.json`, `escritorio/package.json` y `VERSION` en `www/app.js` (y el nombre del caché en `www/sw.js`).
2. `git tag -a v1.x.x -m "v1.x.x" && git push origin v1.x.x` → GitHub prueba, compila y publica los `.exe`.
3. `powershell -ExecutionPolicy Bypass -File firmar-apk.ps1` → firma el APK con la llave de la carpeta `firma\` (sólo existe en esta PC), lo copia al Escritorio y lo sube a la versión.

> ⚠️ Respalda la carpeta `firma\`. Sin ella no podrás publicar actualizaciones del APK que se instalen encima de la anterior.
