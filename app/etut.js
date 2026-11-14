// AnadilimGibi — Etüt Köşesi, karne, dikte, gölgeleme ve konuşma kontrolü
// Copyright (C) 2026 Berkay Çelik
'use strict';

/* ================= Cümle karşılaştırma (dikte ve konuşma için hoşgörülü) ================= */
const Cumle = (() => {
  const SAYI = { '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' };
  // Büyük/küçük harf, noktalama ve kesme işareti farkları hata sayılmaz
  const kelimeler = s => String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^a-z0-9' -]/g, ' ')
    .split(/[\s-]+/).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean).map(w => SAYI[w] || w);
  const esit = (a, b) => a === b || a.replace(/'/g, '') === b.replace(/'/g, '') || (a.length > 4 && Metin.lev(a, b) <= 1);
  // En uzun ortak alt dizi ile hizalama
  function karsilastir(hedef, girdi) {
    const h = kelimeler(hedef), g = kelimeler(girdi);
    const L = Array.from({ length: h.length + 1 }, () => new Array(g.length + 1).fill(0));
    for (let i = h.length - 1; i >= 0; i--) for (let j = g.length - 1; j >= 0; j--)
      L[i][j] = esit(h[i], g[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const hOk = new Array(h.length).fill(false), gOk = new Array(g.length).fill(false);
    let i = 0, j = 0;
    while (i < h.length && j < g.length) {
      if (esit(h[i], g[j])) { hOk[i] = gOk[j] = true; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    const dogruSay = hOk.filter(Boolean).length;
    return { h, g, hOk, gOk, oran: h.length ? dogruSay / h.length : 0, fazla: gOk.filter(x => !x).length };
  }
  // Hedef cümleyi kelime kelime işaretle (eksik/yanlış kelimeler vurgulanır)
  function isaretle(hedef, sonuc) {
    const parca = String(hedef).split(/(\s+)/);
    let k = 0;
    return parca.map(p => {
      if (!p.trim()) return p;
      const sade = kelimeler(p);
      if (!sade.length) return esc(p);
      let ok = true;
      for (let n = 0; n < sade.length; n++) ok = ok && sonuc.hOk[k++];
      return ok ? `<span class="dk-ok">${esc(p)}</span>` : `<span class="dk-yanlis">${esc(p)}</span>`;
    }).join('');
  }
  function girdiIsaretle(sonuc) {
    return sonuc.g.map((w, i) => sonuc.gOk[i] ? esc(w) : `<s class="dk-fazla">${esc(w)}</s>`).join(' ');
  }
  return { kelimeler, karsilastir, isaretle, girdiIsaretle };
})();

/* ================= Konuşma tanıma (Web Speech API) ================= */
const Konusma = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const destek = !!SR;
  const BILGI = 'kelimeBulmaca.mikrofonBilgi';
  const not = () => destek
    ? 'En iyi sonuç için Chrome tarayıcısını kullan.'
    : 'Konuşma kontrolü bu tarayıcıda desteklenmiyor. En iyi sonuç için Chrome kullan.';
  // Mikrofon izni istenmeden önce bir kez kısa bilgilendirme
  function bilgilendir() {
    let goruldu = false;
    try { goruldu = !!localStorage.getItem(BILGI); } catch (e) { }
    if (goruldu) return Promise.resolve(true);
    return new Promise(ok => {
      const m = modal(`<h2>🎤 Konuşma kontrolü</h2>
        <p>Söylediğini kontrol edebilmek için tarayıcın şimdi <b>mikrofon izni</b> isteyecek.</p>
        <p class="soluk">Chrome gibi tarayıcılarda ses, yazıya çevrilmek için tarayıcı sağlayıcısının (örneğin Google'ın) sunucularına gönderilebilir.
          Ses kaydın AnadilimGibi tarafından saklanmaz. Ayrıntılar: <a href="gizlilik.html" target="_blank">Gizlilik Politikası</a>.</p>
        <div class="butonlar"><button class="ana-btn" id="mikTamam">Anladım, devam et</button><button class="btn" data-kapat>Vazgeç</button></div>`);
      m.el.querySelector('#mikTamam').onclick = () => { try { localStorage.setItem(BILGI, '1'); } catch (e) { } m.kapat(); ok(true); };
      m.el.querySelectorAll('[data-kapat]').forEach(b => b.addEventListener('click', () => ok(false)));
    });
  }
  // Bir cümle dinler; en iyi eşleşen alternatifi döndürür
  function dinle(hedef) {
    return new Promise((ok, hata) => {
      const r = new SR();
      r.lang = /en-US/i.test(P.ayar.ses) ? 'en-US' : 'en-GB';
      r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
      let sonuc = null;
      r.onresult = e => {
        const alt = [...e.results[0]].map(a => a.transcript);
        sonuc = alt.map(a => ({ a, s: Cumle.karsilastir(hedef, a) })).sort((x, y) => y.s.oran - x.s.oran)[0]?.a || alt[0] || '';
      };
      r.onerror = e => hata(new Error(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Mikrofon izni verilmedi. Tarayıcının adres çubuğundaki kilit simgesinden izin verebilirsin.'
        : e.error === 'no-speech' ? 'Ses algılanamadı. Biraz daha yüksek sesle tekrar dene.' : 'Konuşma tanınamadı (' + e.error + ').'));
      let hataVar = false;
      const eskiHata = r.onerror; r.onerror = e => { hataVar = true; eskiHata(e); };
      r.onend = () => { if (!hataVar) ok(sonuc ?? ''); };
      try { r.start(); } catch (e) { hata(e); }
      setTimeout(() => { try { r.stop(); } catch (e) { } }, 15000);
    });
  }
  return { destek, not, bilgilendir, dinle };
})();

/* ================= Karne ================= */
const Karne = (() => {
  const TUR = { r: 'Anlama', c: 'Bağlam', p: 'Üretme', dikte: 'Dikte', golge: 'Gölgeleme', yds: 'YDS tarzı' };
  function html(kayit, { baslik = 'Karne', sure = '' } = {}) {
    if (!kayit || !kayit.length) return '';
    const d = kayit.filter(x => x.dogru).length, y = kayit.length - d;
    const yuzde = Math.round(100 * d / kayit.length);
    const satir = x => {
      const k = KID.get(x.id);
      return `<li class="${x.dogru ? 'k-dogru' : 'k-yanlis'}">
        <div class="kr-ust"><b>${esc(k ? k.w : (x.baslik || x.id))}</b> ${k ? sesBtn(k.w) : ''} <span class="etiket">${TUR[x.m] || ''}</span>${k ? `<span class="soluk">— ${esc(k.tr)}</span>` : ''}</div>
        ${x.dogru ? '' : `<div class="kr-cevap"><span>Senin cevabın: <s>${esc(x.verilen || '(boş)')}</s></span><span>Doğrusu: <b>${esc(x.dogruCevap || (k && k.w) || '')}</b></span></div>`}
      </li>`;
    };
    const yanlislar = kayit.filter(x => !x.dogru), dogrular = kayit.filter(x => x.dogru);
    return `<div class="karne">
      <div class="karne-ust"><h2>${baslik}</h2>${sure ? `<span class="soluk">${sure}</span>` : ''}</div>
      <div class="karne-ozet">
        <div><b>${kayit.length}</b><span>soru</span></div>
        <div class="iyi-yazi"><b>${d}</b><span>doğru</span></div>
        <div class="kotu-yazi"><b>${y}</b><span>yanlış</span></div>
        <div><b>%${yuzde}</b><span>başarı</span></div>
      </div>
      ${yanlislar.length ? `<h3>Yanlışların ve doğruları</h3><ul class="karne-liste">${yanlislar.map(satir).join('')}</ul>`
        : '<p class="bilgi">Hiç yanlışın yok, harika! 🎉</p>'}
      ${dogrular.length ? `<details class="karne-dogrular"><summary>Doğru cevapladıkların (${dogrular.length})</summary><ul class="karne-liste">${dogrular.map(satir).join('')}</ul></details>` : ''}
    </div>`;
  }
  function bagla() { /* ses düğmeleri genel tıklama işleyicisiyle çalışır */ }
  return { html, bagla };
})();

/* ================= Etüt Köşesi ================= */
const ETUT_SURE = [10, 20, 30, 45, 60];
const ETUT_TUR = {
  karisik: { ad: 'Karışık alıştırma', acik: 'Anlama, bağlam ve üretme alıştırmaları karışık sırayla.' },
  dikte: { ad: 'Dikte', acik: 'Cümleyi dinle, duyduğunu yaz.' },
  golge: { ad: 'Gölgeleme', acik: 'Cümleyi dinle, aynı ritimle tekrar et.' },
  yds: { ad: 'YDS / YÖKDİL tarzı', acik: 'Kelime boşluğu, bağlaç ve edat seçimi, cümle tamamlama; beş seçenekli özgün sorular.' },
};
const ETUT_KAYNAK = { tanis: 'Tanıştığım kelimeler', zor: 'En çok zorlandıklarım', hepsi: 'Bütün sözlük' };

function etutVeri() { return (P.etut ||= { sn: 0, n: 0, gun: {}, ayar: { sure: 20, tur: 'karisik', kaynak: 'tanis' } }); }
function etutIstat() {
  const E = etutVeri();
  const gunler = Object.entries(E.gun).filter(([, g]) => g.sn >= 60).map(([d]) => d).sort();
  let enUzun = 0, seri = 0, onceki = null;
  for (const d of gunler) { seri = onceki && gunEkle(onceki, 1) === d ? seri + 1 : 1; enUzun = Math.max(enUzun, seri); onceki = d; }
  const t = bugun();
  let simdiki = 0;
  for (let d = E.gun[t]?.sn >= 60 ? t : gunEkle(t, -1); E.gun[d]?.sn >= 60; d = gunEkle(d, -1)) simdiki++;
  return {
    saat: Math.floor(E.sn / 3600), sn: E.sn, oturum: E.n, bugunSn: E.gun[t]?.sn || 0, enUzun, simdiki,
    sabah: Object.values(E.gun).filter(g => g.sabah).length,
    gece: Object.values(E.gun).filter(g => g.gece).length,
    haftaSonu: gunler.filter(d => [0, 6].includes(new Date(d + 'T12:00').getDay())).length,
  };
}
const sureMetni = sn => { const s = Math.floor(sn / 3600), d = Math.floor(sn % 3600 / 60); return s ? `${s} sa ${d} dk` : `${d} dk`; };

const Etut = (() => {
  let o = null, saat = null;

  function havuz(kaynak, lv, tp) {
    const uygun = id => { const k = KID.get(id); return k && (!lv || k.lv === lv) && (!tp || k.tp === tp); };
    const l0 = havuzHam(kaynak).filter(uygun);
    return l0.length >= 4 ? l0 : K.filter(k => uygun(k.id)).map(k => k.id);
  }
  function havuzHam(kaynak) {
    const tanis = Object.keys(P.w).filter(id => KID.has(id) && !P.w[id].seref);
    let l = kaynak === 'hepsi' || tanis.length < 15 ? K.map(k => k.id) : tanis;
    if (kaynak === 'zor' && tanis.length >= 15) {
      const zor = tanis.filter(id => (P.w[id].x || 0) > 0 || Object.values(P.w[id].m).some(v => v.b <= 2));
      if (zor.length >= 10) l = zor;
    }
    return l;
  }
  // Uygun dikte/gölgeleme cümlesi: Türkçe karakter yok, 4–16 kelime
  function cumleSec(k) {
    const l = (k.ex || []).filter(s => !/[ğüşıöçĞÜŞİÖÇ]/.test(s) && /^[A-Z"'“]/.test(s)).filter(s => { const n = s.split(/\s+/).length; return n >= 4 && n <= 16; });
    return l[Math.floor(Math.random() * l.length)] || null;
  }
  function soruSec() {
    // Yanlış yapılanlar birkaç soru sonra yeniden gelir
    const bekleyen = o.tekrar.findIndex(x => x.sonra <= o.kayit.length);
    if (bekleyen >= 0) { const x = o.tekrar.splice(bekleyen, 1)[0]; return x.it; }
    for (let deneme = 0; deneme < 40; deneme++) {
      const id = o.havuz[Math.floor(Math.random() * o.havuz.length)];
      if (o.son.includes(id)) continue;
      const k = KID.get(id); if (!k) continue;
      if (o.tur === 'yds') { const s = Yds.uret(o.havuz, o.son); return { id: s.id, m: 'yds', soru: s, baslik: s.baslik }; }
      if (o.tur === 'karisik') {
        // Eşdizimi olan kelimelerde ara sıra eşdizim sorusu
        if (k.col && Math.random() < 0.2) { const s = Yds.esdizimSorusu(k); if (s) return { id, m: 'yds', soru: s, baslik: s.baslik }; }
        const modlar = ['r', 'p', ...(bosluklar(k).length ? ['c'] : [])];
        return { id, m: modlar[Math.floor(Math.random() * modlar.length)] };
      }
      const c = cumleSec(k); if (c) return { id, m: o.tur, cumle: c };
    }
    return null;
  }

  function baslat(ayar) {
    const E = etutVeri();
    E.ayar = { ...ayar };
    o = {
      etut: true, tur: ayar.tur, sureSn: ayar.sure * 60, kalan: ayar.sure * 60, gecen: 0, bitti: false, sureDoldu: false,
      havuz: havuz(ayar.kaynak, ayar.lv, ayar.tp), son: [], tekrar: [], kayit: [], baslangic: Date.now(), kaydedilen: 0,
    };
    oturum = o;
    E.n++; kaydet();
    clearInterval(saat);
    saat = setInterval(tik, 1000);
    sonraki();
  }
  function tik() {
    if (!o || o.bitti || document.hidden) return;
    o.kalan = Math.max(0, o.kalan - 1); o.gecen++;
    zamanIsle(1);
    if (o.kalan === 0 && !o.sureDoldu) o.sureDoldu = true;
    sayacCiz();
  }
  // Etüt süresi rozetler için güne ve saat dilimine işlenir
  function zamanIsle(sn) {
    const E = etutVeri(), t = bugun(), s = new Date().getHours();
    const g = (E.gun[t] ||= { sn: 0, q: 0, ok: 0 });
    g.sn += sn; E.sn += sn;
    if (s >= 5 && s < 9) g.sabah = 1;
    if (s >= 22 || s < 2) g.gece = 1;
    o.kaydedilen += sn;
    if (o.kaydedilen >= 15) { o.kaydedilen = 0; kaydet(); Basari.kontrol(); }
  }
  function sayacMetni() {
    if (!o) return '';
    if (o.sureDoldu) return 'Süre doldu';
    return o.kalan < 60 ? `${o.kalan} sn` : `${Math.ceil(o.kalan / 60)} dk`;
  }
  function sayacCiz() {
    const el = document.getElementById('etutSayac');
    if (el) { el.querySelector('b').textContent = sayacMetni(); el.classList.toggle('son-dakika', o.kalan < 60); }
  }
  function ustHtml() {
    const d = o.kayit.filter(x => x.dogru).length;
    return `<div class="etut-ust">
      <div id="etutSayac" class="etut-sayac ${o.kalan < 60 ? 'son-dakika' : ''}" role="timer" aria-live="off"><span>⏳</span><b>${sayacMetni()}</b></div>
      <span class="soluk">${ETUT_TUR[o.tur].ad} · <span class="iyi-yazi">✓ ${d}</span> · <span class="kotu-yazi">✗ ${o.kayit.length - d}</span></span>
      <button class="btn kucuk" id="etutBitir">Etüdü bitir</button></div>`;
  }
  function ustBagla() { document.getElementById('etutBitir')?.addEventListener('click', () => bitir()); }

  function cevap(it, dogru, verilen, dogruCevap) {
    o.kayit.push({ id: it.id, m: it.m, dogru, verilen, dogruCevap, baslik: it.baslik });
    o.son.push(it.id); if (o.son.length > 12) o.son.shift();
    const E = etutVeri(), g = (E.gun[bugun()] ||= { sn: 0, q: 0, ok: 0 });
    g.q++; if (dogru) g.ok++;
    if (!dogru) {
      o.tekrar.push({ it: { ...it }, sonra: o.kayit.length + 3 + Math.floor(Math.random() * 3) });
      // Tekrar takvimi: etütte yanlış yapılan kelime erkene çekilir; doğrular takvimi değiştirmez
      const w = P.w[it.id];
      const modlar = w ? (w.m[it.m] ? [it.m] : ['r']) : [];
      const yarin = gunEkle(bugun(), 1);
      for (const m of modlar) { const s = w.m[m]; if (s && s.d > yarin) { s.d = yarin; delete s.mezun; } }
    }
    kaydet();
  }

  function sonraki() {
    if (!o || o.bitti) return;
    klavye = null;
    if (o.sureDoldu) return sureDoldu();
    const it = soruSec();
    if (!it) return bitir();
    const k = KID.get(it.id);
    if (it.m === 'dikte') return dikte(it, k);
    if (it.m === 'golge') return golgele(it, k);
    if (it.m === 'yds') return ydsSoruGoster(it);
    const b = P.w[it.id]?.m[it.m]?.b ?? 0;
    tekAlistirma(it, b);
  }
  function sureDoldu() {
    ana().innerHTML = `${ustHtml()}<section class="sahne orta">
      <p class="ust-baslik">Etüt süresi doldu</p>
      <h1>Güzel bir çalışmaydı! ⏳</h1>
      <p class="soluk">${o.kayit.length} soru cevapladın. Etüdü tamamlayabilir ya da 20 dakika daha devam edebilirsin.</p>
      <div class="butonlar orta"><button class="ana-btn" id="etutTamam">Tamamla</button><button class="btn" id="etutUzat">20 dakika daha</button></div>
    </section>`;
    ustBagla();
    $('#etutTamam').onclick = () => bitir();
    $('#etutUzat').onclick = () => { o.kalan += 20 * 60; o.sureSn += 20 * 60; o.sureDoldu = false; sonraki(); };
  }
  function bitir() {
    if (!o) return;
    o.bitti = true; clearInterval(saat); saat = null;
    kaydet(); Basari.kontrol();
    const karne = Karne.html(o.kayit, { baslik: 'Etüt karnesi', sure: `${sureMetni(o.gecen)} çalıştın` });
    ana().innerHTML = `<section class="sahne genis">
      <h1>Etüt tamamlandı 🎓</h1>
      <p class="soluk">${ETUT_TUR[o.tur].ad} · ${sureMetni(o.gecen)}${o.kayit.length ? '' : ' · Bu etütte soru cevaplamadın.'}</p>
      ${karne}
      <div class="butonlar orta"><button class="ana-btn" id="yeniEtut">Yeni etüt başlat</button><button class="btn" data-git="bugun">Bugün'e dön</button></div>
    </section>`;
    $('#yeniEtut').onclick = () => { o = null; oturum = null; ekranEtut(); };
    o = null; oturum = null;
  }
  // Etüt ekranından başka bir ekrana geçilirse etüt sessizce kapanır (süre kaydedilmiştir)
  function ayril() { if (o && !o.bitti) { o.bitti = true; clearInterval(saat); saat = null; kaydet(); Basari.kontrol(); } if (oturum?.etut) oturum = null; o = null; }
  const aktif = () => !!(o && !o.bitti);
  return { baslat, ustHtml, ustBagla, cevap, sonraki, bitir, ayril, aktif };
})();

/* ---------- Dikte ---------- */
function dikte(it, k) {
  const c = it.cumle;
  ana().innerHTML = `${Etut.ustHtml()}<section class="sahne">
    <p class="ust-baslik">Dikte — dinle ve duyduğunu yaz</p>
    <div class="dinle-dugmeler"><button class="ana-btn" id="dkDinle">🔊 Dinle</button><button class="btn" id="dkYavas">🐢 Yavaş dinle</button></div>
    <p class="soluk orta kucuk">İpucu: cümlede <b>${esc(k.w)}</b> geçiyor (${esc(k.tr)}).</p>
    <form id="dkForm" class="dikte-form" autocomplete="off">
      <textarea id="dkGirdi" rows="3" spellcheck="false" autocapitalize="sentences" placeholder="Duyduğun cümleyi yaz…" aria-label="Duyduğun cümle"></textarea>
      <div class="butonlar"><button class="ana-btn">Kontrol et</button><button type="button" class="btn" id="dkBilmiyorum">Göster</button></div>
    </form><div id="geri"></div></section>`;
  Etut.ustBagla();
  const oku = hiz => Ses.oku(c, hiz);
  $('#dkDinle').onclick = () => oku();
  $('#dkYavas').onclick = () => oku(0.7);
  setTimeout(() => oku(), 300);
  const inp = $('#dkGirdi'); inp.focus();
  let bitti = false;
  const kontrol = girdi => {
    if (bitti) return; bitti = true;
    const s = Cumle.karsilastir(c, girdi || '');
    const dogru = s.oran === 1 && s.fazla === 0;
    inp.disabled = true;
    cevapla(it, dogru, girdi ? girdi.trim() : '(boş bıraktın)', c);
    $('#geri').innerHTML = `<div class="sonuc ${dogru ? 'iyi' : 'kotu'} dikte-sonuc">
      <b>${dogru ? 'Kusursuz!' : `%${Math.round(100 * s.oran)} doğru`}</b>
      <div class="dk-cumle">${Cumle.isaretle(c, s)} ${sesBtn(c)}</div>
      ${!dogru && girdi ? `<div class="dk-girdi soluk">Senin yazdığın: ${Cumle.girdiIsaretle(s)}</div>` : ''}
      <button class="ana-btn" id="sonraki">Devam <kbd>Enter</kbd></button></div>`;
    sonrakiBagla();
  };
  $('#dkForm').onsubmit = e => { e.preventDefault(); if (!bitti && inp.value.trim()) kontrol(inp.value); };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!bitti && inp.value.trim()) kontrol(inp.value); } };
  $('#dkBilmiyorum').onclick = () => kontrol('');
}

