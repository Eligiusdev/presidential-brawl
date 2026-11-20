# Presidential Brawl · Apex Edition

Apex Edition tiene 61 luchadores con 244 comandos y 61 definitivas, campaña, entrenamiento, editor y repeticiones. El modo en línea permite partidas 1 contra 1 mediante salas privadas con enlace de invitación.

## Plantel arcade

Los 61 luchadores oficiales tienen atlas y retratos propios. La cuadrícula muestra miniaturas a color y la vista ampliada anima la guardia. En selección, **Míticos** reúne figuras legendarias e históricas, y **Presidentes actuales** y **Expresidentes recientes** ordenan por inicio del mandato correspondiente. El plantel presidencial se verificó en noviembre de 2026. [Guía del plantel y comprobaciones](docs/PLANTEL.md)

Cada luchador tiene una [ficha de movimientos](docs/MOVIMIENTOS.md) con sus cuatro comandos, el efecto de su definitiva y cómo evitarla. También puedes consultarlos desde el selector y el menú de pausa. El [balance competitivo](docs/BALANCE.md) se aplica desde la versión 7 de las repeticiones.

## Piloto de Aquiles

Selecciona a Aquiles en Combate Versus para ver la nueva guardia y jugar con el atlas. La guía reúne los movimientos, archivos modificados, pruebas y pasos para migrar otro personaje. [Guía del piloto](docs/AQUILES.md)

## Salas de 2, 4, 6 y 8 jugadores

Requiere Node.js 24. En el equipo que ejecutará el servidor:

```bash
npm ci
npm run build
npm start
```

En Windows puedes usar `npm.cmd`. Abre la dirección **Red local** que imprime la consola en todos los equipos. Crea una sala, elige su capacidad y comparte el enlace. Cada jugador elige su luchador y pulsa **Estoy listo**. El anfitrión elige escenario e inicia el combate cuando se llenan los puestos.

Todos pueden usar **WASD**, **J/K/L**, **C o Espacio** y **R**, las flechas con **U/I/O/M**, o los controles táctiles. Si el anfitrión sale, el siguiente jugador conectado toma su rol. La simulación vive en el servidor y continúa mientras haya jugadores conectados. Un puesto admite reconexión durante 20 segundos.

Para Internet, despliega `presidential-brawl-api` en Render y publica el frontend de la misma revisión en GitHub Pages. Configura la variable `ROOM_API_BASE_URL` de GitHub Actions con la URL HTTPS de Render y `ALLOWED_ORIGINS` en el backend con el origen de Pages. La ruta del WebSocket es `/api/rooms/ws`. El servidor emite snapshots a 30 Hz y simula a 60 Hz. Cada navegador interpola y dibuja el combate en su propio canvas.

Las salas se mantienen en memoria y caducan tras 30 minutos sin actividad.

## Desarrollo

En dos terminales:

```bash
npm run dev:server
npm run dev
```

Vite sirve la interfaz en el puerto 3000 y reenvía HTTP y WebSocket bajo `/api` al backend en el puerto 3001. No ejecutes `npm start` al mismo tiempo que Vite en el puerto 3000.

## Controles

| Acción | J1 | J2 local |
| --- | --- | --- |
| Movimiento / salto / abajo | A D / W / S | Flechas |
| Golpe | J | U |
| Especial | K | I |
| Esquivar | L | O |
| Ultimate | C o Espacio | M o Enter |
| Recargar | R | / |

Mantén arriba o abajo al pulsar especial para las variantes. Los controles pueden reasignarse en configuración.

En los menús, usa la cruceta o el stick izquierdo para mover el foco, el botón inferior (A / Cruz) para confirmar y el botón derecho (B / Círculo) para volver. Start / Options pausa o reanuda el combate local. Con izquierda y derecha puedes ajustar deslizadores y cambiar opciones de listas. Los campos de texto se editan con el teclado.

## Cambios visuales

La selección muestra figuras completas de mayor tamaño, con las no seleccionadas atenuadas y las elegidas a color. La cámara permite acercarse más cuando los luchadores están juntos; se mantiene el alejamiento cuando se separan. No se cambian el tamaño físico ni las colisiones de los luchadores. Se elimina el uso de `__dirname` de la configuración de Vite.

## Verificación

```bash
npm test
npm run test:rooms
npm run lint
npm run build
```

Las pruebas de combate recorren los 244 comandos y verifican activación, contacto y renderizado de las 61 definitivas. Las pruebas de salas comprueban tokens, exclusividad del mando, transmisión SSE, liberación por desconexión, validación de entradas y cierre. La prueba automática del backend usa clientes HTTP; sigue pendiente probar físicamente PC y móvil juntos.

## Referencias consultadas

- Manual oficial de Street Fighter 6, selección y controles: https://game.capcom.com/manual/SF6/en/ps5/page/8/2
- Recomendaciones de seguridad de Express: https://expressjs.com/en/advanced/best-practice-security/
