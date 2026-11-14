// 网络优先：有网时拿最新版本并更新缓存，没网时用缓存
const CACHE = 'cet6-v5';
const FILES = ['/cet6/', '/cet6/index.html', '/cet6/data.js', '/cet6/manifest.webmanifest', '/cet6/icon-180.png', '/cet6/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cet6-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 在线发音等跨站请求不经过缓存
  if (url.pathname.startsWith('/cet6/audio/')) return; // 句子音频体积大且带分段请求，交给浏览器自己处理
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/cet6/index.html')))
  );
});