/* ---------- Gölgeleme (konuşma kontrolüyle) ---------- */
function golgele(it, k) {
  const c = it.cumle;
  const destek = Konusma.destek;
  ana().innerHTML = `${Etut.ustHtml()}<section class="sahne">
    <p class="ust-baslik">Gölgeleme — dinle, sonra aynı ritimle tekrar et</p>
    <div class="soru-ipucu cumle">${esc(c)}</div>
    <p class="soluk orta kucuk">${esc(k.w)} — ${esc(k.tr)}</p>
    <div class="dinle-dugmeler"><button class="btn" id="gDinle">🔊 Dinle</button><button class="btn" id="gYavas">🐢 Yavaş dinle</button>
      ${destek ? '<button class="ana-btn" id="gSoyle">🎤 Şimdi sen söyle</button>' : '<button class="ana-btn" id="gSoyledim">✓ Söyledim</button>'}</div>
    <p class="konusma-not ${destek ? '' : 'uyari'}">${Konusma.not()}</p>
    <div id="geri"></div></section>`;
  Etut.ustBagla();
  const oku = hiz => Ses.oku(c, hiz);
  $('#gDinle').onclick = () => oku();
  $('#gYavas').onclick = () => oku(0.7);
  setTimeout(() => oku(), 300);
  let deneme = 0, bitti = false;
  const sonla = (dogru, verilen, html) => {
    if (bitti) return; bitti = true;
    cevapla(it, dogru, verilen, c);
    $('#geri').innerHTML = `<div class="sonuc ${dogru ? 'iyi' : 'kotu'}">${html}<button class="ana-btn" id="sonraki">Devam <kbd>Enter</kbd></button></div>`;
    document.querySelectorAll('#gSoyle, #gSoyledim').forEach(b => b.disabled = true);
    sonrakiBagla();
  };
  if (!destek) {
    $('#gSoyledim').onclick = () => sonla(true, 'Kendi değerlendirmen: söyledim', '<b>Harika!</b> <span class="soluk">Cümleyi birkaç kez daha dinleyip ritmi yakalamaya çalış.</span>');
    return;
  }
  $('#gSoyle').onclick = async () => {
    if (bitti) return;
    if (!(await Konusma.bilgilendir())) return;
    const b = $('#gSoyle'); b.disabled = true; b.textContent = '🎙 Dinliyorum…'; b.classList.add('dinliyor');
    try {
      const soylenen = await Konusma.dinle(c);
      deneme++;
      const s = Cumle.karsilastir(c, soylenen);
      const dogru = s.oran >= 0.7; // cümle düzeyinde hoşgörülü puanlama
      const ozet = `<b>${dogru ? 'Çok iyi!' : 'Biraz daha deneyelim'}</b> <span class="soluk">%${Math.round(100 * s.oran)} anlaşıldı</span>
        <div class="dk-cumle">${Cumle.isaretle(c, s)}</div>
        <div class="dk-girdi soluk">Duyulan: “${esc(soylenen || '—')}”</div>`;
      if (dogru || deneme >= 3) sonla(dogru, soylenen || '(anlaşılamadı)', ozet);
      else { $('#geri').innerHTML = `<div class="sonuc kotu">${ozet}<span class="not">Kırmızı kelimelere dikkat ederek bir kez daha söyle (${3 - deneme} hakkın kaldı).</span></div>`; b.disabled = false; b.textContent = '🎤 Tekrar söyle'; }
    } catch (e) {
      $('#geri').innerHTML = `<p class="uyari">${esc(e.message)}</p>`;
      b.disabled = false; b.textContent = '🎤 Şimdi sen söyle';
    } finally { b.classList.remove('dinliyor'); }
  };
}

