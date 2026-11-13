// JustLikeMyNative — renk temaları
// Copyright (C) 2026 Berkay Çelik
'use strict';

const Tema = (() => {
  // Kullanıcının özel temada ayarlayabildiği roller
  const ROLLER = [
    ['zemin', 'Sayfa arka planı'],
    ['yuzey', 'Kartlar ve paneller'],
    ['yazi', 'Yazı rengi'],
    ['vurgu', 'Vurgu (düğmeler, seçili)'],
    ['isaret', 'İşaretleme (cümledeki kelime)'],
  ];
  const HAZIR = {
    'Nane': { zemin: '#f6f3ee', yuzey: '#ffffff', yazi: '#1f2328', vurgu: '#2f6f5e', isaret: '#f3d36b' },
    'Kâğıt': { zemin: '#f3eee2', yuzey: '#fffaf0', yazi: '#302e29', vurgu: '#9a7b22', isaret: '#e8d98d' },
    'Sepya': { zemin: '#e9dcc3', yuzey: '#f5ead3', yazi: '#46351f', vurgu: '#9c6b30', isaret: '#e2c27f' },
    'Bulut': { zemin: '#eceff2', yuzey: '#ffffff', yazi: '#25303a', vurgu: '#4f7cac', isaret: '#cfe0f3' },
    'Lavanta': { zemin: '#f1eef6', yuzey: '#ffffff', yazi: '#2b2635', vurgu: '#7357a8', isaret: '#e3d4f7' },
    'Gece': { zemin: '#16181b', yuzey: '#1f2226', yazi: '#e8e6e3', vurgu: '#6cc0a5', isaret: '#8a7a3c' },
    'Gece Mavisi': { zemin: '#141a28', yuzey: '#1d2433', yazi: '#e2e7f1', vurgu: '#7ea2e6', isaret: '#34507f' },
    'Orman': { zemin: '#171d19', yuzey: '#202823', yazi: '#dfe6d8', vurgu: '#8cc276', isaret: '#3d5a37' },
    'Yüksek Kontrast': { zemin: '#000000', yuzey: '#0d0d0d', yazi: '#ffffff', vurgu: '#ffd400', isaret: '#ffd400' },
  };
  const SISTEM = 'Sistem', OZEL = 'Özel';

  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const yap = a => '#' + a.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const karis = (a, b, t) => { const x = hex(a), y = hex(b); return yap(x.map((v, i) => v + (y[i] - v) * t)); };
  const parlak = c => { const [r, g, b] = hex(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const koyuMu = c => parlak(c) < 0.18;

  // Beş temel renkten tüm arayüz değişkenlerini türet
  function turet(t) {
    const { zemin, yuzey, yazi, vurgu, isaret } = t;
    const koyu = koyuMu(yuzey);
    const iyi = koyu ? '#6fcf97' : '#2e7d4f', kotu = koyu ? '#f08a76' : '#b3412f';
    const ogr = koyu ? '#d0913a' : '#e8a54b';
    return {
      '--zemin': zemin, '--yuzey': yuzey, '--yazi': yazi, '--vurgu': vurgu, '--sari': isaret,
      '--yuzey2': karis(yuzey, yazi, koyu ? 0.07 : 0.05),
      '--cizgi': karis(yuzey, yazi, koyu ? 0.17 : 0.13),
      '--soluk': karis(yazi, yuzey, 0.4),
      '--vurgu-yazi': parlak(vurgu) > 0.35 ? '#111111' : '#ffffff',
      '--vurgu-acik': karis(yuzey, vurgu, koyu ? 0.24 : 0.15),
      '--iyi': iyi, '--iyi-acik': karis(yuzey, iyi, koyu ? 0.22 : 0.14),
      '--kotu': kotu, '--kotu-acik': karis(yuzey, kotu, koyu ? 0.22 : 0.13),
      '--d-yeni': karis(yuzey, yazi, koyu ? 0.2 : 0.16), '--d-ogr': ogr,
      '--d-pek': karis(vurgu, yuzey, 0.35), '--d-usta': vurgu,
      'color-scheme': koyu ? 'dark' : 'light',
    };
  }

  function renkler(ad, ozel) {
    if (ad === OZEL) return Object.assign({}, HAZIR['Nane'], ozel || {});
    return HAZIR[ad] || null;
  }
  // Uygula; döndürdüğü değişkenler bir sonraki açılışta erken uygulanmak üzere saklanır
  function uygula(ad, ozel) {
    const kok = document.documentElement.style;
    const eski = [...kok].filter(p => p.startsWith('--') || p === 'color-scheme');
    eski.forEach(p => kok.removeProperty(p));
    const r = renkler(ad, ozel);
    if (!r) return null; // Sistem: stil dosyasındaki açık/koyu varsayılan
    const d = turet(r);
    for (const [k, v] of Object.entries(d)) kok.setProperty(k, v);
    return d;
  }
  // Ayarlar ekranındaki seçim kartı için küçük önizleme
  function ornek(ad, ozel) {
    const r = renkler(ad, ozel);
    if (!r) return `<span class="tema-ornek sistem"><i style="background:#f6f3ee"></i><i style="background:#16181b"></i></span>`;
    return `<span class="tema-ornek" style="background:${r.zemin}">
      <i style="background:${r.yuzey};border-color:${karis(r.yuzey, r.yazi, 0.15)}"><b style="background:${r.yazi}"></b><b style="background:${r.vurgu};width:45%"></b></i>
      <s style="background:${r.vurgu}"></s><s style="background:${r.isaret}"></s></span>`;
  }
  return { ROLLER, HAZIR, SISTEM, OZEL, uygula, ornek, renkler };
})();
