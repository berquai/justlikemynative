// AnadilimGibi — İstatistikler
// Copyright (C) 2026 Berkay Çelik
'use strict';

const Istat = (() => {
  // Çalışılan günlerden mevcut ve en uzun seri
  function seri() {
    const t = bugun();
    const gunler = Object.keys(P.gun).filter(d => P.gun[d].r > 0).sort();
    let simdiki = 0;
    for (let d = (P.gun[t]?.r ? t : gunEkle(t, -1)); P.gun[d]?.r; d = gunEkle(d, -1)) simdiki++;
    let enUzun = 0, uz = 0, onceki = null;
    for (const d of gunler) { uz = onceki && gunEkle(onceki, 1) === d ? uz + 1 : 1; enUzun = Math.max(enUzun, uz); onceki = d; }
    return { simdiki, enUzun, gunSayisi: gunler.length };
  }
  // Tüm sayaçlar tek seferde (rozetler de bunu kullanır)
  function ozet() {
    const say = { yeni: 0, ogreniliyor: 0, pekisti: 0, usta: 0, seref: 0 };
    K.forEach(k => say[durum(k.id)]++);
    let cevap = 0, dogru = 0, kusursuz = 0, gece = 0, sabah = 0, maxGun = 0, haftaSonu = 0;
    const mod = { r: { n: 0, ok: 0 }, c: { n: 0, ok: 0 }, p: { n: 0, ok: 0 } };
    for (const [d, g] of Object.entries(P.gun)) {
      cevap += g.r || 0; dogru += g.ok || 0; maxGun = Math.max(maxGun, g.r || 0);
      if (g.r >= 20 && g.ok === g.r) kusursuz++;
      if (g.gece) gece++;
      if (g.sabah) sabah++;
      for (const m of ['r', 'c', 'p']) if (g.m?.[m]) { mod[m].n += g.m[m].n; mod[m].ok += g.m[m].ok; }
      if (new Date(d + 'T12:00').getDay() === 6 && g.r && P.gun[gunEkle(d, 1)]?.r) haftaSonu++;
    }
    const tanisilan = Object.keys(P.w).filter(id => KID.has(id)).length;
    const ekle = Object.values(P.sozluk).filter(v => v && v.kaynak === 'ekle' && !v.silindi).length;
    const duzen = Object.entries(P.sozluk).filter(([, v]) => v && v.kaynak !== 'ekle' && !v.silindi).length;
    const silinen = Object.values(P.sozluk).filter(v => v === null || (v && v.silindi)).length;
    return {
      toplam: K.length, excel: K.length - ekle, ekle, duzen, silinen, tanisilan, say,
      pekisenToplam: say.pekisti + say.usta + say.seref, ustaToplam: say.usta + say.seref,
      cevap, dogru, kusursuz, gece, sabah, maxGun, haftaSonu, mod, seri: seri(),
      kagitUret: P.kagitNo || 0, kagitNot: P.kagit.filter(s => s.notlandi).length,
      adam: P.oyun.adam?.kazan || 0, harf: P.oyun.harf?.dogru || 0, esles: P.oyun.esles?.tam || 0,
    };
  }
  return { seri, ozet };
})();

/* ---------- Grafik yardımcıları: tek seri, ince çubuk, üzerine gelince değer ---------- */
function cubukGrafik(veri, { yukseklik = 150, etiketAralik = 1, birim = '' } = {}) {
  // veri: [{etiket, deger, ipucu}]
  const max = Math.max(1, ...veri.map(x => x.deger));
  const adim = Math.pow(10, Math.floor(Math.log10(max)));
  const ust = Math.ceil(max / adim) * adim;
  return `<div class="grafik" style="--y:${yukseklik}px">
    <div class="g-eksen"><span>${ust.toLocaleString('tr-TR')}${birim}</span><span>${Math.round(ust / 2).toLocaleString('tr-TR')}</span><span>0</span></div>
    <div class="g-alan">
      <div class="g-izgara"><i></i><i></i><i></i></div>
      <div class="g-cubuklar">${veri.map((x, i) => `<div class="g-sutun" data-ipucu="${esc(x.ipucu)}" tabindex="0">
        <span class="g-kap"><span class="g-cubuk" style="height:${x.deger ? Math.max(2, 100 * x.deger / ust) : 0}%"></span></span>
        <small>${i % etiketAralik === 0 ? esc(x.etiket) : ''}</small></div>`).join('')}</div>
    </div></div>`;
}
// Tek bir ipucu kutusu tüm grafikler için
(() => {
  let kutu = null;
  const goster = el => {
    kutu ||= Object.assign(document.createElement('div'), { className: 'ipucu-kutu', role: 'tooltip' });
    if (!kutu.isConnected) document.body.appendChild(kutu);
    kutu.textContent = el.dataset.ipucu;
    const r = el.getBoundingClientRect();
    kutu.style.display = 'block';
    const g = kutu.offsetWidth;
    kutu.style.left = Math.min(window.innerWidth - g - 8, Math.max(8, r.left + r.width / 2 - g / 2)) + 'px';
    kutu.style.top = (r.top + window.scrollY - kutu.offsetHeight - 8) + 'px';
  };
  const gizle = () => { if (kutu) kutu.style.display = 'none'; };
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-ipucu]'); el ? goster(el) : gizle(); });
  document.addEventListener('focusin', e => { const el = e.target.closest('[data-ipucu]'); el ? goster(el) : gizle(); });
  window.addEventListener('scroll', gizle, { passive: true });
})();

