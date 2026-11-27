import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      {
        name: 'mobile-beta-offline-shell',
        apply: 'build',
        generateBundle(_, output) {
          const code = Object.keys(output).filter(file => /\.(?:js|css)$/.test(file)).sort();
          const version = process.env.VITE_WASM_VERSION ??
            createHash('sha256').update(code.join('\n')).digest('hex').slice(0, 16);
          const wasm = process.env.VITE_WASM_VERSION ? '?v=' + encodeURIComponent(version) : '';
          this.emitFile({
            type: 'asset',
            fileName: 'pwa-shell.json',
            source: JSON.stringify({
              version,
              files: ['index.html', 'manifest.json', 'app-icon-192.png', 'app-icon-512.png',
                'apple-touch-icon.png', 'sim/wasm_exec.js' + wasm, 'sim/sim.wasm' + wasm, ...code],
            }),
          });
        },
      },
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      proxy: { "/api": { target: "http://127.0.0.1:3001", ws: true } },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
