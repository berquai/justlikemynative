// JustLikeMyNative — çevrimdışı çalışma için önbellek
// Önce önbellekten açar (hızlı ve internetsiz), arka planda yenisini indirip bir sonraki açılışta kullanır.
const ONBELLEK = 'jlmn-v1';
const DOSYALAR = ['./', 'index.html', 'JustLikeMyNative.html', 'manifest.webmanifest', 'app/stil.css', 'app/ikon.svg',
  'app/kelimeler.js', 'app/bulmaca.js', 'app/tema.js', 'app/sozluk.js', 'app/istatistik.js', 'app/madalya.js',
  'app/basari.js', 'app/bulut.js', 'app/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== ONBELLEK).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google / GitHub isteklerine dokunma
  e.respondWith(caches.open(ONBELLEK).then(async c => {
    const anahtar = new Request(u.origin + u.pathname); // #... ve ?... farkını yok say
    const eski = await c.match(anahtar);
    const yeni = fetch(e.request).then(r => { if (r.ok) c.put(anahtar, r.clone()); return r; }).catch(() => eski);
    if (eski) { e.waitUntil(yeni); return eski; }
    return yeni;
  }));
});
