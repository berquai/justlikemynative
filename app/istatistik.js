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
function cubukGrafik(veri, { yukseklik = 150, etiketAralik = 1, birim = '', ustSinir = 0 } = {}) {
  // veri: [{etiket, deger, ipucu}]; ustSinir: eksenin sabit üst değeri (ör. yüzde için 100)
  const max = Math.max(1, ...veri.map(x => x.deger));
  const adim = Math.pow(10, Math.floor(Math.log10(max)));
  const ust = ustSinir || Math.ceil(max / adim) * adim;
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

/* ---------- Öğrenme takvimi: hangi gün çalışıldı, kaç yeni kelime, tekrarlar bitti mi ---------- */
const Takvim = (() => {
  let ay = null; // 'YYYY-MM'
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  function plan() { // ileri tarihlerdeki tekrar sayıları
    const m = {};
    for (const [id, w] of Object.entries(P.w)) if (KID.has(id) && !w.seref) for (const v of Object.values(w.m)) if (v.d !== MEZUN) m[v.d] = (m[v.d] || 0) + 1;
    return m;
  }
  function html() {
    const t = bugun();
    ay ||= t.slice(0, 7);
    const [y, mo] = ay.split('-').map(Number);
    const ilk = `${ay}-01`, gunSayisi = new Date(y, mo, 0).getDate();
    const bosluk = (new Date(y, mo - 1, 1).getDay() + 6) % 7; // pazartesiden başlar
    const pl = plan();
    let calisilan = 0, yeni = 0, cevap = 0, tamam = 0;
    const hucreler = [];
    for (let i = 0; i < bosluk; i++) hucreler.push('<div class="tk-gun bos"></div>');
    for (let n = 1; n <= gunSayisi; n++) {
      const d = gunEkle(ilk, n - 1), g = P.gun[d] || {}, r = g.r || 0, yk = g.n || 0;
      const tarih = new Date(d + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      let s = 0, ipucu, isaret = '';
      if (d > t) {
        const p = pl[d] || 0;
        ipucu = `${tarih}: ${p ? `${p} tekrar alıştırması planlı` : 'planlı tekrar yok'}`;
        if (p) isaret = `<small class="tk-plan">${p}</small>`;
      } else {
        if (r || yk) { calisilan++; yeni += yk; cevap += r; }
        s = !r && !yk ? 0 : r < 15 ? 1 : r < 40 ? 2 : r < 80 ? 3 : 4;
        const bitti = r > 0 && g.kalan === 0, kaldi = r > 0 && g.kalan > 0;
        if (bitti) tamam++;
        ipucu = !r && !yk ? `${tarih}: çalışılmadı`
          : `${tarih}: ${r} cevap${r ? `, %${Math.round(100 * (g.ok || 0) / r)} doğru` : ''}${yk ? `, ${yk} yeni kelime` : ''}${bitti ? ' · tekrarlar tamamlandı' : kaldi ? ` · ${g.kalan} tekrar kaldı` : ''}`;
        isaret = (yk ? `<small class="tk-yeni">+${yk}</small>` : '') + (bitti ? '<i class="tk-tamam" aria-hidden="true">✓</i>' : kaldi ? '<i class="tk-kaldi" aria-hidden="true"></i>' : '');
      }
      hucreler.push(`<div class="tk-gun s${s}${d === t ? ' bugun' : ''}${d > t ? ' gelecek' : ''}" data-ipucu="${esc(ipucu)}" tabindex="0"><span>${n}</span>${isaret}</div>`);
    }
    const ozet = calisilan
      ? `${AYLAR[mo - 1]} ayında <b>${calisilan} gün</b> çalıştın, <b>${yeni}</b> yeni kelimeyle tanıştın ve <b>${cevap.toLocaleString('tr-TR')}</b> cevap verdin.${tamam ? ` <b>${tamam} gün</b> tekrarlarının tamamını bitirdin.` : ''}`
      : `${AYLAR[mo - 1]} ayında henüz çalışma kaydın yok.`;
    return `<div class="tk-ust">
        <button class="btn kucuk-btn" data-tk="-1" aria-label="Önceki ay">‹</button>
        <b>${AYLAR[mo - 1]} ${y}</b>
        <button class="btn kucuk-btn" data-tk="1" aria-label="Sonraki ay">›</button>
      </div>
      <div class="tk-izgara">${['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(x => `<div class="tk-baslik">${x}</div>`).join('')}${hucreler.join('')}</div>
      <p class="tk-ozet">${ozet}</p>
      <div class="tk-aciklama"><span><i class="tk-ornek s1"></i><i class="tk-ornek s2"></i><i class="tk-ornek s4"></i> daha koyu: daha çok cevap</span>
        <span><small class="tk-yeni">+5</small> yeni kelime</span><span><i class="tk-tamam">✓</i> tekrarlar tamamlandı</span>
        <span><i class="tk-kaldi"></i> tekrar kaldı</span><span><small class="tk-plan">12</small> planlı tekrar</span></div>`;
  }
  function bagla(kap) {
    kap.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => {
      const [y, m] = ay.split('-').map(Number), x = new Date(y, m - 1 + +b.dataset.tk, 1);
      ay = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
      kap.innerHTML = html(); bagla(kap);
    });
  }
  return { html, bagla };
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

  // Gelişim: son 7 gün ile önceki 7 günün karşılaştırması
  const donem = bas => {
    const o = { r: 0, ok: 0, n: 0, gun: 0 };
    for (let i = 0; i < 7; i++) { const g = P.gun[gunEkle(t, -bas - i)]; if (!g) continue; o.r += g.r || 0; o.ok += g.ok || 0; o.n += g.n || 0; if (g.r || g.n) o.gun++; }
    o.oran = o.r ? Math.round(100 * o.ok / o.r) : null;
    return o;
  };
  const bu = donem(0), once = donem(7);
  const fark = (a, b, birim = '') => {
    if (a == null || b == null) return '<small class="fark">–</small>';
    const f = a - b;
    return `<small class="fark ${f > 0 ? 'artis' : f < 0 ? 'dusus' : ''}">${f > 0 ? '▲' : f < 0 ? '▼' : '='} ${f ? Math.abs(f) + birim : 'aynı'} <span class="soluk">önceki 7 güne göre</span></small>`;
  };
  const karsi = (deger, ad, f) => `<div class="stat"><b>${deger}</b><span>${ad}</span>${f}</div>`;
  let yorum;
  if (!bu.r && !bu.n) yorum = 'Son 7 günde çalışma kaydın yok. Kısa bir oturumla seriyi yeniden başlatabilirsin.';
  else {
    const p = [];
    if (once.r) p.push(bu.r >= once.r ? `önceki haftaya göre <b>${bu.r - once.r} daha fazla</b> cevap verdin` : `önceki haftadan <b>${once.r - bu.r} daha az</b> cevap verdin`);
    if (bu.oran != null && once.oran != null) p.push(bu.oran > once.oran ? `doğruluğun <b>${bu.oran - once.oran} puan arttı</b>` : bu.oran < once.oran ? `doğruluğun ${once.oran - bu.oran} puan düştü; zorlandığın kelimelere göz atmak iyi gelebilir` : 'doğruluğun aynı kaldı');
    yorum = p.length ? `Son 7 günde ${p.join(', ')}.` : `Son 7 günde ${bu.r} cevap verdin ve ${bu.n} yeni kelimeyle tanıştın. Gelişimini görmek için önümüzdeki hafta da devam et.`;
  }
  // Haftalık doğruluk (son 12 hafta)
  const dogrulukHafta = [];
  for (let i = 11; i >= 0; i--) {
    let r = 0, ok = 0; const bas = gunEkle(t, -7 * i - 6);
    for (let j = 0; j < 7; j++) { const g = P.gun[gunEkle(bas, j)]; r += g?.r || 0; ok += g?.ok || 0; }
    const o = r ? Math.round(100 * ok / r) : 0;
    dogrulukHafta.push({ etiket: tarihKisa(bas), deger: o, ipucu: `${tarihKisa(bas)} haftası: ${r ? `%${o} doğru (${r} cevap)` : 'çalışma yok'}` });
  }
  // Kelime dağarcığının büyümesi: son 30 günde toplam tanışılan kelime
  const tanisGunleri = Object.entries(P.w).filter(([id]) => KID.has(id)).map(([, w]) => w.i).sort();
  const birikim = [];
  for (let i = 29, j = 0; i >= 0; i--) {
    const d = gunEkle(t, -i);
    while (j < tanisGunleri.length && tanisGunleri[j] <= d) j++;
    birikim.push({ etiket: new Date(d + 'T12:00').getDate(), deger: j, ipucu: `${tarihKisa(d)}: toplam ${j} kelime` });
  }
  const aciklama = m => `<p class="grafik-aciklama">${m}</p>`;

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

  <section class="panel">
    <h2>Gelişimin</h2>
    <p class="gelisim-yorum">${yorum}</p>
    <div class="stat-izgara">
      ${karsi(sayi(bu.r), 'son 7 günde cevap', fark(bu.r, once.r))}
      ${karsi(bu.oran == null ? '–' : '%' + bu.oran, 'doğruluk', fark(bu.oran, once.r ? once.oran : null, ' puan'))}
      ${karsi(sayi(bu.n), 'yeni kelime', fark(bu.n, once.n))}
      ${karsi(`${bu.gun}/7`, 'çalışılan gün', fark(bu.gun, once.gun, ' gün'))}
    </div>
    <div class="iki-grafik">
      <div>
        <h3>Haftalık doğruluk</h3>
        ${cubukGrafik(dogrulukHafta, { etiketAralik: 3, yukseklik: 120, birim: '%', ustSinir: 100 })}
        ${aciklama('Her çubuk, bir haftada verdiğin cevapların yüzde kaçının doğru olduğunu gösterir. Çubuklar yükseliyorsa kelimeleri daha iyi hatırlıyorsun.')}
      </div>
      <div>
        <h3>Kelime dağarcığın</h3>
        ${cubukGrafik(birikim, { etiketAralik: 5, yukseklik: 120 })}
        ${aciklama('Son 30 günde tanıştığın toplam kelime sayısı. Her gün biraz yükselmesi, düzenli ilerlediğin anlamına gelir.')}
      </div>
    </div>
  </section>

  <section class="panel">
    <h2>Öğrenme takvimi</h2>
    <p class="soluk kucuk">Hangi gün çalıştığını, kaç yeni kelimeyle tanıştığını ve o günün tekrarlarını bitirip bitirmediğini gösterir. İleri tarihlerde planlı tekrar sayısı görünür. Ayrıntı için bir güne dokun.</p>
    <div id="takvim">${Takvim.html()}</div>
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
    ${aciklama('Her çubuk bir günde verdiğin cevap sayısıdır; boşluklar çalışmadığın günlerdir. Birbirine yakın boyda, kesintisiz çubuklar en sağlıklı tempodur: haftada bir uzun oturumdan çok, her gün kısa çalışmak kalıcıdır.')}
  </section>
  <section class="iki">
    <div class="panel">
      <h2>Haftalık yeni kelime</h2>
      ${cubukGrafik(hafta, { etiketAralik: 3, yukseklik: 120 })}
      ${aciklama('Her hafta kaç yeni kelimeyle tanıştığın. Tekrarlar birikince uygulama yeni kelimeleri kendiliğinden azaltır; bu yüzden bazı haftalar daha kısa olabilir.')}
    </div>
    <div class="panel">
      <h2>Alıştırmaların tekrar aralıkları</h2>
      ${cubukGrafik(kutular, { yukseklik: 120 })}
      ${aciklama('Alıştırmalarının şu an hangi tekrar aralığında olduğu. Çubuklar sağa, yani uzun aralıklara kaydıkça kelimeler kalıcı hafızana yerleşiyor demektir.')}
    </div>
  </section>
  <section class="panel">
    <h2>Önümüzdeki 30 gün — tekrar yükü</h2>
    ${cubukGrafik(yuk, { etiketAralik: 3, yukseklik: 120 })}
    ${aciklama('Hangi gün kaç tekrarın seni beklediği. Yüksek bir gün yaklaşıyorsa Ayarlar\'dan günlük yeni kelime sayısını biraz azaltmak yükü dengeler.')}
  </section>
  <section class="panel">
    <h2>En çok zorlandığın kelimeler</h2>
    <p class="soluk kucuk">Yanlış yaptığın kelimeyi sonra üst üste ${ZOR_CIKIS} kez doğru cevaplarsan artık zorlanmadığın kabul edilir ve listeden çıkar. Yeniden yanlış yaparsan geri gelir.</p>
    ${zorlar.length ? `<ol class="zor-liste">${zorlar.map(([id, w]) => `<li><button class="link" data-detay="${esc(id)}">${esc(KID.get(id).w)}</button> <span class="soluk">— ${esc(KID.get(id).tr)}</span> <span class="etiket">${w.x} yanlış</span>${w.ds ? ` <span class="etiket vurgu">${w.ds}/${ZOR_CIKIS} doğru</span>` : ''}</li>`).join('')}</ol>`
      : '<p class="soluk">Şu an zorlandığın bir kelime yok.</p>'}
  </section>`;
  document.querySelectorAll('[data-detay]').forEach(b => b.onclick = () => kelimeDetay(b.dataset.detay));
  Takvim.bagla($('#takvim'));
}
