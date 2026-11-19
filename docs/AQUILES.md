# Aquiles · piloto de animación

Abre **Combate Versus → Aquiles → ¡Pelear!** para ver el personaje. En **Entrenamiento** puedes activar las cajas de impacto desde la configuración de vídeo. El paquete incluye la compilación local en `dist`. El README contiene los pasos para iniciar el servidor y conectar el segundo dispositivo.

## Qué se integró

La base es la versión 2 del ZIP de Apex con servidor de salas, mando remoto, 40 luchadores y 160 comandos. Se incorporó el workflow de Pages de `Eligiusdev/presidential-brawl` en el commit `df2ee4a`. El workflow calcula la base, compila y despliega `dist` al publicar en main. Para reproducir esa compilación localmente, ejecuta `npm run build -- --base=/presidential-brawl/`. El servidor Node del README utiliza la compilación de raíz que genera `npm run build`.

| Ruta | Responsabilidad |
| --- | --- |
| `src/data/presidents.ts`, `src/combat/roster.js`, `src/combat/Fighter.js` | Identidad, poderes y ventanas de ataque existentes. El identificador de Aquiles es `aquiles`. |
| `src/engine/fighterSprites.ts` | Registro de carpetas por ID, carga única en caché, reloj por ticks, selección de pose y dibujo orientado. |
| `src/engine/pixelRenderer.ts` | Render de mundo, retratos y editor. El renderizador procedural cubre los luchadores sin atlas y los errores de carga. |
| `src/engine/gameEngine.ts` | Instancia independiente de geometría para colisiones. Guarda el tick de despegue y la posición de la viñeta de KO. |
| `src/components/CharacterSelect.tsx`, `FighterPreview.tsx`, `PortraitCanvas.tsx` | Selección, guardia animada, retrato y carga asíncrona. |
| `src/App.tsx`, `src/index.css` | Presentación adaptable y conservación de las proporciones del canvas. |
| `public/assets/fighters/achilles/` | Atlas PNG indexado transparente de 1024 × 949, metadatos JSON, retrato PNG y fondo WebP. |
| `tests/sprite-atlas.mjs`, `tests/sprite-replay.mjs`, `package.json` | Pruebas de integración visual y regresión de simulación. |

## Arte y animación

Se utilizó pixel art detallado para el cuerpo, con píxeles nítidos al componer en el búfer de combate. La ilustración pintada del selector ocupa una capa independiente a resolución de interfaz. La cabeza del retrato procede de la guardia. Los dos estilos comparten casco dorado, penacho oscuro, capa roja y luz cálida desde arriba a la izquierda.

Las hojas generadas se separaron por silueta. Se limpió el fondo, se ajustó la escala entre lotes y se asignó un origen a cada pose. La textura contiene 39 poses. Sus 20 secuencias incluyen guardia, marcha, salto, caída, aterrizaje, agachado, cuatro movimientos propios, cinemática de definitiva, daño, derrota, victoria y seis poses de objetos.

| Movimiento | Lectura visual |
| --- | --- |
| Talón alado | Preparación con rodilla elevada, barrido a la altura del tobillo, patada alta, estocada y retorno. |
| Corte de los Mirmidones | Preparación, estocada frontal, corte hacia atrás y segundo cruce frontal. |
| Salto Divino | Compresión, despegue y dos acentos de espada ascendente. |
| Furia de Tesalia | Aquiles baja el centro de gravedad y abre el pecho. El motor conserva el aura y el talón vulnerable. |
| Égida Olímpica | La pose cambia durante los 34 ticks de la cinemática. El motor conserva el telégrafo y el efecto posterior. |

El juego elimina al luchador al cruzar la zona de expulsión. La derrota se muestra como una viñeta de 29 ticks sobre el borde de la plataforma. La posición es exclusivamente visual. Victoria progresa con el contador del ganador. Las poses de objetos distinguen equipamiento, disparo y recarga. Con un objeto equipado aún faltan ciclos de piernas específicos para cada arma y un golpe animado de maletín.

## Añadir el siguiente personaje