/* ---------- Etüt Köşesi ekranı ---------- */
function ekranEtut() {
  if (Etut.aktif()) return Etut.sonraki();
  const E = etutVeri(), A = E.ayar, S = etutIstat();
  const sesYok = !Ses.var();
  ana().innerHTML = `
  <section class="panel etut-giris">
    <h1>Etüt Köşesi</h1>
    <p class="soluk">Günlük rutinden bağımsız, süreli serbest çalışma. İstediğin kadar etüt yapabilirsin; doğru cevaplar takvimini değiştirmez,
      yanlış yaptığın kelimeler ise tekrar takviminde öne alınır. Süre bitince elindeki soruyu tamamlarsın; sonunda karnen gelir.</p>
    <form id="etutForm" class="etut-form">
      <fieldset><legend>Süre</legend><div class="secim-grup">${ETUT_SURE.map(n => `<label class="secim"><input type="radio" name="sure" value="${n}" ${+A.sure === n ? 'checked' : ''}><span>${n} dk</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Çalışma türü</legend><div class="secim-grup dikey">${Object.entries(ETUT_TUR).map(([k, t]) => {
        const kapali = sesYok && (k === 'dikte' || k === 'golge');
        return `<label class="secim genis ${kapali ? 'kapali' : ''}"><input type="radio" name="tur" value="${k}" ${A.tur === k && !kapali ? 'checked' : ''} ${kapali ? 'disabled' : ''}><span><b>${t.ad}</b><small>${t.acik}${kapali ? ' Bu tarayıcıda İngilizce ses bulunamadı.' : ''}</small></span></label>`;
      }).join('')}</div></fieldset>
      <fieldset><legend>Kelimeler</legend><div class="secim-satir"><select name="kaynak">${Object.entries(ETUT_KAYNAK).map(([k, ad]) => `<option value="${k}" ${A.kaynak === k ? 'selected' : ''}>${ad}</option>`).join('')}</select>${etiketSecimHtml(A.lv, A.tp, { etiketli: false })}</div>
        ${Object.keys(P.w).length < 15 ? '<small class="soluk">Henüz az kelimeyle tanıştığın için bütün sözlükten sorulur.</small>' : ''}</fieldset>
      <p class="konusma-not">🎤 Gölgelemede söylediklerin konuşma tanımayla kontrol edilir. ${Konusma.not()}</p>
      <div class="butonlar"><button class="ana-btn buyuk-btn">⏳ Etüdü başlat</button></div>
    </form>
  </section>
  <section class="panel">
    <h2>Etüt istatistiklerin</h2>
    <div class="etut-istat">
      <div><b>${sureMetni(S.sn)}</b><span>toplam etüt</span></div>
      <div><b>${S.oturum}</b><span>oturum</span></div>
      <div><b>${sureMetni(S.bugunSn)}</b><span>bugün</span></div>
      <div><b>${S.simdiki} gün</b><span>etüt serisi (en uzun ${S.enUzun})</span></div>
    </div>
    <p class="soluk kucuk">Etüt süren rozet kazandırır: 1, 10, 50, 100, 250, 500 ve 1000 saat; ayrıca sabah, gece, hafta sonu etütleri ve art arda günler. <button class="link" data-git="basari">Rozetlere bak →</button></p>
  </section>`;
  if (!$('#etutForm input[name=tur]:checked')) $('#etutForm input[name=tur][value=karisik]').checked = true;
  $('#etutForm').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    Etut.baslat({ sure: +f.get('sure') || 20, tur: f.get('tur') || 'karisik', kaynak: f.get('kaynak') || 'tanis', lv: f.get('lv') || '', tp: f.get('tp') || '' });
  };
}
