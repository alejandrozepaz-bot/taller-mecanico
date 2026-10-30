// Manuales del taller: guías propias, escritas para esta app, que funcionan sin internet.
// t: "a" coche/camioneta, "m" montacargas, "x" ambos. Cada capítulo puede enlazar fallas del catálogo (f).
// Los valores son típicos; el dato exacto de cada modelo está en su manual de servicio.

const CATEGORIAS_MANUAL = {
  electrico: "Eléctrico y diagnóstico",
  motor: "Motor",
  combustible: "Combustible e inyección",
  enfriamiento: "Enfriamiento",
  frenos: "Frenos",
  suspension: "Suspensión, dirección y llantas",
  transmision: "Transmisión",
  diesel: "Diésel",
  clima: "Aire acondicionado",
  montacargas: "Montacargas",
  servicio: "Mantenimiento preventivo",
};

const MANUALES = [
  {
    id: "multimetro", c: "electrico", t: "x", n: "Multímetro y diagnóstico eléctrico",
    caps: [
      { n: "Medir voltaje, resistencia y continuidad", f: ["luces"], x: `
**Voltaje (V):** puntas en paralelo, con el circuito funcionando. Punta negra a tierra buena (borne negativo o chasis limpio).
**Resistencia (Ω) y continuidad:** SIEMPRE con el circuito sin corriente; si no, la lectura miente y puedes dañar el multímetro.
**Corriente (A):** el multímetro va en serie (abriendo el circuito) y la punta roja en el borne de 10 A. Para corrientes grandes usa pinza amperimétrica.

Reglas de oro:
1. Antes de medir, prueba el multímetro en la batería (debe marcar ~12.6 V).
2. Una lectura de "0 V" puede ser falta de corriente o mala tierra: mide también la tierra.
3. Un circuito puede tener 12 V sin carga y caerse al conectar la carga: mide con el componente conectado.` },
      { n: "Caída de voltaje: la prueba que más fallas encuentra", f: ["intermitente", "alternador", "no_marcha"], x: `
La caída de voltaje mide cuánto voltaje se "pierde" en un cable, conector o tierra **mientras la corriente pasa**.

Cómo se hace:
1. Pon a funcionar el circuito (dar marcha, prender el foco, etc.).
2. Pon las dos puntas en los dos extremos del mismo cable (por ejemplo, borne positivo de la batería y terminal de la marcha).
3. Lo que marque es lo que se pierde en ese tramo.

Valores típicos máximos:
- Cable grueso de marcha o de alternador: **0.3 – 0.5 V**.
- Tierras de motor y chasis: **0.2 – 0.3 V**.
- Circuitos de sensores (5 V): **menos de 0.1 V**.

Si se pasa: limpia, aprieta o cambia ese tramo. Es la forma más rápida de encontrar tierras sulfatadas que el ohmímetro no detecta.` },
      { n: "Consumo parásito (batería que amanece descargada)", f: ["bateria_descarga"], x: `
1. Batería cargada, todo apagado, puertas cerradas (engaña el seguro del cofre o de la puerta si es necesario para que el vehículo "crea" que está cerrado).
2. Amperímetro en serie en el borne negativo (o pinza de baja corriente).
3. Espera a que los módulos se duerman: de 10 a 45 minutos según el vehículo. No abras puertas en ese tiempo.
4. Normal: **menos de 50 mA** (algunos vehículos de lujo hasta ~80 mA).
5. Si está alto, quita fusibles uno por uno hasta que baje; ese circuito tiene el problema. También puedes medir la caída de voltaje en cada fusible (milivoltios), sin quitarlos, con una tabla de equivalencias.

Sospechosos comunes: luz de cajuela o guantera, radio de accesorio, alarma, módulo que no duerme, diodo del alternador.` },
      { n: "Fusibles, relevadores y tierras", f: ["luces"], x: `
**Fusible:** mide voltaje en los DOS puntos de prueba de la cara del fusible con el circuito encendido. Si hay voltaje en uno y no en el otro, está fundido.
Un fusible que se vuelve a fundir indica un corto: **no pongas uno más grande**. Busca el cable pelado o el componente en corto.

**Relevador de 4 patas (típico):** 85 y 86 son la bobina; 30 es la entrada de corriente y 87 la salida. Puedes probarlo cambiándolo por otro igual de la caja (por ejemplo, el del claxon).

**Tierras:** la causa número uno de fallas "raras". Revisa la tierra motor-chasis, la de la batería y las de los módulos. Limpia hasta ver metal brillante.` },
      { n: "Red CAN y fallas de comunicación", f: ["can"], x: `
Los módulos se comunican por dos cables trenzados: CAN alto y CAN bajo.

Pruebas rápidas en el conector OBD2 (pines **6** = CAN alto y **14** = CAN bajo):
1. Con la llave apagada y la batería desconectada, mide la resistencia entre 6 y 14: **~60 Ω** es normal (dos resistencias de 120 Ω en paralelo). **~120 Ω** = falta una resistencia o hay un cable abierto. **Casi 0 Ω** = corto entre los cables.
2. Con contacto: CAN alto ~2.5 – 3.5 V y CAN bajo ~1.5 – 2.5 V (medidos a tierra).

Siempre revisa primero el voltaje de la batería: con menos de ~11.5 V aparecen códigos U falsos.` },
    ],
  },
  {
    id: "carga_arranque", c: "electrico", t: "x", n: "Batería, arranque y carga",
    caps: [
      { n: "Probar la batería", f: ["no_marcha", "bateria_descarga"], x: `
Voltaje en reposo (motor apagado al menos 1 hora):
| Voltaje | Carga aproximada |
|---|---|
| 12.6 V o más | 100 % |
| 12.4 V | 75 % |
| 12.2 V | 50 % |
| 12.0 V o menos | Descargada |

Prueba de carga: al dar marcha el voltaje no debe bajar de **~9.6 V**. Mejor aún: usa un probador de conductancia (CCA) y compara con lo que dice la etiqueta.
Una batería que llega a 12.6 V pero se cae al dar marcha tiene placas dañadas: cámbiala.` },
      { n: "Motor de arranque (marcha)", f: ["no_marcha"], x: `
Síntomas:
- **Clic y nada:** batería débil, cable o tierra mala, o solenoide con contactos quemados.
- **Gira lento:** batería, cables, o marcha con bujes gastados.
- **Nada de nada:** fusible o relevador de arranque, interruptor de neutral o clutch, inmovilizador; en montacargas, palanca fuera de neutral o sin operador sentado.

Pruebas:
1. Voltaje en el borne grueso de la marcha mientras se da marcha: debe ser casi igual al de la batería.
2. Voltaje en el cable de mando (el delgado) al girar la llave: ~12 V.
3. Caída de voltaje en el cable positivo y en la tierra (máximo ~0.5 V cada uno).` },
      { n: "Alternador y sistema de carga", f: ["alternador", "bateria_descarga"], x: `
Con el motor encendido, mide en la batería:
- **13.8 – 14.7 V:** normal (algunos sistemas inteligentes varían entre 12.8 y 15 V según la carga; revisa el manual).
- **Menos de 13.2 V:** no carga. Revisa banda, fusible del alternador, conector y la caída de voltaje en el cable de salida (B+).
- **Más de 15 V:** el regulador está mal; puede hervir la batería y dañar módulos.

Prueba de rizado: en voltaje alterno (V AC) con el motor a 2000 RPM debe marcar menos de ~0.5 V AC. Más que eso indica diodos dañados (también causan consumo parásito).` },
      { n: "Pasar corriente de forma segura", x: `
1. Mismo voltaje en los dos vehículos (12 V con 12 V; cuidado con montacargas de 24, 36 o 48 V: **nunca** los conectes a 12 V).
2. Rojo al positivo descargado → rojo al positivo bueno → negro al negativo bueno → negro a un punto de metal del motor descargado, lejos de la batería (evita chispa junto al hidrógeno).
3. Arranca el bueno, espera 2-3 minutos y luego arranca el descargado.
4. Quita en orden inverso.` },
    ],
  },
  {
    id: "obd2", c: "electrico", t: "a", n: "Escáner OBD2 y códigos de falla",
    caps: [
      { n: "El conector y cómo leer un código", f: ["check_engine"], x: `
El conector OBD2 está bajo el tablero del lado del conductor (16 pines). Obligatorio en vehículos de gasolina desde ~1996 en EUA; en México, casi todos desde ~2006.

Estructura de un código, ejemplo **P0302**:
- **P** = motor y transmisión (B = carrocería, C = chasis, U = red de módulos).
- **0** = genérico (igual en todas las marcas). **1** = del fabricante.
- **3** = subsistema (1-2 combustible y aire, 3 encendido, 4 emisiones, 5 ralentí y velocidad, 6 computadora, 7-8 transmisión).
- **02** = cilindro 2.

En la pantalla **Diagnóstico** de la app puedes buscar cualquier código.` },
      { n: "Cuadro congelado (freeze frame)", f: ["check_engine"], x: `
Cuando se guarda un código, la computadora toma una "foto" de los datos en ese momento: RPM, velocidad, temperatura, carga y ajustes de combustible.

Sirve para **reproducir la falla**: si el código salió en frío, a 2,500 RPM y con carga, la prueba de manejo debe hacerse así. Anótalo en la bitácora ANTES de borrar los códigos.` },
      { n: "Datos en vivo que más ayudan", f: ["ralenti", "consumo", "potencia", "humo_negro"], x: `
- **Ajustes de combustible (STFT y LTFT):** cuánto corrige la computadora. La suma normal es entre −10 % y +10 %. Positivo alto = le falta gasolina o le entra aire (fuga de vacío, MAF sucio, presión baja). Negativo alto = le sobra gasolina (inyector goteando, presión alta).
  Truco: si el ajuste es alto en ralentí y se corrige al acelerar, casi siempre es una **fuga de vacío**. Si sigue alto en todo el rango, suele ser el **MAF o la presión de combustible**.
- **ECT (temperatura del motor):** en frío debe ser igual a la temperatura ambiente; caliente ~85 – 105 °C.
- **MAF en ralentí:** regla aproximada de 2.5 – 4 g/s por litro de cilindrada... confírmalo con el manual: varía por motor.
- **Sensor de oxígeno delantero (de banda estrecha):** debe oscilar rápido entre ~0.1 y ~0.9 V. El trasero debe estar más estable.` },
      { n: "Monitores y prueba de manejo", f: ["catalizador"], x: `
Los **monitores de preparación** dicen si la computadora ya terminó sus autopruebas (catalizador, EVAP, sensores de oxígeno, etc.). Al borrar códigos se reinician: un vehículo recién borrado **no pasa la verificación**.

Después de reparar:
1. Borra códigos.
2. Haz un ciclo de manejo: arranque en frío, ralentí 2-3 min, ciudad, carretera a velocidad constante, desaceleración sin frenar.
3. Vuelve a escanear: sin códigos pendientes y con monitores completos = reparación confirmada.` },
    ],
  },
  {
    id: "encendido", c: "motor", t: "x", n: "Encendido, compresión y fallas de cilindro",
    caps: [
      { n: "Leer las bujías", f: ["jalonea", "humo_azul", "humo_negro"], x: `
| Cómo se ve | Qué indica |
|---|---|
| Café claro o gris | Normal |
| Negra y seca (hollín) | Mezcla rica, filtro de aire, bujía fría |
| Negra y húmeda de aceite | Anillos o sellos de válvula |
| Blanca o con puntos brillantes | Mezcla pobre o sobrecalentamiento |
| Mojada de gasolina | No hay chispa en ese cilindro |
| Electrodo muy gastado | Bujía vencida |

Siempre compara las bujías entre sí: la diferente señala el cilindro con problemas. Aprieta con torquímetro o con el ángulo que indique el fabricante.` },
      { n: "Bobinas y prueba de intercambio", f: ["jalonea"], x: `
Con código de falla de un cilindro (por ejemplo P0302):
1. Cambia la bobina del cilindro 2 al 3.
2. Borra códigos y prueba.
3. Si ahora sale P0303, la falla siguió a la bobina: **bobina mala**. Si sigue en el 2, repite con la bujía; luego revisa inyector y compresión.

Es la prueba más barata y confiable para no cambiar piezas "a ver si es".` },
      { n: "Prueba de compresión", f: ["jalonea", "humo_azul", "humo_blanco"], x: `
1. Motor caliente, batería bien cargada, quita todas las bujías.
2. Desactiva el combustible (fusible o relevador de la bomba) y el encendido.
3. Acelerador a fondo, 4 a 6 compresiones por cilindro.
4. Anota cada cilindro.

Interpretación:
- La diferencia entre el cilindro más alto y el más bajo no debería pasar de **~10 – 15 %**.
- Un cilindro bajo → echa una cucharada de aceite y repite (**prueba húmeda**): si sube, son **anillos**; si no sube, son **válvulas** o junta.
- Dos cilindros vecinos bajos → probable **junta de cabeza**.

El valor absoluto depende del motor (muchos de gasolina andan entre 140 y 200 PSI): consulta el manual.` },
      { n: "Prueba de fuga de cilindros", x: `
Más precisa que la compresión. Pon el pistón en punto muerto superior (en compresión) y mete aire a presión por el orificio de la bujía.
Escucha por dónde sale:
- Por el **escape** → válvula de escape.
- Por la **admisión** o el cuerpo de aceleración → válvula de admisión.
- Por la **varilla del aceite** o la tapa → anillos.
- **Burbujas en el radiador** → junta de cabeza o cabeza fisurada.

Fuga menor a ~10 – 15 % suele ser aceptable; arriba de 20 – 30 % hay problema.` },
    ],
  },
  {
    id: "inyeccion", c: "combustible", t: "x", n: "Inyección electrónica y sensores",
    caps: [
      { n: "Presión y volumen de combustible", f: ["no_prende", "potencia", "bomba_gasolina"], x: `
1. Conecta el manómetro en la válvula de prueba del riel (o con un adaptador en la línea).
2. Pon contacto: la bomba presuriza unos 2 segundos.
3. Mide en ralentí y acelerando.

Valores típicos (confírmalos en el manual):
- Sistemas con retorno: ~35 – 45 PSI (2.4 – 3.1 bar).
- Sin retorno: ~50 – 60 PSI (3.4 – 4.1 bar).
- Inyección directa: la bomba de alta llega a miles de PSI; **se mide sólo con escáner**.

Presión residual: tras apagar, debe sostenerse varios minutos. Si cae rápido: check de la bomba, inyector goteando o regulador.
**Volumen:** una bomba puede dar buena presión pero poco volumen y fallar con carga. Mide cuánto entrega en 15 segundos.` },
      { n: "Fugas de vacío", f: ["ralenti", "jalonea"], x: `
Señales: ralentí alto o inestable, ajustes de combustible positivos en ralentí, códigos P0171/P0174, silbido.
Cómo encontrarlas:
1. **Máquina de humo** (lo mejor): humo en la admisión y buscas por dónde sale.
2. Rocía limpiador de carburador alrededor de mangueras y juntas con el motor encendido: si cambian las RPM, ahí está la fuga.
3. Vacuómetro: en ralentí un motor sano marca ~17 – 21 inHg estable a nivel del mar (menos en altura: en CDMX, ~5 inHg menos).` },
      { n: "Sensores principales", f: ["ralenti", "potencia", "consumo"], x: `
- **MAF (flujo de aire):** se ensucia con aceite y polvo. Límpialo SÓLO con limpiador de MAF, sin tocar el hilo.
- **MAP (presión del múltiple):** revisa su manguera de vacío.
- **TPS / acelerador electrónico:** la señal debe subir parejo, sin brincos. Después de limpiar el cuerpo de aceleración haz el **reaprendizaje** que indica el fabricante.
- **ECT (temperatura):** si marca frío con el motor caliente, la computadora enriquece la mezcla (humo negro, consumo alto).
- **CKP (cigüeñal):** si falla, el motor puede no arrancar o apagarse en caliente.
- **Oxígeno:** el delantero controla la mezcla; el trasero vigila el catalizador.` },
      { n: "Inyectores", f: ["jalonea", "humo_negro"], x: `
1. Con estetoscopio: cada inyector debe sonar con un clic parejo.
2. Resistencia: los de alta impedancia suelen medir ~11 – 16 Ω (todos deben ser parecidos).
3. **Prueba de balance:** con el manómetro, pulsa cada inyector el mismo tiempo; la caída de presión debe ser similar en todos.
4. Prueba de goteo: presuriza el sistema con el motor apagado y observa si la presión cae.

Al reinstalar, cambia los o-rings y lubrícalos con aceite de motor.` },
    ],
  },
  {
    id: "enfriamiento", c: "enfriamiento", t: "x", n: "Sistema de enfriamiento",
    caps: [
      { n: "Diagnóstico de sobrecalentamiento", f: ["sobrecalienta"], x: `
Orden de revisión, de lo barato a lo caro:
1. Nivel de anticongelante (con el motor **frío**).
2. Fugas visibles y manchas.
3. ¿Entra el electroventilador? Debe arrancar cerca de 95 – 105 °C o al prender el A/C.
4. Temperatura de mangueras: la superior y la inferior deben estar calientes con el motor caliente. Superior caliente e inferior fría = termostato que no abre o radiador tapado.
5. Tapón del radiador (pruébalo con adaptador).
6. Bomba de agua (fuga por el orificio de goteo, juego en la polea).
7. Junta de cabeza (block tester).

En **montacargas**, la causa número uno es el radiador tapado con polvo, pelusa y cartón: sopletea desde el lado del motor hacia afuera.` },
      { n: "Prueba de presión y block tester", f: ["sobrecalienta", "fuga_anticongelante", "humo_blanco"], x: `
**Prueba de presión:** coloca el probador en el radiador y bombea hasta la presión del tapón (muchos tapones son de ~13 – 16 PSI; viene grabada en él). Debe sostenerse 10-15 minutos. Si baja sin fuga visible, sospecha de la junta de cabeza o del núcleo de la calefacción.

**Block tester (prueba de CO₂):** el líquido azul se pone en la boca del radiador; si se vuelve amarillo o verde con el motor en marcha, hay gases de combustión en el sistema = junta o cabeza dañada.` },
      { n: "Purgar el aire", f: ["sobrecalienta", "no_calienta"], x: `
El aire atrapado causa sobrecalentamiento y calefacción fría.
1. Usa un embudo de purga (el que se ajusta a la boca del radiador) o abre los tornillos de purga si los tiene.
2. Calefacción al máximo.
3. Motor en marcha hasta que abra el termostato; aprieta suavemente la manguera superior para sacar burbujas.
4. Rellena hasta que no salgan burbujas y completa el depósito.

Usa el anticongelante del tipo que indica el fabricante; no mezcles tipos distintos.` },
      { n: "Termostato", f: ["no_calienta", "sobrecalienta"], x: `
- **Pegado cerrado:** se calienta rápido; la manguera inferior se queda fría.
- **Pegado abierto:** tarda mucho en calentar, la calefacción está tibia, sube el consumo y aparece el código P0128.

Prueba en banco: en agua caliente debe empezar a abrir a la temperatura grabada (muchos ~82 – 92 °C). Instálalo con la válvula de purga (si la tiene) hacia arriba y con la junta nueva.` },
    ],
  },
  {
    id: "frenos", c: "frenos", t: "x", n: "Frenos",
    caps: [
      { n: "Balatas, zapatas y discos", f: ["frenos_rechinan", "vibra_frenar"], x: `
- **Balatas:** cámbialas cerca de **3 mm** de material (muchos fabricantes marcan 2 – 3 mm). El testigo metálico rechina para avisar.
- **Discos:** mide el espesor con micrómetro; el mínimo viene grabado en el disco. El descentramiento (con reloj comparador) suele aceptarse sólo hasta ~0.05 mm.
- Siempre por **eje completo** (las dos ruedas).
- Limpia y lubrica las guías del caliper con grasa para frenos; pon grasa en los puntos de contacto, nunca en el material de fricción.
- **Asentamiento:** 8 a 10 frenadas suaves de 60 a 10 km/h, sin detenerse por completo.` },
      { n: "Purgar el sistema", f: ["pedal_esponjoso"], x: `
Orden general: de la rueda **más lejana** al cilindro maestro a la **más cercana** (en muchos coches: trasera derecha, trasera izquierda, delantera derecha, delantera izquierda). Algunos sistemas con ABS piden escáner para purgar el módulo: revisa el manual.

Método de dos personas:
1. Pisar varias veces y sostener.
2. Abrir el purgador, cerrar antes de soltar el pedal.
3. Repetir hasta que salga líquido sin burbujas.

Nunca dejes vaciar el depósito. El líquido de frenos absorbe humedad: cámbialo cada ~2 años y no reutilices el que sale.` },
      { n: "ABS", f: ["abs"], x: `
1. Escanea el módulo ABS: el código dice qué rueda.
2. Datos en vivo: avanza despacio y compara la velocidad de las 4 ruedas; la que marca 0 o brinca es la mala.
3. Revisa el sensor (limpio, sin limaduras), su cable y el anillo dentado (roto u oxidado).
4. Sensores pasivos: miden resistencia (a menudo ~800 – 2,000 Ω) y generan voltaje AC al girar. Activos: sólo se prueban con alimentación y osciloscopio o escáner.` },
      { n: "Frenos de tambor y freno de estacionamiento", f: ["mc_frenos"], x: `
- Revisa el grosor de las zapatas, las fugas del cilindro de rueda y el ajustador automático.
- Mide el diámetro del tambor contra el máximo grabado.
- Ajusta las zapatas hasta que la rueda roce ligeramente y luego afloja lo mínimo.
- **Freno de estacionamiento:** ajústalo después de las zapatas. En montacargas debe sostener la máquina **con su carga nominal en la rampa** indicada por el fabricante.` },
    ],
  },
  {
    id: "suspension", c: "suspension", t: "a", n: "Suspensión, dirección y llantas",
    caps: [
      { n: "Revisar juego en la suspensión", f: ["ruido_suspension", "se_va_lado"], x: `
Con el vehículo levantado y las ruedas colgando:
- Toma la llanta arriba y abajo (12 y 6) y sacúdela: juego = **rótulas o balero**.
- Tómala de los lados (3 y 9): juego = **terminales de dirección**.
- Con una barreta, haz palanca en los bujes de las horquillas y en las gomas de la estabilizadora.
- Amortiguadores: busca fugas de aceite y rebote excesivo.

Pide a otra persona que gire el volante mientras observas los terminales.` },
      { n: "Alineación: lo básico", f: ["se_va_lado"], x: `
- **Convergencia (toe):** si las llantas apuntan hacia adentro o hacia afuera. Mal ajustada, se comen las orillas en "escalones".
- **Caída (camber):** inclinación vista de frente. Mal ajustada, desgasta un solo lado.
- **Avance (caster):** ayuda a que el volante regrese al centro; si es desigual, el vehículo se va de lado.

Antes de alinear: corrige presiones y cambia piezas con juego. Si no, la alineación no dura.` },
      { n: "Llantas y balanceo", f: ["vibra_volante"], x: `
- Presión: la indicada en la etiqueta de la puerta, **en frío** (no la máxima de la llanta).
- Vibración en el volante a 80 – 110 km/h = casi siempre **balanceo delantero**. Vibración en el asiento = traseras.
- Revisa chipotes, cuerdas desviadas y rines doblados en la balanceadora.
- Apriete de tuercas en cruz con torquímetro (nunca a fondo con la pistola).` },
      { n: "Dirección hidráulica y eléctrica", f: ["direccion_dura", "ruido_girar"], x: `
**Hidráulica:** nivel y tipo de aceite correcto, banda, mangueras. Un chillido al girar todo indica nivel bajo o banda floja. No sostengas el volante al tope más de unos segundos: la bomba se calienta.
**Eléctrica (EPS):** sin aceite. Si se pone dura, escanea el módulo de dirección: sensor de torque, voltaje de batería bajo o motor. Después de cambiar piezas puede requerir calibración del ángulo del volante.` },
    ],
  },
  {
    id: "transmision", c: "transmision", t: "a", n: "Transmisión, clutch y tracción",
    caps: [
      { n: "Transmisión automática: revisión básica", f: ["auto_patina"], x: `
1. Nivel con el aceite caliente y según el método del fabricante (muchas modernas no tienen varilla y se revisan por tapón a cierta temperatura con escáner).
2. Color y olor: rojo y limpio = bien; café oscuro y con olor a quemado = desgaste interno.
3. Escanea el módulo de transmisión, no sólo el motor.
4. Datos en vivo: temperatura del aceite, cambio solicitado y real, deslizamiento del convertidor.

Usa **sólo** el tipo de ATF especificado: un aceite incorrecto causa cambios bruscos y patinamiento.` },
      { n: "Clutch", f: ["clutch"], x: `
- **Patina:** en 3ra o 4ra a bajas RPM, acelera a fondo: si suben las RPM y no la velocidad, patina.
- **Ruido al pisar:** collarín. **Ruido al soltar en neutral:** balero de la flecha de entrada.
- **Pedal duro o se queda abajo:** hidráulico (cilindro maestro o esclavo) o cable.
- **No entran las velocidades:** aire en el hidráulico, disco pegado o ajuste.

Al cambiar el clutch: revisa el volante (rectifícalo o cámbialo si es bimasa dañado) y el retén trasero del cigüeñal.` },
      { n: "Homocinéticas, crucetas y baleros", f: ["vibra_acelerar", "ruido_girar", "ruido_diferencial"], x: `
- **Clic-clic al dar vuelta y acelerar:** homocinética exterior. Revisa los cubrepolvos: uno roto la acaba en semanas.
- **Vibración al acelerar en recta:** homocinética interior, crucetas del cardán o soportes del motor.
- **Zumbido que aumenta con la velocidad** y cambia al dar vuelta: balero de rueda (el que suena es el del lado contrario a la vuelta en la que se calla, normalmente).
- **Aullido al acelerar o desacelerar:** diferencial (nivel de aceite, piñón y corona).` },
    ],
  },
  {
    id: "diesel", c: "diesel", t: "x", n: "Motores diésel",
    caps: [
      { n: "Seguridad en common rail", f: ["riel_baja"], w: true, x: `
⚠️ El riel trabaja a más de 1,000 bar (algunos a más de 2,000). Un chorro fino a esa presión **atraviesa la piel**.
- Nunca aflojes líneas con el motor encendido.
- Espera unos minutos después de apagar antes de abrir el sistema.
- Tapa todo con tapones limpios: un grano de polvo daña inyectores y bomba.` },
      { n: "Purgar aire y agua", f: ["diesel_frio", "riel_baja"], x: `
1. Drena el **separador de agua** (llave en el filtro) hasta que salga diésel limpio.
2. Cambia el filtro llenándolo con diésel limpio si el diseño lo permite.
3. Bombea con la perilla manual (cebador) hasta que se ponga dura.
4. Algunos sistemas se purgan solos al dar marcha por intervalos cortos (máximo ~15 s, con descansos para no calentar la marcha).` },
      { n: "Bujías de precalentamiento", f: ["diesel_frio"], x: `
- Testigo de precalentamiento: debe encender y apagarse unos segundos con el contacto.
- Resistencia de cada bujía: típicamente **menos de ~2 Ω**; una en circuito abierto (sin continuidad) está fundida.
- Verifica que llegue voltaje a las bujías durante el precalentamiento (relevador o módulo).
- Síntoma clásico: arranca con dificultad y humo blanco en frío, y se corrige al calentar.` },
      { n: "Turbo e intercooler", f: ["turbo", "potencia"], x: `
1. Revisa todas las mangueras y abrazaderas del intercooler: una manguera floja es la falla más común.
2. Datos en vivo: presión de turbo **deseada vs. real** acelerando.
3. Actuador o válvula wastegate / geometría variable: que se mueva libre (con bomba de vacío o escáner).
4. Juego del eje: un poco de juego radial es normal; si las aspas tocan la carcasa o hay juego axial notable, el turbo está dañado.
5. Aceite en la admisión: algo de neblina es normal; charcos indican retenes del turbo o exceso de vapores del cárter.` },
    ],
  },
  {
    id: "clima", c: "clima", t: "a", n: "Aire acondicionado",
    caps: [
      { n: "Cómo funciona y qué revisar primero", f: ["ac_no_enfria", "soplador"], x: `
Ciclo: compresor → condensador (frente al radiador) → válvula de expansión u orificio → evaporador (dentro del tablero) → de regreso al compresor.

Primero lo básico:
1. ¿Engancha el clutch del compresor? (Se ve girar el plato frontal.)
2. ¿Funciona el ventilador del condensador con el A/C encendido?
3. Filtro de cabina limpio.
4. Condensador sin basura ni aletas aplastadas.` },
      { n: "Presiones con manómetros", f: ["ac_no_enfria"], x: `
Con el motor a ~1,500 RPM, A/C al máximo, puertas abiertas, después de 5 minutos. Valores **orientativos** para R-134a con unos 25 – 30 °C de ambiente:
- Baja: ~25 – 45 PSI.
- Alta: ~150 – 250 PSI (sube con la temperatura ambiente).

Interpretación rápida:
- Baja y alta, las dos bajas → **falta gas** (hay fuga).
- Baja alta y alta baja → compresor débil.
- Las dos altas → condensador sucio, ventilador que no funciona o exceso de gas.
- Baja en vacío → restricción (válvula de expansión u orificio tapado, humedad congelada).

Vehículos recientes usan **R-1234yf**: otras conexiones y equipo; no los mezcles.` },
      { n: "Fugas y carga correcta", f: ["ac_no_enfria"], x: `
1. **Recupera** el gas con máquina (no lo liberes al aire).
2. Busca la fuga: tinte UV, detector electrónico o nitrógeno a presión con agua jabonosa.
3. Repara y cambia los o-rings de las conexiones que abriste (lubricados con aceite del sistema).
4. Haz **vacío** al menos 30 minutos; debe sostenerse sin subir.
5. Carga **por peso** la cantidad de la etiqueta del cofre (en gramos u onzas). Cargar "por presión" casi siempre deja el sistema mal.` },
    ],
  },
  {
    id: "mc_seguridad", c: "montacargas", t: "m", n: "Montacargas: seguridad e inspección diaria",
    caps: [
      { n: "Reglas de seguridad en el taller", f: ["mastil_no_sube", "mastil_baja_solo", "fuga_hidraulica"], w: true, x: `
⚠️ Antes de trabajar en un montacargas:
1. Horquillas **en el piso**, freno de estacionamiento puesto, llave fuera, calzas en las ruedas.
2. Si necesitas el mástil levantado, **bloquéalo** con cadenas o soportes; nunca confíes en el hidráulico.
3. Libera la presión hidráulica antes de aflojar cualquier manguera (mueve las palancas con el motor apagado).
4. Eléctricos: desconecta la batería y descarga los capacitores del controlador (según el manual).
5. Gas LP: cierra la válvula del tanque y deja que el motor se apague solo para vaciar la línea.
6. Nunca te pongas debajo de las horquillas ni entre el mástil y el chasis.` },
      { n: "Inspección diaria antes del turno", f: ["seguridad_mc", "asiento", "llantas_mc"], x: `
Con la máquina apagada:
- [ ] Fugas debajo de la máquina (aceite, agua, combustible).
- [ ] Horquillas sin grietas, dobleces y con seguros puestos.
- [ ] Cadenas lubricadas, sin eslabones dañados y con la tensión pareja.
- [ ] Llantas sin cortes ni desgaste excesivo.
- [ ] Niveles: aceite de motor, hidráulico, refrigerante (o agua de batería en eléctricos).
- [ ] Tanque de gas bien montado, con el pin en su lugar y sin olor a gas.
- [ ] Cinturón de seguridad y protector del operador en buen estado.
- [ ] Placa de capacidad legible.

Con la máquina encendida:
- [ ] Claxon, luces, alarma de reversa y torreta.
- [ ] Frenos de servicio y de estacionamiento.
- [ ] Dirección sin juego excesivo.
- [ ] Levante, inclinación y aditamentos suaves y sin ruidos.

Si algo falla: **la máquina no se usa** y se reporta.` },
      { n: "Placa de capacidad y centro de carga", x: `
La placa dice cuánto puede levantar **a cierta altura y con cierto centro de carga** (muchas máquinas de ~2.5 t usan 500 mm o 24 pulgadas).
- Si la carga es más larga (centro de carga mayor), la capacidad real **baja**.
- Un aditamento (side shift, clamp, posicionador) también baja la capacidad: la placa debe estar actualizada con él.
- El montacargas se apoya en un "triángulo de estabilidad" formado por las dos ruedas delanteras y el pivote del eje trasero: cargas altas, giros rápidos y pendientes lo sacan de ese triángulo y lo voltean.` },
    ],
  },
  {
    id: "mc_hidraulico", c: "montacargas", t: "m", n: "Montacargas: sistema hidráulico",
    caps: [
      { n: "Cómo funciona", f: ["mastil_no_sube", "bomba_ruido"], x: `
Tanque → filtro de succión → **bomba** (movida por el motor o por un motor eléctrico) → **válvula de control** (palancas) con **válvula de alivio** → cilindros de levante, inclinación y aditamentos → regreso por el filtro de retorno al tanque.
En muchas máquinas la misma bomba alimenta la dirección a través de una **válvula prioritaria**: si falla, la dirección y el levante se afectan juntos.` },
      { n: "Aceite y filtros", f: ["bomba_ruido", "aceite_caliente", "mastil_no_sube"], x: `
- Revisa el nivel con el mástil **abajo** y la máquina en plano.
- Usa el grado indicado (muchas usan ISO VG 32 o 46 según el clima).
- Aceite lechoso = agua; con espuma = aire entrando por la succión o nivel bajo.
- Cambia el aceite y los filtros según las horas del manual (es común cada 1,000 – 2,000 h) y antes si está contaminado.
- Limpia alrededor del tapón antes de abrir: la suciedad destruye la bomba.` },
      { n: "Medir la presión de la válvula de alivio", f: ["mastil_no_sube"], w: true, x: `
1. Conecta un manómetro de rango adecuado (0 – 300 bar) en el puerto de prueba.
2. Motor a las RPM que indica el manual (normalmente aceleración máxima).
3. Levanta hasta el tope y sostén la palanca **sólo 2-3 segundos**: el manómetro marca la presión de alivio.
4. Compara con la especificación del manual (en muchas máquinas de 2 – 3 t es del orden de 150 – 210 bar, **pero varía**).

- Presión baja → válvula de alivio mal ajustada o sucia, o bomba gastada.
- Presión correcta pero no levanta → carga excesiva o fuga interna en el cilindro.
⚠️ No ajustes la válvula de alivio por encima de la especificación: puedes reventar mangueras o voltear la máquina.` },
      { n: "Prueba de deriva (el mástil baja o se inclina solo)", f: ["mastil_baja_solo", "tilt_drift"], x: `
1. Levanta una carga conocida (dentro de la capacidad) a ~1 m de altura, con el motor apagado y nadie cerca.
2. Marca con cinta la posición del carro y del mástil.
3. Espera 10 minutos y mide cuánto bajó o se inclinó.
4. Compara con el límite del manual (suele ser de pocos milímetros por minuto).

Para saber si es el cilindro o la válvula: con el motor apagado y sin presión, desconecta y tapa la línea del cilindro; si deja de bajar, la fuga está en la **válvula**; si sigue bajando, son los **sellos del cilindro**.` },
      { n: "Mangueras y fugas", f: ["fuga_hidraulica"], w: true, x: `
⚠️ **Nunca** busques una fuga con la mano: usa un cartón. Una fuga fina a presión inyecta aceite en la piel y puede costar un dedo.
- Las mangueras del mástil se rozan con las poleas: revisa que pasen centradas.
- Al cambiar una manguera, usa la misma presión de trabajo y conexiones; aprieta sin exceso.
- Después de reparar, purga el aire subiendo y bajando todo el recorrido varias veces sin carga.` },
    ],
  },
  {
    id: "mc_mastil", c: "montacargas", t: "m", n: "Montacargas: mástil, cadenas y horquillas",
    caps: [
      { n: "Tipos de mástil y rodillos", f: ["mastil_traba"], x: `
- **Simple (2 secciones), dúplex y tríplex:** a más secciones, más altura y más rodillos y cadenas que revisar.
- **Levante libre:** el carro sube sin que crezca la altura total (útil en contenedores).

Rodillos: deben girar libres y tocar el canal. Si el mástil "brinca" o se traba, revisa rodillos gastados, **lainas** (calzas) desajustadas y canales secos. Engrasa los canales donde ruedan los rodillos según el manual.` },
      { n: "Cadenas: medir, ajustar y lubricar", f: ["cadenas", "desnivel"], x: `
**Medir el estiramiento:**
1. Escoge el tramo que más trabaja (el que pasa por la polea).
2. Mide un número de pasos (por ejemplo, 10) con la cadena tensa.
3. Usa la calculadora **Elongación de cadena** de la app. Muchos fabricantes piden cambiarla al **2 – 3 %**.

Revisa también: eslabones agrietados, pernos girados o salidos, óxido, y que los anclajes estén bien.
**Ajuste:** las dos cadenas deben tener la **misma tensión** (empújalas con el pulgar a media altura). Ajusta en los anclajes hasta que las horquillas queden a la altura indicada con el mástil abajo.
**Lubricación:** aceite para cadenas (no grasa espesa que junte tierra).
**Siempre** cambia las cadenas en pares, y los anclajes si están dañados.` },
      { n: "Horquillas (uñas)", f: ["horquillas"], x: `
Revisa al menos cada año (más seguido en trabajo pesado):
1. **Espesor del talón:** compáralo con el espesor del brazo vertical (que casi no se gasta). Si perdió **10 %** o más, se retira (usa la calculadora **Desgaste de horquilla**).
2. **Grietas** en el talón y en los ganchos: usa líquido penetrante si hay duda. Una horquilla agrietada **no se suelda**: se cambia.
3. **Altura de las puntas:** la diferencia entre las dos puntas no debe pasar de ~3 % del largo de la horquilla.
4. **Ángulo:** el talón debe estar a ~90°; si se abrió más de unos 3°, se retira.
5. **Seguros:** que traben y que la horquilla no se deslice sola.
Las horquillas se cambian en juego, de la misma capacidad y largo.` },
    ],
  },
  {
    id: "mc_electrico", c: "montacargas", t: "m", n: "Montacargas eléctrico: batería de tracción y controlador",
    caps: [
      { n: "Seguridad con baterías de tracción", f: ["bat_no_dura", "bat_corrosion"], w: true, x: `
⚠️ Una batería de tracción pesa cientos de kilos, tiene ácido y produce **hidrógeno** al cargarse.
- Lentes, guantes y mandil resistentes al ácido. Agua cerca para lavarse.
- Carga en un área ventilada, sin chispas ni fumar.
- Herramientas aisladas: un corto entre bornes funde una llave al instante.
- Para moverla, usa el equipo de izaje adecuado, nunca a mano.` },
      { n: "Medir celdas: voltaje y densidad", f: ["bat_no_dura"], x: `
Con la batería cargada y en reposo (al menos 1 – 2 horas después de cargar):
| Medición | Cargada | Descargada |
|---|---|---|
| Voltaje por celda | ~2.10 – 2.13 V | ~1.95 V o menos |
| Densidad (densímetro) | ~1.280 – 1.300 | ~1.150 o menos |

- El voltaje total = número de celdas × 2 V (24 V = 12 celdas, 36 V = 18, 48 V = 24, 80 V = 40).
- Una celda con densidad **0.030 o más por debajo** de las demás está mala o necesita igualación.
- Anota todas las celdas en la bitácora para ver cómo cambian con el tiempo.` },
      { n: "Agua, carga e igualación", f: ["bat_no_dura", "cargador"], x: `
- **Agua destilada DESPUÉS de cargar**, hasta el nivel indicado (sobre las placas, sin llenar de más). Si llenas antes de cargar, el ácido se derrama.
- Carga completa: evita las "cargas de oportunidad" si la batería no es para eso; conviene cargar cuando baja a ~20 – 30 %.
- **Nunca** dejes descargar por completo (por debajo de ~20 %): se sulfata.
- **Igualación:** una carga extra lenta y controlada (muchas veces semanal) que empareja las celdas. Se hace con el cargador en modo igualación.` },
      { n: "Controlador, contactores y códigos", f: ["mc_electrico_no_avanza"], w: true, x: `
- El controlador muestra códigos en pantalla o con parpadeos: cada marca tiene su propia tabla (búscala en el manual de servicio de la marca, en tus PDF o en Guías).
- Antes de diagnosticar: batería cargada, conector de batería limpio, interruptor de asiento, freno de estacionamiento y llave.
- **Contactor principal:** debe "clicar" al activar; contactos quemados causan cortes intermitentes.
- **Motores de corriente directa:** revisa carbones y conmutador. Los de corriente alterna no tienen carbones; revisa el encoder (sensor de velocidad) y su conector.
⚠️ Descarga los capacitores según el manual antes de tocar el controlador.` },
    ],
  },
  {
    id: "mc_lp", c: "montacargas", t: "m", n: "Montacargas de gas LP",
    caps: [
      { n: "El tanque y su montaje", f: ["lp_no_arranca", "lp_olor"], w: true, x: `
- El tanque de montacargas toma gas **líquido**: debe ir acostado y en la posición correcta, con el **pin de alineación** dentro de su orificio (así el tubo de salida queda abajo).
- Abre la válvula despacio; si la abres de golpe, la válvula de exceso de flujo se cierra y "parece" que no hay gas.
- Revisa el **o-ring del acople**: si está dañado, fuga o no deja pasar gas.
- Cambia tanques en un lugar ventilado, lejos de flamas, con el motor apagado.
⚠️ Busca fugas sólo con agua jabonosa.` },
      { n: "Lock-off, vaporizador y mezclador", f: ["lp_no_arranca", "lp_congela", "lp_sin_fuerza"], x: `
Recorrido del gas: tanque → filtro → **solenoide lock-off** (se abre al dar marcha o con presión de aceite) → **vaporizador/regulador** (convierte el líquido en vapor usando el calor del refrigerante) → **mezclador** (en lugar del carburador).

- No arranca: ¿llegan 12 V al lock-off al dar marcha? ¿Clica?
- Vaporizador escarchado: le falta calor (refrigerante bajo, mangueras tapadas o termostato).
- Jalonea: diafragma del regulador o del mezclador dañado o endurecido.
- Sistemas con computadora: escanea; muchos tienen sensor de oxígeno y su propio conector de diagnóstico.` },
      { n: "Drenar aceites pesados del regulador", f: ["lp_sin_fuerza", "lp_no_arranca"], x: `
El gas LP trae residuos aceitosos ("parafinas") que se acumulan en el regulador y lo hacen fallar.
1. Con el motor caliente, cierra la válvula del tanque y deja que el motor se apague solo.
2. Abre el tapón de drenado del regulador y deja salir los residuos en un recipiente.
3. Cierra y prueba que no haya fugas.
Hazlo en cada servicio (muchos fabricantes lo piden cada 250 h).` },
    ],
  },
  {
    id: "mc_tren", c: "montacargas", t: "m", n: "Montacargas: transmisión, frenos y dirección",
    caps: [
      { n: "Transmisión powershift y pedal de inching", f: ["mc_no_avanza"], x: `
- **Nivel** de aceite de transmisión con la máquina caliente y como indica el manual.
- **Inching:** el pedal de la izquierda desconecta la transmisión poco a poco para avanzar despacio con el motor acelerado (para levantar rápido). Si está mal ajustado, la máquina "patina" o no avanza.
- **Dirección (adelante/atrás):** la palanca o el pedal manda corriente a solenoides; mide que lleguen ~12 V a cada uno al moverla.
- **Presión de embragues:** en el puerto de prueba, compárala con el manual; presión baja = bomba de transmisión, filtro o fugas internas.
- Nunca cambies de adelante a atrás a velocidad: daña los embragues.` },
      { n: "Frenos del montacargas", f: ["mc_frenos"], x: `
- La mayoría usa frenos de tambor en el eje delantero (el de tracción); algunos usan frenos en baño de aceite.
- Revisa el líquido, las fugas en los cilindros de rueda y el desgaste de las zapatas.
- El pedal de inching suele trabajar junto con el freno: ajusta primero el freno y luego el inching.
- Prueba final: con la carga nominal, debe detenerse en línea recta y el freno de estacionamiento debe sostenerlo en rampa.` },
      { n: "Dirección hidrostática", f: ["direccion_dura"], x: `
El volante mueve una unidad **orbitrol** que manda aceite al cilindro de dirección del eje trasero.
- **Dura:** nivel o presión baja (bomba o válvula prioritaria), orbitrol dañado, o pivotes y baleros del eje trasero secos o dañados.
- **Juego o volante que gira solo:** sellos del cilindro de dirección u orbitrol.
- Engrasa los pivotes del eje trasero (los muñones) en cada servicio: es lo más olvidado.` },
    ],
  },
  {
    id: "preventivo", c: "servicio", t: "x", n: "Mantenimiento preventivo",
    caps: [
      { n: "Coches y camionetas: por kilometraje", f: ["afinacion", "cambio_aceite"], x: `
Guía general (el manual de cada vehículo manda; las condiciones severas como tráfico, polvo o carga acortan los intervalos):
| Cada | Qué hacer |
|---|---|
| 5,000 – 10,000 km | Aceite y filtro (según el aceite y el manual), revisión de niveles, llantas, luces y frenos |
| 20,000 – 40,000 km | Filtro de aire, filtro de cabina, rotación de llantas, revisar suspensión |
| 40,000 – 60,000 km | Líquido de frenos (o cada 2 años), filtro de combustible si es externo |
| 60,000 – 100,000 km | Bujías (las de iridio duran más), anticongelante según el tipo |
| Según el manual | Banda de tiempo y su tensor (muchas entre 60,000 y 160,000 km), aceite de transmisión |` },
      { n: "Montacargas: por horas del horómetro", f: ["serv_250", "serv_1000"], x: `
Guía general (el manual de cada marca manda):
| Cada | Qué hacer |
|---|---|
| Diario | Inspección del operador (ver manual de seguridad), niveles, fugas |
| 250 h | Aceite y filtro de motor, sopletear radiador y filtro de aire, engrasar todo, revisar cadenas, horquillas, llantas, frenos; drenar regulador de LP; eléctricos: agua y celdas |
| 500 h | Lo de 250 h + filtro de combustible, ajuste de frenos y de inching, revisar mástil (rodillos y lainas) |
| 1,000 h | Lo de 500 h + filtro hidráulico, aceite de transmisión y diferencial (según el manual), bujías |
| 2,000 h | Lo de 1,000 h + aceite hidráulico, refrigerante, revisión completa de cadenas y presiones hidráulicas |

Registra cada servicio en la bitácora del proyecto y deja el **próximo servicio** al entregar: la app te avisará.` },
    ],
  },
];
