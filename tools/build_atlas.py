#!/usr/bin/env python3
"""
Construye atlas.png + atlas.json + portrait.png de un luchador a partir de una hoja de poses
(cuadrícula 5x5 con fondo magenta/blanco, una pose por celda, orden de lectura).

Uso:
  python3 tools/build_atlas.py tools/fighters/washington.json

Las poses se limpian de fondo, se escalan con UNA sola escala para todo el luchador
(proporciones constantes), se alinean por los pies a (anchorX, anchorY) y se compactan
en una cuadrícula de 192x160 transparente.
"""
import json, sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

CW, CH, AX, AY = 192, 160, 96, 148


def key_background(arr, mode):
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    if mode == 'magenta':
        d = np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2)
        return d < 110
    # blanco
    return (r > 240) & (g > 240) & (b > 240)


def despill(img, bgmask, mode):
    """Quita el halo del color de fondo en el borde del sprite."""
    a = np.array(img).astype(int)
    edge = ndi.binary_dilation(bgmask, iterations=2) & ~bgmask
    if mode == 'magenta':
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        spill = edge & (r > g + 25) & (b > g + 25)
        m = np.minimum(r, b)
        cap = g + 20
        a[..., 0] = np.where(spill, np.minimum(r, cap), r)
        a[..., 2] = np.where(spill, np.minimum(b, cap), b)
    return a.astype(np.uint8)


def extract_poses(path, mode, expect):
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    bg = key_background(arr, mode)
    fg = ndi.binary_opening(~bg, iterations=1)
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=6))
    objs = ndi.find_objects(lab)
    comps = []
    for i, o in enumerate(objs):
        h, w = o[0].stop - o[0].start, o[1].stop - o[1].start
        if h * w > 3000:
            comps.append((i + 1, o))
    if len(comps) != expect:
        raise SystemExit(f'Se esperaban {expect} poses y se detectaron {len(comps)}')
    clean = despill(im, bg, mode)
    out = []
    for lid, o in comps:
        region = (lab == lid) & fg
        # se incluye el borde alrededor del sprite para conservar antialias
        region = ndi.binary_dilation(region, iterations=1) & ~bg
        rgba = clean.copy()
        rgba[..., 3] = np.where(region, 255, 0)
        ys, xs = np.where(region)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        out.append({'img': Image.fromarray(rgba).crop(box), 'cy': (box[1] + box[3]) / 2, 'cx': (box[0] + box[2]) / 2})
    # orden de lectura: filas por cy, luego x
    rows = max(1, round(expect ** 0.5))
    per = expect // rows
    out.sort(key=lambda p: p['cy'])
    ordered = []
    for r in range(rows):
        chunk = sorted(out[r * per:(r + 1) * per], key=lambda p: p['cx'])
        ordered += chunk
    return ordered


def feet_center_x(img):
    a = np.array(img)[..., 3] > 0
    h = a.shape[0]
    band = a[int(h * 0.88):, :]
    xs = np.where(band.any(axis=0))[0]
    return (xs.min() + xs.max()) / 2 if len(xs) else a.shape[1] / 2


def main(cfg_path):
    cfg = json.load(open(cfg_path))
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    poses = extract_poses(cfg['sheet'], cfg.get('background', 'magenta'), cfg['poseCount'])
    ref = poses[cfg['referencePose']]['img'].height
    scale = cfg['referenceHeightPx'] / ref  # misma escala para todas las poses
    cols = cfg.get('atlasCols', 5)
    rows = (len(poses) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * CW, rows * CH), (0, 0, 0, 0))
    rects = []
    for i, p in enumerate(poses):
        im = p['img']
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        im = im.resize((w, h), Image.LANCZOS)
        fx = feet_center_x(im)
        ox = round(AX - fx)
        ox = max(2, min(CW - 2 - w, ox))  # sin recortes
        oy = AY - h
        if oy < 2:
            raise SystemExit(f'Pose {i} no cabe en altura ({h}px)')
        cx, cy = (i % cols) * CW, (i // cols) * CH
        atlas.alpha_composite(im, (cx + ox, cy + oy))
        rects.append({'x': cx, 'y': cy, 'w': CW, 'h': CH})
    out_dir = os.path.join(root, cfg['outDir'])
    os.makedirs(out_dir, exist_ok=True)
    atlas.save(os.path.join(out_dir, 'atlas.png'), optimize=True)

    anims = {}
    for name, spec in cfg['animations'].items():
        frames = []
        for idx, ms in spec['frames']:
            fr = {'rect': rects[idx], 'durationMs': ms, 'anchorX': AX, 'anchorY': AY}
            frames.append(fr)
        anims[name] = {'loop': spec['loop'], 'frames': frames}

    pal = cfg['paletteSpec']
    manifest = {
        'version': 1, 'fighterId': cfg['fighterId'], 'artStyle': 'cps1_pixel',
        'atlasImage': 'atlas.png', 'portraitImage': 'portrait.png',
        'cellWidth': CW, 'cellHeight': CH,
        'visualScale': cfg['visualScale'], 'referenceHeightPx': cfg['referenceHeightPx'],
        'paletteSpec': pal, 'animations': anims,
    }
    json.dump(manifest, open(os.path.join(out_dir, 'atlas.json'), 'w'), indent=2)

    # retrato 128x128: busto de la pose de referencia, a resolución original
    src = poses[cfg['portraitPose']]['img']
    s = src.size
    side = int(min(s[0], s[1] * cfg.get('portraitCrop', 0.42)) )
    side = max(side, int(s[1] * cfg.get('portraitCrop', 0.42)))
    fx = feet_center_x(src)
    a = np.array(src)[..., 3] > 0
    top_xs = np.where(a[:int(s[1] * 0.3)].any(axis=0))[0]
    cxh = (top_xs.min() + top_xs.max()) / 2
    x0 = int(cxh - side / 2); y0 = 0
    canvas = Image.new('RGBA', (side, side), tuple(int(pal['outline'].lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + (255,))
    bgc = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    tmp = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    tmp.alpha_composite(src.crop((max(0, x0), y0, min(s[0], x0 + side), min(s[1], y0 + side))), (max(0, -x0), 0))
    canvas.alpha_composite(tmp)
    canvas.convert('RGB').resize((128, 128), Image.LANCZOS).save(os.path.join(out_dir, 'portrait.png'))
    print('OK', cfg['fighterId'], 'escala', round(scale, 4), 'atlas', atlas.size)


if __name__ == '__main__':
    main(sys.argv[1])
