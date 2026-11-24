# Guía de Sprites y Atlas 2D — Presidential Brawl: Apex Edition

Esta carpeta contiene los recursos gráficos 2D por luchador para migrar progresivamente el roster desde el rasterizador geométrico de respaldo (`CpsSpriteRasterizer` en `src/engine/pixelRenderer.ts`) hacia hojas de sprites **CPS-1 16-bit Pixel Art** consistentes con las ilustraciones de selección, los escenarios y el HUD.

---

## 1. Dirección Artística Unificada

- **Estilo elegido**: **Capcom CPS-1 16-bit Pixel Art** (`imageSmoothingEnabled = false`), nítido y sin suavizado borroso.
- **Iluminación**: Luz clave superior izquierda, contorno cromático oscuro (`outline`, nunca negro plano `#000000` si se integra con paletas cálidas/frías) y acento de brillo en bordes metálicos.
- **Proporciones de combate**:
  - Cuerpo adulto estilizado (aprox. 5.5–6 cabezas).
  - Silueta legible a ~92 px de altura en combate (escala `1.0` a `1440×810`).
  - Separación estricta de materiales: piel, metal dorado/bronce, cuero y tela con caída/peso propio.
- **Luchador piloto**: `aquiles` (`public/assets/fighters/achilles/`).

---

## 2. Estructura de Carpeta por Personaje

```text
public/assets/fighters/<nombre_carpeta>/
  ├── atlas.png       # Sprite sheet transparente (fondo alpha=0) en cuadrícula uniforme
  ├── atlas.json      # Manifiesto de frames, anclaje de pies, escala y animaciones
  └── portrait.png    # Retrato busto de 128×128 px con los mismos rasgos, equipo y paleta
```

> Todas las rutas públicas se cargan usando `resolvePublicAssetUrl(...)` (`import.meta.env.BASE_URL`), por lo que funcionan tanto en `/` (local / servidor Node) como en `/presidential-brawl/` (GitHub Pages).

---

## 3. Especificación del `atlas.json`

Ejemplo basado en el piloto de Aquiles (`public/assets/fighters/achilles/atlas.json`):

- `cellWidth` / `cellHeight`: tamaño estándar recomendado **`192 × 160` px** por celda (espacio suficiente para capas, armas extendidas y penachos sin recortes).
- `anchorX` / `anchorY`: punto exacto donde tocan los pies al suelo dentro de la celda. Estándar recomendado: **`anchorX: 96, anchorY: 148`**.
- `visualScale`: factor de calibración visual para que la altura real del cuerpo en píxeles (`referenceHeightPx`) equivalga al estándar de combate (~92 px mundo cuando `worldScale = 1`) sin modificar los rectángulos de colisión (`FighterSim.w = 38`, `FighterSim.h = 92`).
- `animations`: clips requeridos (si falta alguno secundario, el motor usa respaldo automático a `idle`):
  - Locomoción: `idle` (loop), `walk` (loop), `run` (loop), `crouch` (loop)
  - Aéreas / aterrizaje: `jump_start`, `jump_up` (loop), `jump_fall` (loop), `land`
  - Combate (con anticipación → impacto → recuperación): `attack_light`, `attack_special`, `special_up`, `special_down`
  - Estados: `hurt`, `defeat`, `victory`

---

## 4. Cómo Migrar el Siguiente Luchador del Roster

1. Toma su ilustración splash en `src/data/fighterSplashes.ts` como referencia canónica de rostro, vestimenta, arma y paleta.
2. Genera/exporta las poses en el mismo lenguaje **CPS-1 pixel art**, recórtalas sin recortar bordes de armas/capas, limpia el fondo a alpha transparente (`0`) y compón la cuadrícula `192×160` centrada en `(96, 148)`.
3. Exporta su busto `portrait.png` (`128×128`) coherente con su diseño de combate y splash.
4. Crea `atlas.json` siguiendo el esquema de `achilles/atlas.json`.
5. Registra el personaje en `src/engine/spriteAtlas.ts` dentro de `FIGHTER_ATLAS_REGISTRY` o llamando a:
   ```ts
   import { registerFighterAtlas } from '../engine/spriteAtlas';
   registerFighterAtlas('bolivar', 'assets/fighters/bolivar');
   ```
6. Pre-cárgalo si deseas en el arranque de combate; los luchadores aún no migrados seguirán usando `CpsSpriteRasterizer` sin romper ningún modo de juego.


---

## 5. Pipeline automatizado (nuevo)

`tools/build_atlas.py` convierte una hoja de 25 poses (5x5, fondo magenta o blanco) en `atlas.png`, `atlas.json` y `portrait.png`:
una sola escala por luchador, pies anclados en (96,148), sin recortes y con limpieza del halo del fondo.

```bash
cp mi_hoja.png tools/sheets/<id>_sheet.png
cp tools/fighters/washington.json tools/fighters/<id>.json   # ajusta sheet, outDir, paleta y mapa de animaciones
python3 tools/build_atlas.py tools/fighters/<id>.json
```
Después registra el id en `FIGHTER_ATLAS_REGISTRY` (`src/engine/spriteAtlas.ts`). Los prompts de los luchadores pendientes están en `ART_PROMPTS.md`.

**Estado del roster:** `aquiles` y `washington` con atlas; el resto usa el renderizador de respaldo.
