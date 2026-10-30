# Prompt maestro — App "Taller Mecánico" (v1)

> Copia todo este documento y pégalo en una IA que programe (Claude Code, etc.) para construir o reconstruir la app.

## 1. Rol

Eres un equipo completo de software (producto, diseño, programación y pruebas) que construye una aplicación para **un mecánico que repara coches, camionetas y montacargas** en México. La app es su herramienta de trabajo diaria en el taller: con las manos sucias, con poca señal y con prisa.

## 2. Objetivo

Que el mecánico:
1. Registre cada vehículo que llega como un **proyecto**.
2. Elija o escriba las **fallas**.
3. Reciba una **guía de diagnóstico paso a paso** aunque no tenga internet.
4. Vaya anotando en una **bitácora** todo lo que hace hasta entregar el vehículo.
5. Encuentre **videos y manuales** del modelo exacto.
6. Le pregunte a un **Maestro IA** experto cuando tenga internet, y a un **motor local** cuando no.

## 3. Plataformas

- **Android**: APK instalable.
- **Computadora (Windows)**: instalador `.exe` y versión portable.
- **Web instalable (PWA)**: funciona sin internet una vez abierta.
- Un solo código web compartido por las tres.

## 4. Funciones

### 4.1 Proyectos
- Lista de proyectos con buscador y filtros por estado.
- Botón grande **"＋ Nuevo proyecto"**.
- Asistente en 3 pasos:
  1. **Tipo**: Coche, Camioneta o Montacargas.
  2. **Datos**: marca (lista según el tipo), modelo (sugerencias por marca), año, combustible, motor, placas o número de serie, kilometraje u horómetro, cliente, teléfono, notas de cómo llegó.
  3. **Fallas**: catálogo con casillas agrupado por sistema, buscador y campo para escribir una falla propia.
- Estados: Recibido, En diagnóstico, Esperando pieza, Reparando, En pruebas, Listo, Entregado.

### 4.2 Fallas y diagnóstico
- Cada falla del catálogo trae: causas ordenadas de más a menos común, pasos de revisión con casillas, herramientas y advertencia de seguridad.
- Fallas de montacargas propias: mástil no sube, baja solo, fugas hidráulicas, cadenas, horquillas, batería de tracción, gas LP, etc.
- Buscador de códigos OBD2.

### 4.3 Bitácora
- Tipos de nota: Nota, Diagnóstico, Prueba/medición, Pieza cambiada, Reparación, Pendiente, Foto.
- Fotos desde la cámara.
- Línea de tiempo con fecha y hora.

### 4.4 Guías
- Por cada falla: botones que buscan en YouTube, manual de servicio, ManualsLib, diagramas y foros con marca + modelo + año + falla.
- Enlaces guardados por proyecto.

### 4.5 Maestro IA
- Chat con IA que conoce el vehículo, las fallas y la bitácora.
- Si no hay internet o no hay llave, responde el motor local.

### 4.6 Ajustes
- Nombre del taller, llave de la IA, respaldo exportar/importar.

## 5. Diseño
- Botones grandes (mínimo 48 px), letra legible, modo oscuro.
- Todo en español de México.

## 6. Entrega
- Repositorio en GitHub con compilación automática del APK y del `.exe`.
