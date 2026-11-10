/* Only the kiosk shell and public static files. Never cache API/auth/company responses. */
const CACHE = 'ponto-static-20261110-operacional-etapa3-v1';
const SHELL = '/vip-ponto.html';
const ASSETS = [SHELL, '/jspdf-2.5.1.umd.min.js', '/jspdf.plugin.autotable.min.js',
  '/jszip-3.10.1.min.js', '/xlsx-0.18.5.full.min.js', '/supabase-2.117.3.min.js',
  '/operacional/boot/namespace-v20261110-etapa1.js', '/operacional/core/formatos-v20261110-etapa1.js',
  '/operacional/boot/contexto-v20261110-etapa1.js', '/operacional/boot/compatibilidade-v20261110-etapa1.js',
  '/operacional/domain/escala-v20261110-etapa2.js', '/operacional/domain/ocorrencias-v20261110-etapa2.js',
  '/operacional/domain/jornada-v20261110-etapa2.js', '/operacional/domain/banco-v20261110-etapa2.js',
  '/operacional/domain/nucleo-v20261110-etapa2.js',
  '/operacional/data/armazenamento-v20261110-etapa3.js', '/operacional/data/indexeddb-v20261110-etapa3.js',
  '/operacional/data/fila-offline-v20261110-etapa3.js', '/operacional/data/supabase-v20261110-etapa3.js',
  '/operacional/data/nucleo-v20261110-etapa3.js',
  '/qrcode-generator.min.js', '/ponto-offline-register.js', '/vip-logo.png',
  '/favicon-v20261028.png', '/favicon.ico', '/pwa-icon-192-v20261028.png', '/pwa-icon-512-v20261028.png', '/pwa-icon-maskable-192-v20261028.png', '/pwa-icon-maskable-512-v20261028.png', '/apple-touch-icon-v20261028.png', '/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ponto-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === SHELL) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(SHELL, copy)));
      }
      return response;
    }).catch(() => caches.match(SHELL)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});