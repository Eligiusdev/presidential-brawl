# Presidential Brawl · Plantel arcade

Los 61 luchadores oficiales usan sprites en combate, en el selector y en la vista previa del editor. La base de esta entrega es la versión de Apex con el piloto de Aquiles y servidor de salas. En Combate Versus se puede seleccionar cualquier pareja, incluidos enfrentamientos entre dos copias del mismo personaje.

## Ejecutar

Con Node.js 24, descomprime el paquete y ejecuta `npm ci` y `npm start`. El servidor sirve la compilación incluida en `http://localhost:3000`. Para trabajar sobre el código utiliza los comandos de desarrollo del README. El flujo de Pages vuelve a compilar con su propia base y publica la carpeta `dist`.

## Arte y tiempos

- Los 21 luchadores recientes tienen 12 regiones por atlas. Cada atlas parte de tres dibujos originales de guardia, paso e impacto. Las poses restantes se derivan con ajuste de escala y rotación. Los estados especiales de equipamiento, disparo y recarga de esos 21 luchadores utilizan el renderizador procedural.
- La cuadrícula y los retratos usan recursos a color. En la vista ampliada aparece la miniatura hasta que la guardia animada está lista.

- Los 39 luchadores migrados aportan 33 regiones de atlas por personaje. Cada conjunto comprende 25 poses de combate y movimiento, dos cuadros intermedios de respiración y seis poses con objetos. Con las 39 regiones del piloto de Aquiles, hay 1.326 regiones en total.
- Las cuatro fases de guardia usan los mismos píxeles de apoyo de las botas. Los cuadros intermedios derivan de dos dibujos mediante interpolación de movimiento. La marcha alterna cuatro apoyos. Salto y caída se resuelven a partir del despegue, la velocidad vertical y el contador de aterrizaje.
- Ligero, especial frontal, ascendente y bajo tienen secuencias temporales independientes. Las duraciones se ajustaron a cada libro de movimientos, incluidas sus fases de contacto y los ticks de lanzamiento de proyectiles. El estado del ataque transmite una marca visual para distinguir el especial bajo del frontal. Daño, alcance, efectos, cámara y colisiones siguen a cargo del motor.
- Atatürk utiliza sus propios retrato, paleta y poses con objetos. Sus secuencias de esgrima adaptan la base de movimiento de Sun Yat-sen con el rostro y vestuario de Atatürk. Cada uno conserva sus cuatro movimientos y sus propios tiempos.
- Retrato y miniatura proceden del sprite. La ilustración escénica del selector es una interpretación pintada del mismo luchador. Cada ficha conserva las estadísticas y habilidades de los datos existentes.

## Archivos

| Ruta | Contenido |
| --- | --- |
| `public/assets/fighters/<id>/` | Atlas transparente PNG o WebP, metadatos, retrato, miniatura WebP y fondo WebP. El ID `aquiles` conserva la carpeta histórica `achilles`. |
| `src/engine/fighterSprites.ts` | Registro, caché de seis atlas, temporización, orientación y elección de animaciones. |
| `src/engine/gameEngine.ts`, `src/engine/pixelRenderer.ts` | Identificación visual del especial bajo. La máscara histórica de colisión es independiente de la imagen. |
| `src/components/FighterPreview.tsx` | Miniaturas a color en la cuadrícula y guardia animada en la vista ampliada. |
| `tests/roster-art.mjs`, `tests/sprite-atlas.mjs` | Decodificación de archivos, límites, pies, temporización, caché y controles de regresión. |
| `docs/capturas/roster/` | Galería de los 40, muestra animada de ocho personajes y capturas de selección y combate en escritorio y móvil emulado. |

## Añadir otro luchador

1. Añade el personaje y su libro de movimientos con las convenciones de `src/data/presidents.ts` y `src/combat/roster.js`.
2. Copia la estructura de `public/assets/fighters/bolivar/` en una carpeta con el nuevo ID. Dibuja todas las poses mirando a la derecha. Mantén el torso, la cara y la escala entre cuadros. El origen local es la proyección del luchador en el suelo. El arma y el manto pueden extenderse a ambos lados.
3. Declara cada recorte en `poses`. `region` usa coordenadas x, y, ancho y alto. `anchor` se expresa dentro de ese recorte. La escala habitual es 0.5 para una guardia de unos 145 píxeles. El motor refleja el dibujo alrededor de este origen.
4. Define en `animations` el bucle y los tiempos por pose, medidos en ticks de 1/60 s. Ajusta `jab`, `slash`, `up` y `down` a los ataques reales. Registra un clip específico cuando lo exija una habilidad. Los eventos de impacto pertenecen a la simulación.
5. Crea `thumb.webp`, `portrait.png` y `selection.webp`. Añade el ID a `rosterArt`. El editor conserva la representación procedural para los luchadores personalizados.
6. Ejecuta `npm run lint`, `npm test`, `npm run test:sprites`, `npm run test:rooms` y `npm run build -- --base=/presidential-brawl/`.

## Verificación y alcance

Se ejercitaron los 160 comandos y se compararon 8.800 pasos de simulación con el paquete del piloto. Coincidieron las huellas de posiciones, velocidades, orientación, daño, aturdimiento, vidas y progreso de los ataques. Pasaron las pruebas de repetición v1/v2 y del servidor de salas. El navegador abrió las 40 fichas en la compilación de Pages. Al abrir el selector cargó dos atlas completos. Se iniciaron 20 combates versus con parejas distintas y se verificó que el canvas de juego dibujó el atlas de cada uno de los 40 participantes. Las capturas móviles se tomaron en Chromium con una ventana de 390 × 844 y emulación táctil.

Los objetos disponen de poses de equipamiento, disparo y recarga. Los ciclos de marcha específicos por objeto y el golpe animado de maletín siguen pendientes. Los FPS en hardware físico, el mando físico y la sesión entre dos dispositivos reales requieren prueba en esos equipos. La compilación de Vite mantiene un aviso por el tamaño del paquete JavaScript principal. La verificación de Pages se hizo sirviendo el prefijo localmente.
