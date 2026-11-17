// 网络优先：有网时拿最新版本并更新缓存，没网时用缓存
const CACHE = 'cet6-v11';
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
  if (url.pathname.startsWith('/cet6/pack/')) return; // 离线包由页面自己拆开存进发音缓存，这里不再重复缓存
  if (url.pathname.startsWith('/cet6/audio/') && url.pathname.endsWith('.mp3')) { e.respondWith(audio(e.request, url)); return; }
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/cet6/index.html')))
  );
});

// 发音文件：存在独立缓存里（换版本不清空），先用缓存，没有再联网取并存下；
// 播放器会发分段请求（Range），从缓存里切出对应片段返回 206，iPhone 才能正常播放
const AUD = 'c6audio';
async function audio(req, url) {
  const key = url.origin + url.pathname;
  const c = await caches.open(AUD);
  let r = await c.match(key);
  if (!r) {
    r = await fetch(key);
    if (r.status !== 200) return r;
    await c.put(key, r.clone());
  }
  const range = req.headers.get('range');
  if (!range) return r;
  const buf = await r.arrayBuffer(), len = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let s = 0, end = len - 1;
  if (m && m[1]) { s = +m[1]; if (m[2]) end = Math.min(+m[2], len - 1); }
  else if (m && m[2]) s = Math.max(0, len - +m[2]);
  return new Response(buf.slice(s, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${s}-${end}/${len}`, 'Content-Length': String(end - s + 1), 'Accept-Ranges': 'bytes' } });
}
