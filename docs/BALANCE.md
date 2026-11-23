# Balance competitivo

Los 61 luchadores oficiales usan su kit, sus hitboxes y un arquetipo de peso, velocidad y carga del medidor. Los personajes del editor usan los valores que se guardaron al crearlos. La grabación de partidas nuevas usa la versión 9.

| Comando | Preparación | Activo | Recuperación | Daño base |
| --- | ---: | ---: | ---: | ---: |
| Ligero | 4–6 | 3–4 | 7–10 | 5–7 % |
| Especial neutral | 10–14 | 6–14 | 14–18 | 9–12 % |
| Especial arriba | 8–11 | 8–12 | 16–22 | 10–13 % |
| Especial abajo | 7–15 | 6–18 | 15–20 | 8–14 % |

Los tiempos están en cuadros a 60 FPS. El daño base se reparte entre los impactos del comando. Las reglas de combos, objetos y efectos de combate pueden modificar el daño efectivo. Un especial neutral con proyectiles tiene 66 cuadros de enfriamiento desde el último disparo. Cada luchador puede mantener un campo táctico activo durante hasta 180 cuadros.

Las definitivas tienen cuatro presupuestos de alcance y daño. Se activan con un destello de diez cuadros y hasta quince de invulnerabilidad al comenzar el aviso. El identificador determina el patrón, los puntos de impacto y la presentación procedural. El servidor de salas transmite la partida del anfitrión y los patrones de las definitivas usan rutas fijas.

El control de TypeScript abarca el cliente y la configuración del build vigente. El backend Go vive en `backend/` (`net/`, `rooms/`, `contract/`, `gen/`, `cmd/server`) y la lógica de simulación en `engine/` como módulo Go separado, desacoplado del backend. Las pruebas de salas ejecutan el servidor Go vigente.

Ejecuta `npm run lint`, `npm test`, `npm run test:sprites`, `npm run test:rooms` y `npm run build`.

Desde la versión 9, los efectos que se desplazan recorren sus rutas a una velocidad calculada según la distancia y el tipo de definitiva. El reloj de efectos con duración táctica, como la gravedad de Kennedy y el escudo de Macron, conserva sus límites.
