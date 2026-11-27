import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { installDesignViewport } from './ui/designViewport';

installDesignViewport();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <App />
  </BrowserRouter>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const version = import.meta.env.VITE_WASM_VERSION;
  const worker = `${import.meta.env.BASE_URL}sw.js${version ? `?v=${encodeURIComponent(version)}` : ''}`;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(worker).catch(error => console.warn('PWA installation unavailable', error));
  }, { once: true });
}
