# Presidential Brawl · Apex Edition

Apex Edition tiene 61 luchadores con 244 comandos y 61 definitivas, campaña, entrenamiento, editor y repeticiones. El modo en línea permite partidas 1 contra 1 mediante salas privadas con enlace de invitación.

## Plantel arcade

Los 61 luchadores oficiales tienen atlas y retratos propios. La cuadrícula muestra miniaturas a color y la vista ampliada anima la guardia. En selección, **Míticos** reúne figuras legendarias e históricas, y **Presidentes actuales** y **Expresidentes recientes** ordenan por inicio del mandato correspondiente. El plantel presidencial se verificó en noviembre de 2026. [Guía del plantel y comprobaciones](docs/PLANTEL.md)

Cada luchador tiene una [ficha de movimientos](docs/MOVIMIENTOS.md) con sus cuatro comandos, el efecto de su definitiva y cómo evitarla. También puedes consultarlos desde el selector y el menú de pausa. El [balance competitivo](docs/BALANCE.md) se aplica desde la versión 7 de las repeticiones.

## Piloto de Aquiles

Selecciona a Aquiles en Combate Versus para ver la nueva guardia y jugar con el atlas. La guía reúne los movimientos, archivos modificados, pruebas y pasos para migrar otro personaje. [Guía del piloto](docs/AQUILES.md)

## Ejecutar y jugar desde dos dispositivos

Requiere Node.js 24. En la carpeta del proyecto:

```bash
npm ci
npm run build
npm start
```

En Windows usa `npm.cmd` si PowerShell bloquea `npm.ps1`.

1. Ejecuta los comandos en el PC anfitrión. La consola de `npm start` muestra una o más direcciones **Red local**, por ejemplo `http://192.168.1.20:3000`.
2. Abre esa misma dirección en ambos equipos. Usa la IP del anfitrión, ya que `localhost` apunta al equipo desde el que abres el navegador. Si Windows pregunta por el acceso, permite Node.js en redes privadas.
3. En el anfitrión pulsa **Jugar en línea → Crear sala** y comparte el enlace. En el segundo equipo, abre el enlace y pulsa **Conectar como J2**.
4. Cada uno confirma su luchador y el anfitrión mantiene su pestaña visible. J2 puede usar WASD y J / K / L (definitiva con C o espacio, recarga con R), las flechas y U / I / O / M, o los controles táctiles en móvil.

Al abrir el juego desde la IP del anfitrión, las salas y los controles pasan por el servidor local. El juego intenta enviar el canvas directamente por WebRTC a la resolución del anfitrión. Cuando la conexión directa falla, usa fotogramas JPEG adaptativos con un máximo aproximado de 24 envíos por segundo. El video contiene el canvas del anfitrión, sin audio ni HUD HTML.

Para jugar por Internet desde GitHub Pages, el backend de salas puede desplegarse como servicio Node en Render usando `render.yaml`.

1. En Render crea un **Blueprint** y conecta este repositorio. Revisa y despliega el servicio `presidential-brawl-api`.
2. Abre la URL de Render en ambos dispositivos y verifica el duelo. El servicio sirve el juego y la API juntos. Para enlazar GitHub Pages, cuando Render muestre la URL del servicio (por ejemplo, `https://presidential-brawl-api.onrender.com`), abre **Settings → Secrets and variables → Actions → Variables** del repositorio en GitHub y crea `ROOM_API_BASE_URL` con esa URL, sin `/` al final.
3. En GitHub Actions vuelve a ejecutar **Presidential Brawl Pages** desde `main`. El build usará esa URL para las salas y el móvil.
4. Abre el juego desde `https://eligiusdev.github.io/presidential-brawl/`, crea una sala y comparte el enlace generado.

El servicio permite solicitudes del origen de GitHub Pages configurado en `ALLOWED_ORIGINS`. El plan gratuito de Render puede suspenderse cuando no tiene actividad, por lo que la primera conexión tras una pausa puede tardar en despertar.

Las salas viven en memoria: se pierden al reiniciar y caducan tras 30 minutos sin actividad. Solo aceptan un mando J2. Los tokens de host y mando tienen permisos distintos y no se incluyen en el enlace de invitación; quien tenga el código puede ocupar el puesto J2 mientras esté libre. Las entradas se liberan automáticamente si dejan de llegar durante 700 ms.

## Desarrollo

En dos terminales:

```bash
npm run dev:server
npm run dev
```

Vite sirve la interfaz en el puerto 3000 y reenvía `/api` al backend en el puerto 3001. No ejecutes `npm start` al mismo tiempo que Vite en el puerto 3000.

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