function ekranIstatistik() {
  const S = Istat.ozet(), t = bugun();
  const yuzde = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const sayi = n => n.toLocaleString('tr-TR');
  const tarihKisa = d => new Date(d + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  // Son 30 gün
  const son30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = gunEkle(t, -i), g = P.gun[d] || {};
    son30.push({ etiket: new Date(d + 'T12:00').getDate(), deger: g.r || 0,
      ipucu: `${tarihKisa(d)}: ${g.r || 0} cevap${g.r ? `, %${Math.round(100 * g.ok / g.r)} doğru` : ''}${g.n ? `, ${g.n} yeni kelime` : ''}` });
  }
  // Kutulara göre alıştırma dağılımı
  const kutular = ARALIK.map((a, i) => ({ etiket: i === 0 ? 'yeni' : `${a}g`, deger: 0 }));
  let mezun = 0;
  for (const [id, w] of Object.entries(P.w)) {
    if (!KID.has(id)) continue;
    for (const v of Object.values(w.m)) v.d === MEZUN ? mezun++ : kutular[v.b].deger++;
  }
  kutular.push({ etiket: 'mezun', deger: mezun });
  kutular.forEach((x, i) => x.ipucu = `${i === 0 ? 'Henüz ilk aralıkta' : i < ARALIK.length ? `${ARALIK[i]} günlük aralıkta` : 'Mezun (360 gün sonra da bilindi)'}: ${x.deger} alıştırma`);
  // Önümüzdeki 30 gün
  const yuk = [];
  for (let i = 1; i <= 30; i++) {
    const d = gunEkle(t, i);
    let n = 0; for (const [id, w] of Object.entries(P.w)) if (KID.has(id) && !w.seref) for (const v of Object.values(w.m)) if (v.d === d) n++;
    yuk.push({ etiket: new Date(d + 'T12:00').getDate(), deger: n, ipucu: `${tarihKisa(d)}: ${n} tekrar alıştırması` });
  }
  // Haftalık yeni kelime (son 12 hafta)
  const hafta = [];
  for (let i = 11; i >= 0; i--) {
    let n = 0; const bas = gunEkle(t, -7 * i - 6);
    for (let j = 0; j < 7; j++) n += P.gun[gunEkle(bas, j)]?.n || 0;
    hafta.push({ etiket: tarihKisa(bas), deger: n, ipucu: `${tarihKisa(bas)} haftası: ${n} yeni kelime` });
  }
  // Tahmin
  const son14 = Array.from({ length: 14 }, (_, i) => P.gun[gunEkle(t, -i)]?.n || 0);
  const hiz = son14.reduce((a, b) => a + b, 0) / 14 || P.ayar.gunluk;
  const kalan = S.say.yeni;
  const bitis = hiz > 0 ? gunEkle(t, Math.ceil(kalan / hiz)) : null;
  // Yanlış yapılan kelime, ardından üst üste ZOR_CIKIS kez doğru cevaplanınca listeden çıkar
  const zorlar = Object.entries(P.w).filter(([id, w]) => KID.has(id) && w.x > 0 && (w.ds || 0) < ZOR_CIKIS).sort((a, b) => b[1].x - a[1].x).slice(0, 10);

  const kart = (deger, ad, alt = '') => `<div class="stat"><b>${deger}</b><span>${ad}</span>${alt ? `<small>${alt}</small>` : ''}</div>`;
  const metre = (ad, m) => `<div class="metre"><span>${ad}</span><div class="metre-cubuk" data-ipucu="${ad}: ${m.ok}/${m.n} doğru"><i style="width:${m.n ? 100 * m.ok / m.n : 0}%"></i></div><b>${yuzde(m.ok, m.n)}</b></div>`;

  ana().innerHTML = `
  <section class="panel">
    <h1>İstatistikler</h1>
    <div class="stat-izgara buyuk">
      ${kart(sayi(S.toplam), 'toplam kelime', `${sayi(S.excel)} hazır listeden · ${sayi(S.ekle)} eklediğin`)}
      ${kart(sayi(S.tanisilan), 'tanıştığın kelime', yuzde(S.tanisilan, S.toplam) + ' listenin')}
      ${kart(sayi(S.pekisenToplam), 'pekişen kelime', `${sayi(S.ustaToplam)} ustalaşan`)}
      ${kart(sayi(S.say.seref), 'Şeref Tribünü\'nde', 'bir yıl sonra da hatırlanan')}
    </div>
  </section>

  <section class="iki">
    <div class="panel">
      <h2>Öğrenme durumu</h2>
      <div class="durum-cubuk">${['seref', 'usta', 'pekisti', 'ogreniliyor', 'yeni'].map(d => `<span class="d-${d}" style="flex:${S.say[d] || 0.0001}" data-ipucu="${DURUM_AD[d]}: ${sayi(S.say[d])}"></span>`).join('')}</div>
      <table class="tablo kucuk-tablo"><tbody>
        ${['yeni', 'ogreniliyor', 'pekisti', 'usta', 'seref'].map(d => `<tr><td><i class="nokta d-${d}"></i> ${DURUM_AD[d]}</td><td class="sag">${sayi(S.say[d])}</td><td class="sag soluk">${yuzde(S.say[d], S.toplam)}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="panel">
      <h2>Sözlük</h2>
      <table class="tablo kucuk-tablo"><tbody>
        <tr><td>Excel listesinden</td><td class="sag">${sayi(S.excel)}</td></tr>
        <tr><td>Senin eklediğin</td><td class="sag">${sayi(S.ekle)}</td></tr>
        <tr><td>Düzenlediğin</td><td class="sag">${sayi(S.duzen)}</td></tr>
        <tr><td>Sildiğin</td><td class="sag">${sayi(S.silinen)}</td></tr>
        <tr><td><b>Toplam</b></td><td class="sag"><b>${sayi(S.toplam)}</b></td></tr>
      </tbody></table>
      <p class="soluk kucuk">${kalan ? `Bu hızla (günde ~${hiz.toFixed(1).replace('.', ',')} yeni kelime) kalan <b>${sayi(kalan)}</b> kelimeyle <b>${new Date(bitis + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</b> civarında tanışmış olursun.` : 'Listedeki tüm kelimelerle tanıştın!'}</p>
    </div>
  </section>

  <section class="panel">
    <h2>Çalışma</h2>
    <div class="stat-izgara">
      ${kart(sayi(S.cevap), 'toplam cevap')}
      ${kart(yuzde(S.dogru, S.cevap), 'doğruluk')}
      ${kart(sayi(S.seri.gunSayisi), 'çalışılan gün')}
      ${kart(S.seri.simdiki + ' 🔥', 'mevcut seri', `en uzun: ${S.seri.enUzun} gün`)}
      ${kart(S.seri.gunSayisi ? Math.round(S.cevap / S.seri.gunSayisi) : 0, 'günlük ort. cevap')}
      ${kart(sayi(S.kusursuz), 'kusursuz gün', '≥20 cevap, hepsi doğru')}
      ${kart(`${S.kagitNot}/${S.kagitUret}`, 'Yazdır-Çöz', 'sonucu girilen / üretilen bulmaca')}
      ${kart(`${S.adam} · ${S.harf} · ${S.esles}`, 'oyun', 'açan çiçek · karışık harf · kusursuz eşleştirme')}
    </div>
    <h3>Yönlere göre doğruluk</h3>
    ${S.mod.r.n + S.mod.c.n + S.mod.p.n ? `<div class="metreler">${metre('Anlama (İng → Tr)', S.mod.r)}${metre('Bağlam (boşluklu cümle)', S.mod.c)}${metre('Üretme (Tr/tanım → İng)', S.mod.p)}</div>`
      : '<p class="soluk kucuk">Bu ölçüm yeni eklendi; çalıştıkça dolacak.</p>'}
  </section>

  <section class="panel">
    <h2>Son 30 gün — günlük cevap sayısı</h2>
    ${cubukGrafik(son30, { etiketAralik: 3 })}
  </section>
  <section class="iki">
    <div class="panel">
      <h2>Haftalık yeni kelime</h2>
      ${cubukGrafik(hafta, { etiketAralik: 3, yukseklik: 120 })}
    </div>
    <div class="panel">
      <h2>Alıştırmaların tekrar aralıkları</h2>
      ${cubukGrafik(kutular, { yukseklik: 120 })}
    </div>
  </section>
  <section class="panel">
    <h2>Önümüzdeki 30 gün — tekrar yükü</h2>
    ${cubukGrafik(yuk, { etiketAralik: 3, yukseklik: 120 })}
  </section>
  <section class="panel">
    <h2>En çok zorlandığın kelimeler</h2>
    <p class="soluk kucuk">Yanlış yaptığın kelimeyi sonra üst üste ${ZOR_CIKIS} kez doğru cevaplarsan artık zorlanmadığın kabul edilir ve listeden çıkar. Yeniden yanlış yaparsan geri gelir.</p>
    ${zorlar.length ? `<ol class="zor-liste">${zorlar.map(([id, w]) => `<li><button class="link" data-detay="${esc(id)}">${esc(KID.get(id).w)}</button> <span class="soluk">— ${esc(KID.get(id).tr)}</span> <span class="etiket">${w.x} yanlış</span>${w.ds ? ` <span class="etiket vurgu">${w.ds}/${ZOR_CIKIS} doğru</span>` : ''}</li>`).join('')}</ol>`
      : '<p class="soluk">Şu an zorlandığın bir kelime yok.</p>'}
  </section>`;
  document.querySelectorAll('[data-detay]').forEach(b => b.onclick = () => kelimeDetay(b.dataset.detay));
}
