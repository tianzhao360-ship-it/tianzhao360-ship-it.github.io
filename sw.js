// 网络优先：有网时拿最新版本并更新缓存，没网时用缓存，保证离线也能打开记账
const CACHE = 'sr-v6';
const FILES = ['/', '/index.html', '/manifest.webmanifest', '/icon-180.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // 同一个网站上还有 /mama/、/english/、/cet6/ 等独立 App：只清理自己的 sr- 缓存
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sr-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 只接管根目录下自己的文件，子文件夹里的其他 App 交给浏览器和它们自己的缓存
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.indexOf('/', 1) !== -1) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
