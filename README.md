# Presidential Brawl · Apex Edition

Versión de continuación del archivo Apex: conserva los 40 luchadores, 160 comandos, física, audio procedural, campaña, editor y repeticiones. Incorpora un backend Node/Express para conectar un móvil como mando de J2 y recibir una vista remota de la partida. La simulación se ejecuta en el equipo principal: esta versión no implementa rollback ni un servidor de combate autoritativo.

## Plantel arcade

Los 40 luchadores oficiales tienen arte animado en selección y combate. Se incluyen los atlas, las ilustraciones y la compilación local en `dist`. [Guía del plantel y comprobaciones](docs/PLANTEL.md)

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

1. En el equipo principal abre `http://localhost:3000`.
2. Para conectar el móvil, abre el juego usando la IP del equipo en la misma red, por ejemplo `http://192.168.1.20:3000`. Permite el puerto 3000 en el firewall de la red privada si hace falta.
3. Pulsa **Conectar otra pantalla → Crear sala**. Copia el enlace que contiene el código y ábrelo en el móvil. Si creaste la sala desde localhost, sustituye localhost por la IP del equipo antes de compartirlo.
4. En el móvil pulsa **Conectar como J2**.
5. En el equipo principal entra a selección, desactiva la IA para jugar **J1 vs J2**, elige los personajes y comienza. J1 usa el teclado o un mando; J2 usa los botones del móvil.
6. Mantén la pestaña del equipo principal visible. Puedes ocultar su panel con × sin cerrar la sala. **Salir de la sala** sí la cierra o desconecta el mando.

La vista del móvil es una secuencia JPEG de aproximadamente 6 fps; el equipo principal conserva su renderizado normal. No lleva audio ni HUD HTML al móvil. La latencia depende de la red y este transporte está pensado para probar en una red local. Para jugar por Internet hace falta alojar este servidor Node detrás de HTTPS con soporte SSE sin buffering. Una publicación estática de `dist` no proporciona las salas. No se ha desplegado este backend en un servicio externo.

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

Las pruebas de combate recorren los 160 comandos y sus interacciones especiales. Las pruebas de salas comprueban tokens, exclusividad del mando, transmisión SSE, liberación por desconexión, validación de entradas y cierre. La prueba automática del backend usa clientes HTTP; sigue pendiente probar físicamente PC y móvil juntos.

## Referencias consultadas

- Manual oficial de Street Fighter 6, selección y controles: https://game.capcom.com/manual/SF6/en/ps5/page/8/2
- Recomendaciones de seguridad de Express: https://expressjs.com/en/advanced/best-practice-security/
