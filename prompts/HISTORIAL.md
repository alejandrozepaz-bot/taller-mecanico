# Historial de mejoras de los prompts

Cada versión está guardada en el historial de Git, así que puedes ver los cambios exactos con `git log -p prompts/`.

## PROMPT-APP.md (el prompt para construir la app)

### v1: la idea
- Rol, objetivo, plataformas y lista básica de funciones: proyectos, fallas, bitácora, guías, Maestro IA y ajustes.
- **Problema:** muy general. Dos IA distintas habrían hecho dos apps muy diferentes.

### v2: la arquitectura
- **Persona del mecánico** (manos sucias, poca señal, palabras de taller).
- **7 principios no negociables** (sin internet primero, dedos grandes, tres toques…).
- **Arquitectura** con tabla de tecnologías y estructura de carpetas.
- **Modelo de datos** completo.
- **Pantallas campo por campo.**
- **Algoritmo del motor local**, configuración exacta del Maestro IA y fuentes de manuales.
- **14 funciones MEGA** para el futuro, pruebas y criterios de aceptación.

### v3: lo aprendido al construirla
- **Cómo debe trabajar la IA constructora:** por fases, con pruebas en cada una, sin dependencias y compilando en la nube por el poco espacio en disco.
- **4 historias de uso reales** (Versa que jalonea, Toyota 8FGU25 sin señal, Crown eléctrico con foto, la app que aprende).
- **Firma del APK en local, paso a paso:** la llave nunca sale de la PC; el script `firmar-apk.ps1` descarga, firma, verifica y sube.
- **Catálogo mínimo explícito:** las 74 fallas por sistema y los 70 códigos.
- **Fórmulas exactas** de las 8 calculadoras.
- **Aprendizaje del taller:** la causa real sube en el ranking y se suma al importar.
- Funciones que pasaron de MEGA a la app: calculadoras, cronómetro, piezas, aprendizaje y **recordatorios de servicio** (al entregar pregunta la fecha; en el inicio aparece "🔔 Servicios por hacer" con WhatsApp para avisar al cliente).
- **11 casos límite**, pruebas detalladas con su lista de verificación, proceso para publicar una versión y tabla de fases.
- Correcciones descubiertas al construir: los emojis de camioneta y montacargas no existen en Windows (por eso los íconos son SVG) y la respuesta de la IA puede traer bloques de razonamiento vacíos (por eso sólo se leen los bloques de texto).

## PROMPT-MAESTRO-IA.md (el "cerebro" del chat)

### v1
- Rol de mecánico con 30 años, 7 reglas y formato con "Siguiente paso".

### v2
- **Método de diagnóstico:** primero lo básico y barato y nunca "cambia la pieza a ver si es".
- **Usa la bitácora** y cambia de rumbo si un resultado contradice la hipótesis.
- **Bloque de montacargas** (hidráulico, mástil, horquillas, batería de tracción, controlador, gas LP).
- Unidades métricas e imperiales, cómo tratar las fotos y una lista de seguridad ampliada.
- Tabla de "por qué está escrito así".
- **Prueba automática** que obliga a que el prompt de la app y el documento sean idénticos.
