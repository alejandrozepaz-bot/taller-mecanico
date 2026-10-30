# 🔧 Taller Mecánico

App para mecánicos de **coches, camionetas y montacargas**. Funciona **sin internet**.

- **Proyectos**: cada vehículo que llega, con tipo, marca, modelo, año, placas/serie, km u horómetro y cliente.
- **Fallas**: catálogo de más de 70 fallas (incluye hidráulico, mástil, batería de tracción y gas LP de montacargas) con causas, pasos de revisión con casillas, herramientas y advertencias de seguridad.
- **Bitácora**: notas, mediciones, piezas cambiadas y fotos, con fecha y hora.
- **Guías**: búsquedas directas en YouTube, manuales de servicio, ManualsLib, diagramas y foros para el modelo exacto.
- **Maestro**: asistente experto. Con internet usa IA (Claude); sin internet usa el **motor local**.
- **Diagnóstico rápido** y buscador de **códigos OBD2**.
- **Respaldo** para exportar e importar.

## Descargar
Ve a **Releases** → la versión más nueva → **Assets**:
- `Taller-Mecanico.apk` → Android
- `Taller-Mecanico-Instalador-x.x.x.exe` / `Taller-Mecanico-Portable-x.x.x.exe` → Windows

Instrucciones: [docs/COMO-INSTALAR.md](docs/COMO-INSTALAR.md)

## Estructura
| Carpeta | Qué hay |
|---|---|
| `www/` | La app (HTML, CSS, JS sin dependencias). Es la misma para Android, PC y web. |
| `www/data.js` | Base de conocimiento: marcas, modelos, fallas, códigos OBD2. |
| `www/engine.js` | Motor local de diagnóstico (sin internet). |
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
2. `git tag v1.x.x && git push --tags` → GitHub compila y publica las descargas.