1. Localiza el ID en `src/data/presidents.ts` y sus ventanas de impacto en `src/combat/roster.js`. Usa la carpeta de Aquiles como plantilla. Copia `atlas.json` y sustituye las imágenes y regiones por las del personaje nuevo.
2. Dibuja las poses mirando a la derecha. Para esta escala, una guardia completa mide unos 148 píxeles en el atlas. Usa contornos oscuros, sombras amplias y una luz superior izquierda. En Aquiles los tonos de referencia son vino oscuro y rojo óxido para tela, bronce pardo y oro pálido para metal y marrón cálido para cuero. Reserva los brillos pequeños más claros para el filo y los cantos del casco.
3. Empaqueta las siluetas en PNG con alfa. Deja al menos dos píxeles de margen exterior y cuatro entre regiones. Ajusta la escala usando el tamaño de la cabeza y del torso. Conserva la reducción natural de altura de una pose agachada.
4. Para cada pose declara `region: [x, y, ancho, alto]`, `anchor: [x, y]` en píxeles locales desde la esquina superior izquierda y `scale`. El anclaje es la proyección del cuerpo en el suelo. Un arma extendida, una capa asimétrica o una espada que pasa por debajo del pie requieren revisar el origen a mano. La escala 0.50 convierte la guardia de Aquiles en 74 unidades del renderizador. La cámara aplica después la escala existente de 92/74.
5. Para cada secuencia declara `loop` y una lista de pares `pose`, `ticks`. Un tick equivale a 1/60 s. Los ataques individuales siguen `atk.t`. Ajusta sus acentos a `spec.ph` y conserva el tiempo de recuperación. Si un movimiento requiere otro clip, añade el nombre en `ClipName` y resuélvelo desde el estado de simulación en `spriteAction`. Los eventos de daño, audio y proyectiles siguen perteneciendo al motor.
6. Registra el ID en `rosterArt` de `fighterSprites.ts` y añade `portrait.png` y `selection.webp`. Las URL se construyen con la base de Vite. Las copias personalizadas del editor utilizan sus propios rasgos procedurales.
7. Ejecuta `npm run lint`, `npm test`, `npm run test:sprites`, `npm run test:rooms` y la compilación de Pages. Compara ambos lados, el apoyo de pies y las ventanas activas sobre el mismo escenario antes de migrar otro luchador.

## Verificación del piloto

- TypeScript, compilación de raíz y compilación con la base de Pages correctos. Vite informa que el paquete JS principal minificado supera 500 kB.
- Las pruebas existentes ejercitaron 160 comandos en 40 luchadores, daño, vulnerabilidad del talón, recuperación y entrada remota. Pasó el ciclo de creación, conexión, liberación y cierre de salas.
- Se decodificó el atlas de producción y se comprobaron transparencia, regiones y avance por duración. Se verificó el reflejo horizontal de cada pose, el nivel de suelo de los cuatro cuadros de guardia, la caché compartida y la repetición de un mismo tick.
- Se compararon repeticiones v1 y v2 de 216 ticks con la versión original. Coincidieron las huellas de posición, velocidad, orientación, porcentaje de daño, stocks, tiempo de ataque, furia, talón y muestras de la máscara corporal.
- Se probaron selección, versus y pausa en Chromium, a 1440 × 960 y en móvil emulado a 390 × 844 con entrada táctil habilitada. El navegador cargó atlas, metadatos, retrato y fondo bajo `/presidential-brawl/`. También se bloquearon las peticiones del atlas para comprobar que la partida arrancaba con el respaldo.
- Se abrió el editor y se iniciaron campaña y entrenamiento. En el servidor Node de la entrega se reprodujo una repetición de Aquiles, se congeló el contador en pausa y se comprobó su avance a 0.5× y 2×.
- Las capturas de antes y después están en `docs/capturas`. El GIF de esa carpeta permite revisar la cadencia y las poses fuera del combate.

Quedan pendientes la medición de FPS en teléfonos físicos, la prueba con mando físico y la sesión entre dos dispositivos reales. La máscara de daño sigue la geometría histórica. Pluma, capa y espada pueden sobresalir de ella. La prueba de regresión muestrea zonas corporales, sin exigir coincidencia píxel por píxel entre la ilustración y el cuerpo vulnerable. La publicación remota en GitHub Pages queda pendiente.
