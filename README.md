<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/53af389c-fae8-49f6-a380-ab6bca67a09a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Combate de Apex

Para jugar esta versión en Windows con Node 24, abre PowerShell en la carpeta que contiene `package.json` y ejecuta `npm.cmd ci` y `npm.cmd run dev`. Abre la dirección local que muestra Vite. La simulación de combate funciona sin una clave de API. Elige **Entrenamiento** para experimentar con alcance, ventanas activas y retroceso.

| Acción | J1 | J2 | Mando estándar (Xbox) |
| --- | --- | --- | --- |
| Jab sin dirección | J | U | X |
| Especial neutro | K | I | B |
| Recuperación | W + K | ↑ + I | ↑ + B |
| Especial abajo | S + K | ↓ + I | ↓ + B |

Mantén la dirección y pulsa especial, o pulsa ambos a la vez. El especial arriba vuelve a estar disponible al aterrizar. Las acciones de teclado se pueden reasignar. Con un arma de fuego equipada, el botón de ligero dispara. En Vídeo puedes activar la visualización de colisiones.

### Cómo editar un luchador

- `src/combat/Fighter.js` contiene los cuatro métodos del luchador y convierte cada frase en ventanas de preparación, impacto y recuperación a 60 ticks por segundo.
- `src/combat/roster.js` asocia cada identificador con sus cuatro movimientos. Las cinco fichas destacadas especifican sus efectos y el resto del roster combina fases de ataque, pausas, avances, golpes por detrás y trayectorias de proyectil.
- `src/combat/effects.js` implementa los campos, el sello, la furia, el dibujo de impactos y la geometría del orbe. El motor resuelve los golpes después de mover a ambos jugadores. El cuerpo vulnerable se obtiene del mismo raster anatómico que usa Canvas. Las capas y los brillos son decorativos.
- En `src/engine/gameEngine.ts` se aplican los controles, daño, contraataques y rebotes. Los personajes creados con el editor conservan su configuración previa. Las repeticiones nuevas usan la versión 2.
- `npm test` ejercita el motor, dibuja los 160 comandos sobre Canvas y comprueba las interacciones especiales. `npm run lint` comprueba los tipos y `npm run build` genera la versión de producción.
