# Presidential Brawl · Apex Edition

Apex Edition tiene 71 luchadores con 284 comandos y 71 definitivas, campaña, entrenamiento, editor y repeticiones. El modo en línea permite partidas 1 contra 1 mediante salas privadas con enlace de invitación.

## Plantel arcade

Los 71 luchadores oficiales tienen atlas y retratos propios. La cuadrícula muestra miniaturas a color y la vista ampliada anima la guardia. En selección, **Míticos** reúne figuras legendarias e históricas, y **Presidentes actuales** y **Expresidentes** ordenan por inicio del mandato correspondiente. El filtro **Nuevos** reúne las incorporaciones recientes. Puedes buscar por nombre o país y alternar entre carrusel y cuadrícula tanto en el selector local como en las salas en línea. [Guía del plantel y comprobaciones](docs/PLANTEL.md)

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

Render usa el `Dockerfile` de la raíz, que aporta Node.js 24 y Go 1.26.8 durante la compilación. El `Build Command`/`Start Command` no se configuran por separado: Render ejecuta `npm run build` desde el Dockerfile, que instala los lockfiles de raíz y `frontend` con `--include=dev` antes de compilar. El runtime Docker publica el backend y también sirve `frontend/dist`. Si configuras el servicio manualmente, selecciona **Docker** y deja el comando Docker vacío para usar el `CMD` de la imagen; no uses el runtime nativo Go para este build porque no garantiza Node/Vite.

Las salas se mantienen en memoria y caducan tras 30 minutos sin actividad.

## Desarrollo

En dos terminales:

```bash
npm run dev:server
npm run dev
```

Vite sirve la interfaz en el puerto 3000 y reenvía HTTP y WebSocket bajo `/api` al backend en el puerto 3001. No ejecutes `npm start` al mismo tiempo que Vite en el puerto 3000.

## Medir rendimiento en un teléfono

Abre el juego con `?perf=1` en la URL. Usa `&perf=1` si ya abriste un enlace de sala. El panel muestra mediana, p95 y cantidad de muestras, en milisegundos. Reinicia la medición entre escenarios.

1. Juega 60 segundos de un duelo local en horizontal. Usa toques breves, cambios de dirección y ataques simultáneos. Anota el intervalo entre cuadros, tiempo de simulación, tiempo de render y toque a cuadro procesado.
2. Abre o únete a una sala de ocho y repite durante 60 segundos con varias definitivas. Anota el intervalo entre cuadros, tiempo de render, intervalo de snapshots y toque a confirmación del servidor.
3. Repite con calidad adaptativa desactivada y con la misma densidad máxima en Video. Registra modelo, navegador, red y si el teléfono estaba en modo de ahorro.

El panel mide intervalos internos del navegador y la confirmación del servidor. Para medir el retraso hasta que se ilumina la pantalla, usa una cámara de alta velocidad. Las estadísticas permanecen en esa pestaña.

## Vercel

Importa el repositorio como proyecto Vite y selecciona Node.js 24. El frontend se compila con `npm run build` en `dist`. Configura `VITE_ROOM_API_BASE_URL` con la URL HTTPS del servidor de Render antes de compilar. Añade el origen exacto del sitio de Vercel, sin barra final, a `ALLOWED_ORIGINS` en Render y conserva el de Pages si se van a usar ambos. Configura también un origen estable para los entornos de prueba que necesiten salas. Las invitaciones usan la misma página con `?room=`; el cliente abre el WebSocket directamente hacia Render.

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

En móvil, la palanca mueve a izquierda/derecha, salta al inclinarse hacia arriba y agacha hacia abajo. Los botones son golpe normal, golpe cargado, dash y ULT; los personajes con armas también muestran recarga.

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

Las pruebas de combate recorren los 284 comandos y verifican activación, contacto y renderizado de las 71 definitivas. Las pruebas de salas comprueban tokens, exclusividad del mando, transmisión SSE, liberación por desconexión, validación de entradas y cierre. La prueba automática del backend usa clientes HTTP; sigue pendiente probar físicamente PC y móvil juntos.

## Referencias consultadas

- Manual oficial de Street Fighter 6, selección y controles: https://game.capcom.com/manual/SF6/en/ps5/page/8/2
- Recomendaciones de seguridad de Express: https://expressjs.com/en/advanced/best-practice-security/

### Verificación antes de publicar

- En Android e iPhone, mantén el joystick mientras saltas y atacas con otro dedo. Levanta los dedos en distinto orden, gira el teléfono y cambia de aplicación. Al volver, los controles deben quedar en reposo.
- Con dos redes, juega un duelo y después una campal de ocho con `?perf=1`. Corta la conexión de un invitado y restablécela dentro de la ventana de recuperación de 20 segundos que concede el servidor al detectar la desconexión. Comprueba que conserva su puesto, puede volver a moverse y ve el estado de la conexión.
- En una ventana privada con red lenta, inicia la partida y usa la primera definitiva. Mientras se carga el arte, deben verse el luchador y el efecto de impacto de respaldo. Comprueba también la pantalla de victoria.
- Despliega Render y GitHub Pages desde la misma revisión. Consulta `/health` en Render y verifica que `roomProtocol` coincide con `src/network/roomProtocol.mjs`. Prueba una pestaña de la versión anterior y otra recién abierta. La nueva interfaz ofrece recargar cuando detecta un servidor incompatible. Una pestaña anterior a esta función recibe el aviso de actualización del servidor.
