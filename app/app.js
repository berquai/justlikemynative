// AnadilimGibi — ana uygulama
// Copyright (C) 2026 Berkay Çelik
'use strict';

// Ziyaretçi sayacı (GoatCounter): çerez kullanmaz, kişisel veri saklamaz. Yalnızca canlı sitede çalışır.
// Hesap kodu https://<kod>.goatcounter.com adresindeki <kod>dur; boş bırakılırsa sayaç hiç yüklenmez.
const ZIYARET_SAYACI = { kod: 'anadilimgibi', alanAdi: 'anadilimgibi.com' };
const UYGULAMA = { ad: 'AnadilimGibi', surum: '2.0.0', yil: '2026', yazar: 'Berkay Çelik', instagram: 'berkay.celik52', eposta: 'info@anadilimgibi.com' };

/* ================= Veri ve ilerleme ================= */
// Excel'den gelen taban liste + kullanıcının sözlükte yaptığı ekleme/düzenleme/silmeler (P.sozluk)
const K_TABAN = window.KELIMELER || [];
let K = K_TABAN, KID = new Map(K.map(k => [k.id, k])), K_TABAN_ID = null;
const LS = 'kelimeBulmaca.v1';
// kutu -> sonraki tekrar (gün). Son kutudaki (360 gün) tekrar da doğru bilinirse mod "mezun" olur.
const ARALIK = [0, 1, 3, 7, 14, 30, 60, 180, 360];
const SON_KUTU = ARALIK.length - 1;
const ZOR_CIKIS = 3; // zorlandığın kelimeler listesinden çıkmak için üst üste doğru sayısı
const MEZUN = '9999-12-31';
const MODLAR = { r: 'Anlama', c: 'Bağlam', p: 'Üretme' };
const USTA = 5; // bu kutuya ulaşan mod "pekişmiş" sayılır (14 günlük aralığı geçmiş)

function sozlukKur() {
  const o = P.sozluk || {};
  const m = new Map();
  const silik = v => v === null || (v && v.silindi);
  for (const k of K_TABAN) {
    if (silik(o[k.id])) continue;            // silinmiş
    m.set(k.id, o[k.id] ? { ...k, ...o[k.id], id: k.id } : k);
  }
  for (const [id, v] of Object.entries(o)) if (v && !silik(v) && !m.has(id)) m.set(id, { ...v, id });
  K_TABAN_ID ||= new Set(K_TABAN.map(k => k.id));
  K = [...m.values()];
  KID = m;
  bosOnbellek.clear();
}

let P = null;

function bugun(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function gunEkle(ds, n) { const [y, m, d] = ds.split('-').map(Number); return bugun(new Date(y, m - 1, d + n)); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function yeniIlerleme() {
  return { v: 1, updated: Date.now(), seed: Math.floor(Math.random() * 1e9),
    ayar: { gunluk: 10, sinir: 50, yds: true, ses: '', hiz: 0.95, otoSes: true, tema: 'Sistem', ozelTema: {}, temaRenk: null },
    w: {}, gun: {}, kagit: [], kagitNo: 0, sozluk: {}, rozet: {}, oyun: {} };
}
function tamamla() {
  P.ayar = Object.assign(yeniIlerleme().ayar, P.ayar);
  P.kagit ||= []; P.gun ||= {}; P.sozluk ||= {}; P.rozet ||= {}; P.oyun ||= {};
  sozlukKur();
  temaUygula();
}
function yukle() {
  try { P = JSON.parse(localStorage.getItem(LS)); } catch (e) { P = null; }
  if (!P || !P.w) P = yeniIlerleme();
  tamamla();
}
// Seçili temayı uygula; türetilen renkleri açılışta erken uygulanmak üzere sakla
function temaUygula() {
  P.ayar.temaRenk = Tema.uygula(P.ayar.tema, P.ayar.ozelTema);
}
function kaydet() {
  P.updated = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(P)); } catch (e) { /* depolama kapalı olabilir */ }
  Senkron.planla();
  Bulut.planla();
}
function gunKaydi(t = bugun()) { return (P.gun[t] ||= { n: 0, r: 0, ok: 0 }); }
const DURUM_SIRA = ['yeni', 'ogreniliyor', 'pekisti', 'usta', 'seref'];

// Kelimenin boşluk doldurmada kullanılabilecek cümleleri (önbellekli)
const bosOnbellek = new Map();
function bosluklar(k) {
  // Türkçe açıklama içeren ya da çok uzun "örnek"ler boşluk doldurmada kullanılmaz
  const uygun = s => !/[ğüşıöçĞÜŞİÖÇ]/.test(s) && s.length <= 220 && s.split(/\s+/).length >= 3;
  if (!bosOnbellek.has(k.id)) bosOnbellek.set(k.id, k.ex.filter(uygun).map(s => Metin.bosluk(s, k.w)).filter(Boolean));
  return bosOnbellek.get(k.id);
}

const sira = () => K.slice().sort((a, b) => hash(P.seed + a.id) - hash(P.seed + b.id));
// Kullanıcının "hemen öğrenmek istiyorum" dediği kelimeler (P.oncelik) sıranın başına gelir
function siradakiYeniler(n) {
  if (n <= 0) return [];
  const once = (P.oncelik || []).map(id => KID.get(id)).filter(k => k && !P.w[k.id]);
  const onceSet = new Set(once.map(k => k.id));
  return [...once, ...sira().filter(k => !P.w[k.id] && !onceSet.has(k.id))].slice(0, n);
}

function tanistir(id) {
  if (P.w[id]) return;
  const t = bugun(), k = KID.get(id);
  const m = { r: { b: 0, d: t }, p: { b: 0, d: t } };
  if (bosluklar(k).length) m.c = { b: 0, d: t };
  P.w[id] = { i: t, m, x: 0 };
  gunKaydi().n++;
  kaydet();
  Basari.kontrol();
}
function puanla(id, mod, dogru) {
  const w = P.w[id], s = w?.m[mod]; if (!s) return;
  const t = bugun(), g = gunKaydi(), saat = new Date().getHours();
  g.r++;
  g.m ||= {}; const gm = (g.m[mod] ||= { n: 0, ok: 0 }); gm.n++;
  if (saat >= 22 || saat < 4) g.gece = 1;
  if (saat >= 5 && saat < 8) g.sabah = 1;
  if (dogru) {
    g.ok++; gm.ok++;
    if (w.x) w.ds = (w.ds || 0) + 1; // son yanlıştan beri üst üste doğru (zorlandığın kelimeler listesi için)
    if (s.d <= t) {
      if (s.b >= SON_KUTU) { s.d = MEZUN; s.mezun = t; }     // 360 günlük tekrarı da geçti
      else { s.b++; s.d = gunEkle(t, ARALIK[s.b]); }
    }
    if (!w.seref && Object.values(w.m).every(v => v.d === MEZUN)) { w.seref = t; g.seref = (g.seref || 0) + 1; }
  } else {
    s.b = 0; s.d = t; delete s.mezun; w.x = (w.x || 0) + 1; w.ds = 0;
  }
  g.kalan = vadesiGelenler(t).length; // öğrenme takvimi: o gün tekrarların bitip bitmediği
  kaydet();
  Basari.kontrol();
}
function vadesiGelenler(t = bugun()) {
  const l = [];
  for (const [id, s] of Object.entries(P.w)) {
    if (!KID.has(id) || s.seref) continue;
    for (const [m, v] of Object.entries(s.m)) if (v.d <= t) l.push({ id, m });
  }
  return l;
}
/* Günlük sınır ve yük dengesi
   - Günlük rutinde en fazla P.ayar.sinir soru (varsayılan 50) sorulur; fazlası yarına kalır.
   - Günün başındaki tekrar yükü (g.yuk) sınırı aşıyorsa o gün yeni kelime verilmez;
     sınırın yarısının altındaysa ayarlardaki sayı tam verilir; arada kademeli olarak azalır.
   - Her yeni kelime aynı gün 2–3 soru getirdiği için yeni kelime ancak kalan soru hakkına sığdığı kadar verilir. */
const SINIR_SECENEK = [25, 50, 100];
const ETUT_HAZIR = true; // Etüt Köşesi açık: menüde görünür, sınır mesajı Etüt'e yönlendirir
const sinirMesaji = () => 'Bugünlük bu kadar yeter. Kalan tekrarlar yarına bırakıldı' +
  (ETUT_HAZIR ? '; daha fazla çalışmak istersen Etüt Köşesi seni bekliyor.' : '.');
function gunPlani(t = bugun()) {
  const g = gunKaydi(t);
  const vade = vadesiGelenler(t);
  if (g.yuk == null) g.yuk = vade.length; // günün başındaki tekrar yükü
  const sinir = SINIR_SECENEK.includes(+P.ayar.sinir) ? +P.ayar.sinir : 50;
  const kalanSoru = Math.max(0, sinir - (g.q || 0));
  const yari = sinir / 2;
  const oran = g.yuk >= sinir ? 0 : g.yuk <= yari ? 1 : (sinir - g.yuk) / yari;
  const taban = Math.floor(P.ayar.gunluk * oran);
  const yer = Math.floor(Math.max(0, kalanSoru - vade.length) / 3);
  return {
    g, vade, sinir, kalanSoru, azaltildi: oran < 1 && P.ayar.gunluk > 0,
    yeniHak: Math.max(0, Math.min(taban - g.n, yer)),
    planli: Math.min(vade.length, kalanSoru),
    doldu: kalanSoru === 0,
  };
}

function durum(id) {
  const s = P.w[id]; if (!s) return 'yeni';
  if (s.seref) return 'seref';
  const kutular = Object.values(s.m).map(v => v.b);
  const min = Math.min(...kutular);
  if (min >= 7) return 'usta';
  if (min >= USTA) return 'pekisti';
  return 'ogreniliyor';
}
// Seviye (yaklaşık CEFR) ve konu etiketleri: Sözlük, Yazdır-Çöz ve Etüt'te süzmek için
const SEVIYELER = ['A2', 'B1', 'B2', 'C1', 'C2'];
const konuListesi = () => [...new Set(K.map(k => k.tp).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
function etiketSecimHtml(lv = '', tp = '', { etiketli = true } = {}) {
  const s1 = `<select name="lv" aria-label="Seviye"><option value="">Tüm seviyeler</option>${SEVIYELER.map(s => `<option value="${s}" ${lv === s ? 'selected' : ''}>Yaklaşık ${s}</option>`).join('')}</select>`;
  const s2 = `<select name="tp" aria-label="Konu"><option value="">Tüm konular</option>${konuListesi().map(s => `<option value="${esc(s)}" ${tp === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`;
  return etiketli ? `<label>Seviye ${s1}</label><label>Konu ${s2}</label>` : s1 + s2;
}
const etiketSuz = (l, lv, tp) => l.filter(k => (!lv || k.lv === lv) && (!tp || k.tp === tp));
const DURUM_AD = { yeni: 'Henüz başlanmadı', ogreniliyor: 'Öğreniliyor', pekisti: 'Pekişti', usta: 'Ustalaştı', seref: 'Şeref Tribünü' };

// Kelimeyi baştan öğrenilecekler havuzuna al (içerik değişince ya da tribünden indirilince)
function yenidenOgren(id) {
  const w = P.w[id]; if (!w) return;
  const t = bugun(), k = KID.get(id);
  w.m = { r: { b: 0, d: t }, p: { b: 0, d: t } };
  if (k && bosluklar(k).length) w.m.c = { b: 0, d: t };
  delete w.seref;
  w.tanit = 1; // bir sonraki çalışmada kelime kartı yeniden gösterilsin
}

/* ================= Ses ================= */
const Ses = (() => {
  let sesler = [];
  const var_ = 'speechSynthesis' in window;
  function doldur() { if (var_) sesler = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); }
  // Sesler bazı tarayıcılarda geç yüklenir; Etüt seçim ekranı açıksa dikte/gölgeleme seçenekleri güncellensin
  if (var_) { doldur(); speechSynthesis.onvoiceschanged = () => { doldur(); if (typeof aktifEkran !== 'undefined' && aktifEkran === 'etut' && !Etut.aktif()) ekranEtut(); }; }
  function oku(metin, hiz) {
    if (!var_ || !metin) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(metin);
    const v = sesler.find(v => v.name === P.ayar.ses) || sesler.find(v => /en-GB/i.test(v.lang)) || sesler[0];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = hiz || P.ayar.hiz || 0.95;
    speechSynthesis.speak(u);
  }
  return { oku, liste: () => sesler, var: () => var_ && sesler.length > 0 };
})();
document.addEventListener('click', e => {
  const b = e.target.closest('[data-oku]');
  if (b) { e.preventDefault(); Ses.oku(b.dataset.oku); }
});
const sesBtn = (metin, etiket = '🔊') => `<button class="ses" data-oku="${esc(metin)}" title="Dinle" aria-label="Dinle">${etiket}</button>`;

/* ================= Genel arayüz ================= */
const $ = (s, el = document) => el.querySelector(s);
const ana = () => $('#ana');
let aktifEkran = 'bugun';
let klavye = null; // aktif ekranın klavye işleyicisi

document.addEventListener('keydown', e => {
  if (klavye && !e.ctrlKey && !e.metaKey && !e.altKey) klavye(e);
});

const EKRANLAR = ['bugun', 'calis', 'etut', 'kagit', 'oyun', 'sozluk', 'istatistik', 'basari', 'ayar', 'hakkinda', 'kilavuz', 'karsilama'];
function git(ekran, gecmiseYaz = true) {
  // Telefonun geri tuşu uygulamadan çıkmak yerine önceki ekrana dönsün
  if (gecmiseYaz && ekran !== aktifEkran && EKRANLAR.includes(ekran)) history.pushState({ ekran }, '', '#' + ekran);
  if (aktifEkran === 'etut' && ekran !== 'etut') Etut.ayril();
  aktifEkran = ekran; klavye = null;
  document.body.classList.toggle('karsilama-modu', ekran === 'karsilama');
  document.querySelectorAll('nav [data-git], .daha-ic [data-git]').forEach(b => b.classList.toggle('aktif', b.dataset.git === ekran));
  const dahaIci = ['kagit', 'istatistik', 'basari', 'ayar', 'hakkinda', 'kilavuz'].includes(ekran);
  document.querySelectorAll('.daha-ac').forEach(b => b.classList.toggle('aktif', dahaIci));
  dahaKapat();
  ({ bugun: ekranBugun, calis: ekranCalis, kagit: ekranKagit, oyun: ekranOyun, sozluk: ekranSozluk, istatistik: ekranIstatistik,
    basari: ekranBasari, ayar: ekranAyar, hakkinda: ekranHakkinda, kilavuz: ekranKilavuz, karsilama: ekranKarsilama, etut: ekranEtut }[ekran] || ekranBugun)();
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-git]');
  if (b) { e.preventDefault(); git(b.dataset.git); }
});
window.addEventListener('popstate', e => {
  if ($('.modal')) { const md = $('.modal'); md._istekKapat ? md._istekKapat() : md.remove(); history.pushState({ ekran: aktifEkran }, '', '#' + aktifEkran); return; }
  if ($('#dahaMenu') && !$('#dahaMenu').hidden) { dahaKapat(); history.pushState({ ekran: aktifEkran }, '', '#' + aktifEkran); return; }
  const h = location.hash.slice(1);
  git(EKRANLAR.includes(h) ? h : 'bugun', false);
});
// Telefonda alt çubuktaki "Daha" menüsü
function dahaKapat() { const m = $('#dahaMenu'); if (m) m.hidden = true; document.querySelectorAll('.daha-ac').forEach(b => b.setAttribute('aria-expanded', 'false')); }
document.addEventListener('click', e => {
  if (e.target.closest('.daha-ac')) { const m = $('#dahaMenu'); m.hidden = !m.hidden; document.querySelectorAll('.daha-ac').forEach(b => b.setAttribute('aria-expanded', String(!m.hidden))); return; }
  if (!e.target.closest('#dahaMenu .daha-ic')) dahaKapat();
});

function dagit(n, tekil) { return `${n} ${tekil}`; }

function kelimeKarti(k, { ornekler = true } = {}) {
  const ex = ornekler ? k.ex.map(s => `<li>${vurgula(s, k.w)} ${sesBtn(s, '▶')}</li>`).join('') : '';
  return `<div class="kart-kelime">
    <div class="kk-ust"><span class="kk-w">${esc(k.w)}</span> ${sesBtn(k.w)}
      ${k.pr ? `<span class="kk-pr">/${esc(k.pr)}/</span>` : ''} ${k.p ? `<span class="etiket">${esc(k.p)}</span>` : ''}
      ${k.lv ? `<span class="etiket seviye-et" title="Yaklaşık seviye">≈ ${esc(k.lv)}</span>` : ''} ${k.tp ? `<span class="etiket">${esc(k.tp)}</span>` : ''}</div>
    <div class="kk-tr">${esc(k.tr)}</div>
    ${k.d ? `<div class="kk-d">${esc(k.d)}</div>` : ''}
    ${ex ? `<ul class="kk-ex">${ex}</ul>` : ''}
    ${k.col ? `<div class="kk-col"><b>Eşdizimler:</b> ${k.col.split(' · ').map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    ${k.n ? `<div class="kk-not"><b>Not:</b> ${esc(k.n)}</div>` : ''}
  </div>`;
}
function vurgula(cumle, w) {
  const b = Metin.bosluk(cumle, w);
  if (!b) return esc(cumle);
  const parca = b.yuzey.split(' ');
  let i = 0;
  return b.html.replace(/<span class="bosluk">_____<\/span>/g, () => `<mark>${esc(parca[i++] || '')}</mark>`);
}

/* ================= Ana sayfa ================= */
function ekranBugun() {
  const t = bugun();
  const plan = gunPlani(t), { g, vade } = plan;
  const vadeKelime = new Set(vade.map(v => v.id)).size;
  const yeniHak = plan.yeniHak;
  const yarina = vade.length - plan.planli;
  const kalanYeni = K.filter(k => !P.w[k.id]).length;
  const tekrarTanit = yenidenTanitilacaklar().length;
  const say = { yeni: 0, ogreniliyor: 0, pekisti: 0, usta: 0, seref: 0 };
  K.forEach(k => say[durum(k.id)]++);
  const seri = Istat.seri().simdiki;
  // önümüzdeki 7 gün
  const tahmin = [];
  for (let i = 1; i <= 7; i++) {
    const d = gunEkle(t, i);
    let n = 0; for (const s of Object.values(P.w)) for (const v of Object.values(s.m)) if (v.d === d) n++;
    tahmin.push({ d, n });
  }
  const maxT = Math.max(1, ...tahmin.map(x => x.n));
  const gunAd = d => ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][new Date(d + 'T12:00').getDay()];
  const bekleyenKagit = P.kagit.filter(s => !s.notlandi).length;

  ana().innerHTML = `
  <section class="kahraman">
    <div>
      <h1>Bugün</h1>
      <p class="soluk">${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}${seri ? ` · ${seri} günlük seri 🔥` : ''}</p>
    </div>
    <div class="ozet">
      <div class="kutu"><b>${yeniHak}</b><span>yeni kelime${tekrarTanit ? `<br><small>+${tekrarTanit} güncellenen</small>` : ''}</span></div>
      <div class="kutu"><b>${plan.planli}</b><span>tekrar alıştırması<br><small>${vadeKelime} kelime${yarina > 0 ? ` · ${yarina} yarına` : ''}</small></span></div>
      <div class="kutu"><b>${g.r ? Math.round(100 * g.ok / g.r) + '%' : '–'}</b><span>bugünkü başarı<br><small>${g.q || 0}/${plan.sinir} soru</small></span></div>
    </div>
    ${plan.doldu ? `<p class="bilgi">${sinirMesaji()} <button class="link" data-git="etut">Etüt Köşesi'ne git →</button></p>`
      : plan.azaltildi ? `<p class="soluk kucuk">Bekleyen tekrarların çok olduğu için bugün yeni kelime sayısı azaltıldı. Tekrarlar azaldıkça yeni kelimeler kendiliğinden geri gelir.</p>` : ''}
    <div class="butonlar">
      ${(() => { const bos = plan.doldu || (!yeniHak && !plan.planli && !tekrarTanit); return `<button class="ana-btn" data-git="calis" ${bos ? 'disabled' : ''}>${bos ? 'Bugünlük bitti ✓' : 'Çalışmaya başla'}</button>
      ${bos && !plan.doldu && kalanYeni && plan.kalanSoru >= 15 ? '<button class="btn" id="ekYeni">+5 yeni kelime daha</button>' : ''}`; })()}
      <button class="btn" data-git="kagit">Yazdır-Çöz bulmacası hazırla${bekleyenKagit ? ` <span class="rozet">${bekleyenKagit}</span>` : ''}</button>
      <button class="btn" id="hizliEkle">+ Kelime ekle</button>
    </div>
  </section>
  ${Senkron.bantHtml()}
  ${Bulut.bantHtml()}
  <section class="iki">
    <div class="panel">
      <h2>Kelime durumu</h2>
      <div class="durum-cubuk">
        ${['seref', 'usta', 'pekisti', 'ogreniliyor', 'yeni'].map(d => `<span class="d-${d}" style="flex:${say[d] || 0.0001}" title="${DURUM_AD[d]}: ${say[d]}"></span>`).join('')}
      </div>
      <ul class="lejant">
        ${['ogreniliyor', 'pekisti', 'usta', 'seref', 'yeni'].map(d => `<li><i class="d-${d}"></i>${DURUM_AD[d]} <b>${say[d]}</b></li>`).join('')}
      </ul>
      <p class="soluk kucuk">Toplam <b>${K.length.toLocaleString('tr-TR')}</b> kelime. Üç yönde de 14 günlük aralığı geçen kelime “pekişti”, 180 günlüğü geçen “ustalaştı” sayılır. Üç alıştırma türünde de 360 günlük tekrarını doğru cevapladığın kelime <b>Şeref Tribünü</b>'ne çıkar ve artık sorulmaz.</p>
    </div>
    <div class="panel">
      <h2>Önümüzdeki 7 gün</h2>
      <div class="tahmin">
        ${tahmin.map(x => `<div><span class="cubuk" style="height:${Math.round(70 * x.n / maxT) + 2}px"></span><b>${x.n}</b><small>${gunAd(x.d)}</small></div>`).join('')}
      </div>
      <p class="soluk kucuk">Gün başına tekrar edilecek alıştırma sayısı (yeni kelimeler hariç).</p>
    </div>
  </section>`;
  $('#ekYeni')?.addEventListener('click', () => { oturum = oturumKur(5); git('calis'); });
  $('#hizliEkle').onclick = () => kelimeFormu();
  Senkron.bantBagla();
  Bulut.bantBagla();
}

/* ================= Çalışma oturumu ================= */
let oturum = null;

function yenidenTanitilacaklar() { return Object.keys(P.w).filter(id => P.w[id].tanit && KID.has(id)); }
function oturumKur(ekYeni = 0) {
  const hak = gunPlani().yeniHak + ekYeni;
  return { yeniler: [...yenidenTanitilacaklar(), ...siradakiYeniler(hak).map(k => k.id)], tanitIdx: 0, kuyruk: null, adim: 0, dogru: 0, yanlis: 0, gorulen: new Set(), bitti: false, kayit: [] };
}
function kuyrukKur() {
  const { kalanSoru } = gunPlani();
  let v = vadesiGelenler();
  if (v.length > kalanSoru) {
    // Sınırı aşan gün: en çok geciken, sonra en zayıf (en düşük kutudaki) alıştırmalardan başla
    const s = x => P.w[x.id].m[x.m];
    v = v.slice().sort((a, b) => s(a).d.localeCompare(s(b).d) || s(a).b - s(b).b).slice(0, kalanSoru);
  }
  const tur = m => karistir(v.filter(x => x.m === m));
  return [...tur('r'), ...tur('c'), ...tur('p')];
}

function ekranCalis() {
  if (!oturum || oturum.bitti || oturum.etut) oturum = oturumKur();
  devam();
}

function devam() {
  klavye = null;
  if (oturum?.etut) return Etut.sonraki();
  const o = oturum;
  if (o.tanitIdx < o.yeniler.length) return tanitimGoster();
  if (!o.kuyruk) o.kuyruk = kuyrukKur();
  // tanıtımdan sonra gelecek kuyruk: yeni kelimeler de vadede
  const kalanSoru = gunPlani().kalanSoru;
  if (!o.kuyruk.length && kalanSoru && P.ayar.yds !== false && !o.ydsEklendi && o.adim > 0) {
    // Tekrarlar bitince birkaç YDS / YÖKDİL tarzı soru (tanışılan kelimelerden)
    o.ydsEklendi = true;
    const havuz = Object.keys(P.w).filter(id => KID.has(id));
    const son = [];
    for (let i = 0; i < Math.min(5, kalanSoru); i++) { const s = Yds.uret(havuz, son); son.push(s.id); o.kuyruk.push({ id: s.id, m: 'yds', soru: s, baslik: s.baslik }); }
  }
  if (!o.kuyruk.length || !kalanSoru) return oturumSonu();
  const it = o.kuyruk[0];
  if (it.m === 'yds') return ydsSoruGoster(it);
  const s = P.w[it.id]?.m[it.m];
  if (!s) { o.kuyruk.shift(); return devam(); }
  // eşleştirme grubu: düşük kutudaki bağlam/üretme alıştırmaları
  if ((it.m === 'c' || it.m === 'p') && s.b <= 1) {
    const grup = [], cevaplar = new Set();
    for (let i = 0; i < o.kuyruk.length && grup.length < Math.min(6, kalanSoru); i++) {
      const x = o.kuyruk[i], sx = P.w[x.id]?.m[x.m];
      const w = KID.get(x.id).w.toLowerCase();
      if ((x.m === 'c' || x.m === 'p') && sx && sx.b <= 1 && !cevaplar.has(w)) { grup.push(x); cevaplar.add(w); }
    }
    if (grup.length >= 3) return eslestirmeGoster(grup);
  }
  tekAlistirma(it, s.b);
}

function ilerlemeCubugu() {
  if (oturum?.etut) return Etut.ustHtml();
  const o = oturum;
  const toplam = o.yeniler.length + o.adim + (o.kuyruk ? o.kuyruk.length : vadesiGelenler().length + o.yeniler.length * 3);
  const yapilan = Math.min(o.tanitIdx, o.yeniler.length) + o.adim;
  return `<div class="ilerleme"><span style="width:${Math.round(100 * yapilan / Math.max(1, toplam))}%"></span></div>
    <div class="oturum-ust"><span class="soluk">${o.kuyruk ? `${o.kuyruk.length} alıştırma kaldı` : `Yeni kelime ${o.tanitIdx + 1}/${o.yeniler.length}`}</span>
    <button class="btn kucuk" id="bitir">Şimdilik bitir</button></div>`;
}
function ustBagla() { if (oturum?.etut) return Etut.ustBagla(); $('#bitir')?.addEventListener('click', () => { oturumSonu(true); }); }

function tanitimGoster() {
  const o = oturum, k = KID.get(o.yeniler[o.tanitIdx]);
  if (!k) { o.tanitIdx++; return devam(); }
  const guncel = P.w[k.id]?.tanit;
  ana().innerHTML = `${ilerlemeCubugu()}
  <section class="sahne">
    <p class="ust-baslik">${guncel ? 'Güncellenen kelime — yeniden öğreniyoruz' : 'Yeni kelime'}</p>
    ${kelimeKarti(k)}
    <div class="butonlar orta">
      <button class="ana-btn" id="tamam">Tamam, devam <kbd>Enter</kbd></button>
      <button class="btn" id="biliyorum" title="Bu kelimeyi daha seyrek sorar">Bunu zaten iyi biliyorum</button>
    </div>
  </section>`;
  ustBagla();
  if (P.ayar.otoSes) Ses.oku(k.w);
  const ileri = () => { tanistir(k.id); if (P.w[k.id].tanit) { delete P.w[k.id].tanit; kaydet(); } o.tanitIdx++; devam(); };
  $('#tamam').onclick = ileri;
  $('#biliyorum').onclick = () => {
    tanistir(k.id); delete P.w[k.id].tanit;
    const t = bugun();
    for (const v of Object.values(P.w[k.id].m)) { v.b = 3; v.d = gunEkle(t, ARALIK[3]); }
    kaydet(); o.tanitIdx++; devam();
  };
  klavye = e => { if (e.key === 'Enter') { e.preventDefault(); ileri(); } };
}

// Çeldiriciler
function celdiriciler(k, n, alan) {
  const tur = (k.p || '').split(/[\/ ]/)[0];
  const havuz = karistir(K.filter(x => x.id !== k.id && x[alan].toLowerCase() !== k[alan].toLowerCase()));
  const ayni = havuz.filter(x => (x.p || '').split(/[\/ ]/)[0] === tur);
  const sec = [], gor = new Set([k[alan].toLowerCase()]);
  for (const x of [...ayni, ...havuz]) {
    const a = x[alan].toLowerCase();
    if (!gor.has(a)) { gor.add(a); sec.push(x); }
    if (sec.length >= n) break;
  }
  return sec;
}

function ipucuSec(k, mod, tip) {
  // tip: 'tr' | 'd' | 'c'
  if (mod === 'c' || tip === 'c') {
    const b = bosluklar(k); const x = b[Math.floor(Math.random() * b.length)];
    if (x) return { tip: 'c', html: x.html, yuzey: x.yuzey, etiket: 'Cümleyi tamamla' };
  }
  if (tip === 'd' && k.d) return { tip: 'd', html: esc(Metin.gizle(k.d, k.w)), etiket: 'İngilizce tanım' };
  return { tip: 'tr', html: esc(k.tr), etiket: 'Türkçesi' };
}

function sonucHtml(k, dogru, ek = '') {
  return `<div class="sonuc ${dogru ? 'iyi' : 'kotu'}">
    <b>${dogru ? 'Doğru!' : 'Doğrusu:'}</b> ${esc(k.w)} ${sesBtn(k.w)} <span class="soluk">— ${esc(k.tr)}</span> ${ek}
    <button class="ana-btn" id="sonraki">Devam <kbd>Enter</kbd></button></div>`;
}
function cevapla(it, dogru, verilen = '', dogruCevap = '') {
  if (oturum?.etut) return Etut.cevap(it, dogru, verilen, dogruCevap);
  const o = oturum;
  o.kayit?.push({ id: it.id, m: it.m, dogru, verilen, dogruCevap, baslik: it.baslik });
  const g = gunKaydi(); g.q = (g.q || 0) + 1; // günlük rutin soru sayacı (sınır için)
  puanla(it.id, it.m, dogru);
  o.kuyruk = o.kuyruk.filter(x => !(x.id === it.id && x.m === it.m));
  o.adim++;
  if (dogru) o.dogru++;
  else if (it.m !== 'yds') { o.yanlis++; o.kuyruk.splice(Math.min(o.kuyruk.length, 3 + Math.floor(Math.random() * 3)), 0, { id: it.id, m: it.m }); }
  else o.yanlis++;
}
function sonrakiBagla() {
  const btn = $('#sonraki'); btn?.focus();
  btn && (btn.onclick = devam);
  klavye = e => { if (e.key === 'Enter') { e.preventDefault(); devam(); } };
}

function tekAlistirma(it, b) {
  const k = KID.get(it.id);
  if (it.m === 'r') return b >= 3 && Ses.var() ? coktanSecmeli(it, k, 'dinle') : coktanSecmeli(it, k, 'tr');
  if (it.m === 'c') return b <= 1 ? coktanSecmeli(it, k, 'cumle') : yazma(it, k, b <= 3);
  // üretme
  if (b <= 1) return coktanSecmeli(it, k, 'uret');
  if (b === 2 && Metin.izgarayaUygun(k.w)) return harfDizme(it, k);
  return yazma(it, k, b === 3);
}

function coktanSecmeli(it, k, tur) {
  let soru, secenekler, dogruMetin;
  if (tur === 'tr' || tur === 'dinle') {
    const c = celdiriciler(k, 3, 'tr');
    secenekler = karistir([k, ...c]).map(x => ({ x, metin: x.tr }));
    dogruMetin = k.tr;
    soru = tur === 'dinle'
      ? `<p class="ust-baslik">Dinle — anlamı ne?</p><div class="soru-kelime">${sesBtn(k.w, '🔊 Tekrar dinle')}</div>`
      : `<p class="ust-baslik">Bu kelimenin anlamı ne?</p><div class="soru-kelime">${esc(k.w)} ${sesBtn(k.w)}</div>${k.pr ? `<p class="kk-pr orta">/${esc(k.pr)}/</p>` : ''}`;
  } else {
    const ip = tur === 'cumle' ? ipucuSec(k, 'c') : ipucuSec(k, 'p', Math.random() < 0.5 ? 'd' : 'tr');
    const c = celdiriciler(k, 3, 'w');
    secenekler = karistir([k, ...c]).map(x => ({ x, metin: x.w }));
    dogruMetin = k.w;
    soru = `<p class="ust-baslik">${ip.etiket}</p><div class="soru-ipucu ${ip.tip === 'c' ? 'cumle' : ''}">${ip.html}</div>`;
  }
  ana().innerHTML = `${ilerlemeCubugu()}<section class="sahne">${soru}
    <div class="secenekler">${secenekler.map((s, i) => `<button class="secenek" data-i="${i}"><kbd>${i + 1}</kbd> ${esc(s.metin)}</button>`).join('')}</div>
    <div id="geri"></div></section>`;
  ustBagla();
  if (tur === 'dinle' || (tur === 'tr' && P.ayar.otoSes)) Ses.oku(k.w);
  let bitti = false;
  const sec = i => {
    if (bitti) return; bitti = true;
    const dogru = secenekler[i].metin === dogruMetin;
    document.querySelectorAll('.secenek').forEach((b, j) => {
      b.disabled = true;
      if (secenekler[j].metin === dogruMetin) b.classList.add('dogru');
      else if (j === i) b.classList.add('yanlis');
    });
    cevapla(it, dogru, secenekler[i].metin, dogruMetin);
    $('#geri').innerHTML = sonucHtml(k, dogru);
    if (it.m !== 'r' && P.ayar.otoSes) Ses.oku(k.w);
    sonrakiBagla();
  };
  document.querySelectorAll('.secenek').forEach(b => b.onclick = () => sec(+b.dataset.i));
  klavye = e => { const n = +e.key; if (n >= 1 && n <= secenekler.length) sec(n - 1); };
}

// Harf göster: kelimenin ilk `acik` harfini açar, kalanları alt çizgi bırakır
// (basHarfler: çok kelimeli ifadelerde her kelimenin ilk harfi de açık)
function acikDesen(w, acik, basHarfler) {
  let n = 0;
  return w.replace(/\(.*?\)/g, '').trim().split(/\s+/).map(p =>
    [...p].map((ch, i) => /[A-Za-z]/.test(ch) ? (n++ < acik || (basHarfler && i === 0) ? ch : '_') : ch).join(' ')).join('   ');
}

function yazma(it, k, ipucuVar) {
  const ip = it.m === 'c' ? ipucuSec(k, 'c') : ipucuSec(k, 'p', Math.random() < 0.6 ? 'tr' : 'd');
  const ekler = ip.yuzey ? [ip.yuzey] : [];
  const hedef = ip.yuzey || k.w;
  const harfSay = (hedef.replace(/\(.*?\)/g, '').match(/[A-Za-z]/g) || []).length;
  let acik = ipucuVar ? 1 : 0;
  // Türkçe anlam ipucu yalnızca istenirse ("Anlamını göster") açılır
  const anlamVar = ip.tip !== 'tr';
  const trNot = anlamVar ? `<p class="soluk orta kucuk" id="anlamNot" hidden>Türkçesi: ${esc(k.tr)}</p>` : '';
  ana().innerHTML = `${ilerlemeCubugu()}<section class="sahne">
    <p class="ust-baslik">${ip.etiket} — İngilizcesini yaz</p>
    <div class="soru-ipucu ${ip.tip === 'c' ? 'cumle' : ''}">${ip.html}</div>
    ${trNot}
    <p class="desen" id="desen"></p>
    <form id="yazForm" class="yaz" autocomplete="off">
      <input id="cevap" spellcheck="false" autocapitalize="off" placeholder="cevabını yaz…" aria-label="Cevap">
      <button class="ana-btn">Kontrol</button>
      <button type="button" class="btn" id="harfGoster" title="Her dokunuşta bir harf açar">Harf göster</button>
      ${anlamVar ? '<button type="button" class="btn" id="anlamGoster">Anlamını göster</button>' : ''}
      <button type="button" class="btn" id="bilmiyorum">Bilmiyorum</button>
    </form><div id="geri"></div></section>`;
  ustBagla();
  const desenYaz = () => {
    const d = $('#desen');
    if (acik) { d.className = 'desen'; d.textContent = acikDesen(hedef, acik, ipucuVar); }
    else { d.className = 'desen soluk'; d.textContent = `${Metin.desen(k.w)} harf`; }
    // Son harf hiçbir zaman açılmaz; cevabı yine sen yazarsın
    if (acik >= harfSay - 1) $('#harfGoster').disabled = true;
  };
  desenYaz();
  const inp = $('#cevap'); inp.focus();
  $('#harfGoster').onclick = () => { if (acik < harfSay - 1) { acik++; desenYaz(); } inp.focus(); };
  if (anlamVar) $('#anlamGoster').onclick = () => { $('#anlamNot').hidden = false; $('#anlamGoster').disabled = true; inp.focus(); };
  let bitti = false;
  const bitir = (girdi) => {
    if (bitti) return; bitti = true;
    const s = girdi == null ? 'yanlis' : Metin.kontrol(girdi, k.w, ekler);
    const dogru = s !== 'yanlis';
    inp.disabled = true; inp.classList.add(dogru ? 'dogru' : 'yanlis'); $('#harfGoster').disabled = true;
    if (anlamVar) $('#anlamGoster').disabled = true;
    cevapla(it, dogru, girdi == null ? '(boş bıraktın)' : girdi.trim(), k.w);
    const not = s === 'yakin' ? `<span class="not">Küçük bir yazım hatası vardı, doğru saydım.</span>` : '';
    $('#geri').innerHTML = sonucHtml(k, dogru, not);
    if (P.ayar.otoSes) Ses.oku(k.w);
    setTimeout(sonrakiBagla, 0);
  };
  $('#yazForm').onsubmit = e => { e.preventDefault(); if (!bitti && inp.value.trim()) bitir(inp.value); else if (bitti) devam(); };
  $('#bilmiyorum').onclick = () => bitir(null);
}

function harfDizme(it, k) {
  const ip = ipucuSec(k, 'p', Math.random() < 0.5 ? 'tr' : 'd');
  const hedef = Metin.harfler(k.w);
  let harf = karistir([...hedef].map((h, i) => ({ h, i })));
  if (harf.map(x => x.h).join('') === hedef && hedef.length > 2) harf = harf.reverse();
  const kelimeBoy = k.w.replace(/\(.*?\)/g, '').trim().split(/[\s-]+/).map(p => p.replace(/[^A-Za-z]/g, '').length).filter(Boolean);
  const secilen = [];
  ana().innerHTML = `${ilerlemeCubugu()}<section class="sahne">
    <p class="ust-baslik">${ip.etiket} — harfleri sıraya diz</p>
    <div class="soru-ipucu">${ip.html}</div>
    <div class="dizi" id="dizi"></div>
    <div class="harfler" id="harfler">${harf.map((x, j) => `<button class="harf" data-j="${j}">${x.h}</button>`).join('')}</div>
    <div class="butonlar orta"><button class="btn" id="geriAl">⌫ Geri al</button><button class="btn" id="vazgec">Bilmiyorum</button></div>
    <div id="geri"></div></section>`;
  ustBagla();
  let bitti = false;
  const ciz = () => {
    let i = 0;
    $('#dizi').innerHTML = kelimeBoy.map(n => `<span class="grup">${Array.from({ length: n }, () => {
      const x = secilen[i++]; return `<span class="yuva">${x != null ? harf[x].h : ''}</span>`; }).join('')}</span>`).join('');
    document.querySelectorAll('#harfler .harf').forEach(b => b.disabled = bitti || secilen.includes(+b.dataset.j));
  };
  const bitir = (dogru) => {
    bitti = true; ciz(); cevapla(it, dogru, secilen.map(x => harf[x].h).join('') || '(boş bıraktın)', k.w);
    $('#dizi').classList.add(dogru ? 'dogru' : 'yanlis');
    $('#geri').innerHTML = sonucHtml(k, dogru);
    if (P.ayar.otoSes) Ses.oku(k.w);
    sonrakiBagla();
  };
  const ekle = j => {
    if (bitti || secilen.includes(j)) return;
    secilen.push(j); ciz();
    if (secilen.length === hedef.length) bitir(secilen.map(x => harf[x].h).join('') === hedef);
  };
  document.querySelectorAll('#harfler .harf').forEach(b => b.onclick = () => ekle(+b.dataset.j));
  $('#geriAl').onclick = () => { if (!bitti) { secilen.pop(); ciz(); } };
  $('#vazgec').onclick = () => !bitti && bitir(false);
  klavye = e => {
    if (bitti) return;
    if (e.key === 'Backspace') { e.preventDefault(); secilen.pop(); ciz(); return; }
    const h = e.key.toUpperCase();
    if (/^[A-Z]$/.test(h)) { const j = harf.findIndex((x, j) => x.h === h && !secilen.includes(j)); if (j >= 0) ekle(j); }
  };
  ciz();
}

function eslestirmeGoster(grup) {
  const satirlar = grup.map(it => {
    const k = KID.get(it.id);
    const ip = it.m === 'c' ? ipucuSec(k, 'c') : ipucuSec(k, 'p', Math.random() < 0.65 ? 'd' : 'tr');
    return { it, k, ip, secim: null };
  });
  const fazla = celdiriciler(satirlar[0].k, 2, 'w').filter(x => !satirlar.some(s => s.k.w.toLowerCase() === x.w.toLowerCase()));
  const banka = karistir([...satirlar.map(s => s.k.w), ...fazla.map(x => x.w)]);
  let aktif = 0, kontrolEdildi = false;

  ana().innerHTML = `${ilerlemeCubugu()}<section class="sahne genis">
    <p class="ust-baslik">Eşleştir — her ipucuna uyan İngilizce kelimeyi seç</p>
    <ol class="esle" id="esle"></ol>
    <div class="banka" id="banka"></div>
    <div class="butonlar orta"><button class="ana-btn" id="kontrol" disabled>Kontrol et</button></div>
    <div id="geri"></div></section>`;
  ustBagla();
  const ciz = () => {
    $('#esle').innerHTML = satirlar.map((s, i) => {
      const durumS = kontrolEdildi ? (s.secim === s.k.w ? 'dogru' : 'yanlis') : '';
      return `<li class="${i === aktif && !kontrolEdildi ? 'aktif' : ''} ${durumS}" data-i="${i}">
        <span class="etiket">${s.ip.tip === 'c' ? 'cümle' : s.ip.tip === 'd' ? 'tanım' : 'Türkçe'}</span>
        <span class="ipucu ${s.ip.tip === 'c' ? 'cumle' : ''}">${s.ip.html}</span>
        <button class="yuva-btn" data-i="${i}">${s.secim ? esc(s.secim) : '…'}</button>
        ${kontrolEdildi && s.secim !== s.k.w ? `<span class="duzeltme">✓ ${esc(s.k.w)}</span>` : ''}
        ${kontrolEdildi ? sesBtn(s.k.w) : ''}
      </li>`;
    }).join('');
    const kullanilan = satirlar.map(s => s.secim);
    $('#banka').innerHTML = banka.map((w, j) => `<button class="cip" data-j="${j}" ${kullanilan.includes(w) || kontrolEdildi ? 'disabled' : ''}>${esc(w)}</button>`).join('');
    $('#kontrol').disabled = kontrolEdildi || satirlar.some(s => !s.secim);
    $('#banka').hidden = $('#kontrol').hidden = kontrolEdildi;
    document.querySelectorAll('#esle li').forEach(li => li.onclick = e => {
      if (kontrolEdildi || e.target.closest('.ses')) return;
      const i = +li.dataset.i;
      if (e.target.closest('.yuva-btn') && satirlar[i].secim) satirlar[i].secim = null;
      aktif = i; ciz();
    });
    document.querySelectorAll('#banka .cip').forEach(b => b.onclick = () => {
      satirlar[aktif].secim = banka[+b.dataset.j];
      const bos = satirlar.findIndex(s => !s.secim);
      aktif = bos >= 0 ? bos : aktif; ciz();
    });
  };
  $('#kontrol').onclick = () => {
    kontrolEdildi = true;
    let d = 0;
    satirlar.forEach(s => { const ok = s.secim === s.k.w; if (ok) d++; cevapla(s.it, ok, s.secim || '', s.k.w); });
    ciz();
    $('#geri').innerHTML = `<div class="sonuc ${d === satirlar.length ? 'iyi' : 'kotu'}"><b>${d}/${satirlar.length} doğru.</b>
      ${d < satirlar.length ? '<span class="soluk">Yanlışlar birazdan tekrar gelecek.</span>' : ''}
      <button class="ana-btn" id="sonraki">Devam <kbd>Enter</kbd></button></div>`;
    sonrakiBagla();
  };
  klavye = e => {
    if (kontrolEdildi) return;
    const n = +e.key;
    if (n >= 1 && n <= banka.length) { const b = document.querySelectorAll('#banka .cip')[n - 1]; if (b && !b.disabled) b.click(); }
  };
  ciz();
}

function oturumSonu(erken = false) {
  const o = oturum; o.bitti = true; klavye = null;
  const toplam = o.dogru + o.yanlis;
  const plan = gunPlani(), kalan = plan.planli;
  ana().innerHTML = `<section class="sahne">
    <h1>${erken ? 'Ara verdin' : 'Tebrikler! 🎉'}</h1>
    <p>${o.tanitIdx ? `${o.tanitIdx} yeni kelimeyle tanıştın. ` : ''}${toplam ? `${toplam} alıştırmanın ${o.dogru} tanesini doğru cevapladın.` : ''}</p>
    ${toplam ? Karne.html(o.kayit, { baslik: 'Oturum karnesi' }) : ''}
    ${plan.doldu ? `<p class="soluk">${sinirMesaji()}</p>`
      : kalan ? `<p class="soluk">Bugün için ${kalan} alıştırma daha bekliyor. İstediğin zaman kaldığın yerden devam edebilirsin.</p>` : '<p class="soluk">Bugünkü tekrarların bitti. Yarın görüşürüz!</p>'}
    <div class="butonlar orta">
      <button class="ana-btn" data-git="bugun">Ana sayfa</button>
      ${kalan ? '<button class="btn" id="devamEt">Devam et</button>' : ''}
      <button class="btn" data-git="kagit">Yazdır-Çöz bulmacası hazırla</button>
      <button class="btn" data-git="oyun">Oyun oyna</button>
      ${plan.doldu ? '<button class="btn" data-git="etut">Etüt Köşesi</button>' : ''}
    </div></section>`;
  Karne.bagla();
  $('#devamEt')?.addEventListener('click', () => { oturum = oturumKur(); devam(); });
}

/* ================= Kâğıt bulmacalar (Yazdır-Çöz) ================= */
const KAGIT_TUR = {
  capraz: 'Çengel bulmaca',
  soz: 'Sözcük avı (ipuçlu)',
  yerlestir: 'Harf yerleştirme',
  bosluk: 'Boşluk doldurma ve eşleştirme',
};
let sonKagit = null;

function kaynakKelimeler(kaynak, n, lv = '', tp = '') {
  const t = bugun();
  const tanisilan = etiketSuz(K.filter(k => P.w[k.id]), lv, tp);
  if (kaynak === 'sozluk') return karistir(etiketSuz(K, lv, tp)).slice(0, n);
  let l;
  if (kaynak === 'vade') {
    const yakin = gunEkle(t, 2);
    l = tanisilan.map(k => ({ k, d: Math.min(...Object.values(P.w[k.id].m).map(v => v.d < yakin ? 0 : 1)) }))
      .filter(x => x.d === 0).map(x => x.k);
    l = karistir(l);
    if (l.length < n) l = l.concat(karistir(tanisilan.filter(k => !l.includes(k) && durum(k.id) === 'ogreniliyor')));
  } else if (kaynak === 'bugun') {
    l = karistir(tanisilan.filter(k => P.w[k.id].i === t));
  } else if (kaynak === 'zor') {
    l = tanisilan.filter(k => P.w[k.id].x > 0).sort((a, b) => P.w[b.id].x - P.w[a.id].x);
  } else l = karistir(tanisilan);
  return l.slice(0, n);
}

function ekranKagit() {
  const tanisilan = K.filter(k => P.w[k.id]).length;
  const bekleyen = P.kagit.filter(s => !s.notlandi);
  const a = P.ayar.kagit || { tur: 'capraz', kaynak: 'vade', adet: 12, ipucu: 'karisik', zorluk: 'orta' };
  ana().innerHTML = `
  <section class="panel">
    <h1>Yazdır-Çöz</h1>
    <p class="soluk">Bulmacayı hazırla, “Yazdır / PDF” ile çıktı al. Çözdükten sonra sonuçlarını buraya girersen tekrar takvimin de güncellenir.</p>
    ${tanisilan < 6 ? `<p class="uyari">Henüz ${tanisilan} kelimeyle tanıştın. Tanıştığın kelimelerden bulmaca için en az 6 kelime gerekiyor; şimdilik “Bütün sözlükten” seçeneğini kullanabilirsin.</p>` : ''}
    <form id="kagitForm" class="form-izgara">
      <label>Bulmaca türü
        <select name="tur">${Object.entries(KAGIT_TUR).map(([k, v]) => `<option value="${k}" ${a.tur === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Kelimeler
        <select name="kaynak">
          <option value="vade" ${a.kaynak === 'vade' ? 'selected' : ''}>Tekrar zamanı gelen / yaklaşanlar</option>
          <option value="bugun" ${a.kaynak === 'bugun' ? 'selected' : ''}>Bugün öğrendiklerim</option>
          <option value="zor" ${a.kaynak === 'zor' ? 'selected' : ''}>En çok zorlandıklarım</option>
          <option value="hepsi" ${a.kaynak === 'hepsi' ? 'selected' : ''}>Tanıştığım tüm kelimeler (rastgele)</option>
          <option value="sozluk" ${a.kaynak === 'sozluk' ? 'selected' : ''}>Bütün sözlükten (sınıf ve ödev için)</option>
        </select></label>
      ${etiketSecimHtml(a.lv, a.tp)}
      <label>Kelime sayısı <input type="number" name="adet" min="6" max="25" value="${a.adet}"></label>
      <label>İpucu türü
        <select name="ipucu">
          <option value="karisik" ${a.ipucu === 'karisik' ? 'selected' : ''}>Karışık</option>
          <option value="d" ${a.ipucu === 'd' ? 'selected' : ''}>İngilizce tanım</option>
          <option value="c" ${a.ipucu === 'c' ? 'selected' : ''}>Boşluklu cümle</option>
          <option value="tr" ${a.ipucu === 'tr' ? 'selected' : ''}>Türkçe anlam</option>
        </select></label>
      <label class="soz-ayar">Sözcük avı zorluğu
        <select name="zorluk">
          <option value="kolay" ${a.zorluk === 'kolay' ? 'selected' : ''}>Kolay (→ ↓)</option>
          <option value="orta" ${a.zorluk === 'orta' ? 'selected' : ''}>Orta (+ çapraz)</option>
          <option value="zor" ${a.zorluk === 'zor' ? 'selected' : ''}>Zor (+ ters yönler)</option>
        </select></label>
      <div class="butonlar"><button class="ana-btn">Bulmacayı oluştur</button></div>
    </form>
  </section>
  ${bekleyen.length ? `<section class="panel"><h2>Sonucu girilmemiş bulmacalar</h2>
    <ul class="kagit-liste">${bekleyen.map(s => `<li><button class="sil-x" data-sil="${esc(s.kod)}" title="Bu bulmacayı sil" aria-label="${esc(s.kod)} bulmacasını sil">×</button>
      <b>${esc(s.kod)}</b> ${esc(KAGIT_TUR[s.tur])} · ${s.ids.length} kelime · <span class="soluk">${esc(s.tarih)}</span>
      <button class="btn kucuk" data-not="${esc(s.kod)}">Sonuçları gir</button> <button class="btn kucuk" data-tekrar="${esc(s.kod)}">Tekrar yazdır</button></li>`).join('')}</ul></section>` : ''}
  <section id="onizleme"></section>`;
  $('#kagitForm').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    f.adet = Math.max(6, Math.min(25, +f.adet || 12));
    P.ayar.kagit = f; kaydet();
    const kelimeler = kaynakKelimeler(f.kaynak, f.adet + (f.tur === 'bosluk' ? 0 : 6), f.lv, f.tp);
    if (kelimeler.length < 4) { $('#onizleme').innerHTML = `<p class="uyari">Bu seçimle yeterli kelime bulunamadı. Seviye ya da konu seçimini genişletmeyi ya da “Bütün sözlükten” seçeneğini dene.</p>`; return; }
    kagitUret(f, kelimeler);
  };
  document.querySelectorAll('[data-not]').forEach(b => b.onclick = () => notGir(b.dataset.not));
  document.querySelectorAll('[data-sil]').forEach(b => b.onclick = () => {
    const kod = b.dataset.sil;
    if (!confirm(`${kod} bulmacası listeden silinsin mi? Sonuçları girilmediği için tekrar takvimin etkilenmez.`)) return;
    P.kagit = P.kagit.filter(x => x.kod !== kod); kaydet();
    bildir(`${kod} silindi`); ekranKagit();
  });
  document.querySelectorAll('[data-tekrar]').forEach(b => b.onclick = () => {
    const s = P.kagit.find(x => x.kod === b.dataset.tekrar);
    if (s?.html) { sonKagit = s; onizlemeGoster(s); }
  });
}

function kagitIpucu(k, tercih, izgara) {
  let tip = tercih === 'karisik' ? ['d', 'c', 'tr', 'd'][Math.floor(Math.random() * 4)] : tercih;
  if (tip === 'c') {
    const b = bosluklar(k).filter(x => !izgara || Metin.harfler(x.yuzey) === Metin.harfler(k.w));
    if (b.length) return esc(b[Math.floor(Math.random() * b.length)].duz).replace(/_____/g, '<span class="cizgi"></span>');
    tip = 'd';
  }
  if (tip === 'd' && k.d) return esc(Metin.gizle(k.d, k.w)).replace(/_____/g, '<span class="cizgi"></span>');
  return esc(k.tr);
}

function kagitUret(f, kelimeler) {
  P.kagitNo = (P.kagitNo || 0) + 1;
  const kod = 'B' + String(P.kagitNo).padStart(3, '0');
  const tarih = new Date().toLocaleDateString('tr-TR');
  let govde = '', cevap = '', ids = [], cIds = [];
  const baslik = (alt) => `<header class="k-baslik"><div><h1>${KAGIT_TUR[f.tur]}</h1><p>${alt}</p></div><div class="k-kod">${kod}<br><small>${tarih}</small><br><small class="k-imza">${UYGULAMA.ad}</small></div></header>`;

  if (f.tur === 'capraz' || f.tur === 'yerlestir') {
    const uygun = kelimeler.filter(k => Metin.izgarayaUygun(k.w)).slice(0, f.adet);
    const yer = Izgara.capraz(uygun.map(k => ({ ans: Metin.harfler(k.w), k })), { maxGen: 19, maxYuk: 22 });
    ids = yer.yerlesen.map(y => y.k.id);
    const tablo = (cozumlu) => {
      let h = `<div class="k-izgara" style="grid-template-columns:repeat(${yer.gen},var(--hucre))">`;
      for (let r = 0; r < yer.yuk; r++) for (let c = 0; c < yer.gen; c++) {
        const x = yer.hucre.get(r + ',' + c);
        const no = f.tur === 'capraz' ? yer.numara.get(r + ',' + c) : null;
        h += x ? `<div class="h">${no ? `<i>${no}</i>` : ''}${cozumlu ? x : ''}</div>` : '<div class="b"></div>';
      }
      return h + '</div>';
    };
    if (f.tur === 'capraz') {
      const liste = yon => yer.yerlesen.filter(y => y.yon === yon).sort((a, b) => a.no - b.no)
        .map(y => `<li><b>${y.no}.</b> ${kagitIpucu(y.k, f.ipucu, true)} <span class="desen">${Metin.desen(y.k.w)}</span></li>`).join('');
      govde = baslik('İpuçlarına uyan İngilizce kelimeleri kutulara yaz. Çok kelimeli ifadelerde boşluk yoktur; harf sayıları parantezde.')
        + tablo(false) + `<div class="k-ipuclari"><div><h3>Soldan sağa</h3><ol>${liste('A')}</ol></div><div><h3>Yukarıdan aşağı</h3><ol>${liste('D')}</ol></div></div>`;
    } else {
      const gruplar = {};
      yer.yerlesen.forEach(y => (gruplar[y.ans.length] ||= []).push(y));
      govde = baslik('Her ipucunun İngilizce karşılığını bul ve harf sayısına göre tabloya yerleştir. Kesişen harfler sana yardım eder.')
        + tablo(false) + `<div class="k-gruplar">${Object.keys(gruplar).sort((a, b) => a - b).map(n =>
          `<div><h3>${n} harf</h3><ul>${gruplar[n].map(y => `<li>☐ ${kagitIpucu(y.k, f.ipucu, true)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    }
    cevap = tablo(true) + `<ol class="k-cevap-liste">${yer.yerlesen.sort((a, b) => (a.no || 0) - (b.no || 0)).map(y => `<li>${f.tur === 'capraz' ? `${y.no}${y.yon === 'A' ? '→' : '↓'} ` : ''}<b>${esc(y.k.w)}</b> — ${esc(y.k.tr)}</li>`).join('')}</ol>`;
  } else if (f.tur === 'soz') {
    const uygun = kelimeler.filter(k => Metin.izgarayaUygun(k.w) && Metin.harfler(k.w).length <= 14).slice(0, f.adet);
    const s = Izgara.soz(uygun.map(k => ({ ans: Metin.harfler(k.w), k })), { boyut: f.adet > 14 ? 15 : 13, zorluk: f.zorluk });
    ids = s.yerlesen.map(y => y.k.id);
    const tablo = cozumlu => `<div class="k-soz" style="grid-template-columns:repeat(${s.n},var(--hucre))">${s.grid.map((sat, r) => sat.map((x, c) =>
      `<div class="${cozumlu && s.cozum.has(r + ',' + c) ? 'isik' : ''}">${x}</div>`).join('')).join('')}</div>`;
    govde = baslik('Önce her ipucunun İngilizce karşılığını yanına yaz, sonra tabloda bul ve çiz. Çok kelimeli ifadeler bitişik yazılmıştır.')
      + tablo(false) + `<ol class="k-soz-ipucu">${s.yerlesen.map(y => `<li>${kagitIpucu(y.k, f.ipucu, true)} <span class="desen">${Metin.desen(y.k.w)}</span> <span class="yazi-cizgi"></span></li>`).join('')}</ol>`;
    cevap = tablo(true) + `<ol class="k-cevap-liste">${s.yerlesen.map(y => `<li><b>${esc(y.k.w)}</b> — ${esc(y.k.tr)}</li>`).join('')}</ol>`;
  } else {
    // Boşluk doldurma + eşleştirme + Türkçeden İngilizceye
    const l = kelimeler.slice(0, f.adet);
    ids = l.map(k => k.id);
    const cumleli = l.filter(k => bosluklar(k).length);
    const A = cumleli.slice(0, Math.ceil(l.length * 0.45));
    cIds = A.map(k => k.id);
    const kalan = l.filter(k => !A.includes(k));
    const B = kalan.slice(0, Math.ceil(kalan.length / 2)), C = kalan.slice(B.length);
    const banka = (ks, ek) => `<div class="k-banka">${karistir([...ks.map(k => k.w), ...ek.map(k => k.w)]).map(w => `<span>${esc(w)}</span>`).join('')}</div>`;
    const ekA = celdiriciler(A[0] || l[0], 2, 'w'), ekB = celdiriciler(B[0] || l[0], 2, 'w');
    const cumle = k => { const b = bosluklar(k); return esc(b[Math.floor(Math.random() * b.length)].duz).replace(/_____/g, '<span class="cizgi uzun"></span>'); };
    govde = baslik('Kelimeleri bağlam içinde, tanımdan ve Türkçeden hatırla. Gerekirse fiilin biçimini cümleye uydur.')
      + (A.length ? `<h2>A. Cümleleri tamamla</h2>${banka(A, ekA)}<ol>${A.map(k => `<li>${cumle(k)}</li>`).join('')}</ol>` : '')
      + (B.length ? `<h2>B. Tanımı kelimeyle eşleştir</h2>${banka(B, ekB)}<ol>${B.map(k => `<li>${esc(Metin.gizle(k.d || k.tr, k.w))} <span class="yazi-cizgi"></span></li>`).join('')}</ol>` : '')
      + (C.length ? `<h2>C. İngilizcesini yaz (kelime havuzu yok)</h2><ol>${C.map(k => `<li>${esc(k.tr)} <span class="desen">${Metin.desen(k.w)}</span> <span class="yazi-cizgi"></span></li>`).join('')}</ol>` : '');
    cevap = `<ol class="k-cevap-liste">${[...A.map(k => ['A', k]), ...B.map(k => ['B', k]), ...C.map(k => ['C', k])].map(([b, k]) => `<li>${b}: <b>${esc(k.w)}</b> — ${esc(k.tr)}</li>`).join('')}</ol>`;
  }

  const imza = `<footer class="k-alt">${UYGULAMA.ad} · ${UYGULAMA.yazar} tarafından geliştirilmiştir</footer>`;
  govde += imza; cevap += imza;
  const html = `<div class="sayfa">${govde}</div><div class="sayfa cevap-sayfa"><header class="k-baslik"><div><h1>Cevap anahtarı</h1><p>${KAGIT_TUR[f.tur]}</p></div><div class="k-kod">${kod}</div></header>${cevap}</div>`;
  const kayit = { kod, tur: f.tur, cIds, tarih, gun: bugun(), ids, html, notlandi: false };
  P.kagit.push(kayit);
  // eski bulmacaların görüntüsünü sakla ama dosyayı şişirme
  P.kagit.forEach((s, i) => { if (i < P.kagit.length - 15) delete s.html; });
  if (P.kagit.length > 60) P.kagit = P.kagit.slice(-60);
  kaydet();
  sonKagit = kayit;
  onizlemeGoster(kayit);
}

function onizlemeGoster(s) {
  $('#onizleme').innerHTML = `<div class="onizleme-ust panel">
      <div><b>${esc(s.kod)}</b> hazır · ${s.ids.length} kelime</div>
      <div class="butonlar"><button class="ana-btn" id="yazdir">🖨 Yazdır / PDF olarak kaydet</button>
      <button class="btn" id="yeniden">Yeniden karıştır</button></div>
      <p class="soluk kucuk">Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçebilirsin. Cevap anahtarı ayrı sayfaya basılır.</p>
    </div><div id="baski" class="baski">${s.html}</div>`;
  $('#yazdir').onclick = () => window.print();
  $('#yeniden').onclick = () => {
    // aynı kelimelerle yeniden üret
    P.kagit = P.kagit.filter(x => x !== s);
    kagitUret(P.ayar.kagit, s.ids.map(id => KID.get(id)).filter(Boolean).concat(kaynakKelimeler(P.ayar.kagit.kaynak, 6)));
  };
  $('#onizleme').scrollIntoView({ behavior: 'smooth' });
}

function notGir(kod) {
  const s = P.kagit.find(x => x.kod === kod); if (!s) return;
  const ks = s.ids.map(id => KID.get(id)).filter(Boolean);
  $('#onizleme').innerHTML = `<section class="panel">
    <h2>${esc(kod)} — sonuçlar</h2>
    <p class="soluk">Cevap anahtarına bakarak <b>yanlış yaptığın ya da boş bıraktığın</b> kelimeleri işaretle. İşaretlemediklerin doğru sayılır.</p>
    <ul class="not-liste">${ks.map(k => `<li><label><input type="checkbox" value="${esc(k.id)}"> <b>${esc(k.w)}</b> <span class="soluk">— ${esc(k.tr)}</span></label></li>`).join('')}</ul>
    <div class="butonlar"><button class="ana-btn" id="notKaydet">Sonuçları kaydet</button></div></section>`;
  $('#notKaydet').onclick = () => {
    const yanlis = new Set([...document.querySelectorAll('.not-liste input:checked')].map(i => i.value));
    ks.forEach(k => {
      const mod = s.cIds?.includes(k.id) && P.w[k.id]?.m.c ? 'c' : 'p';
      if (P.w[k.id]) puanla(k.id, mod, !yanlis.has(k.id));
    });
    s.notlandi = true; kaydet();
    ekranKagit();
    $('#onizleme').innerHTML = `<p class="bilgi">Kaydedildi: ${ks.length - yanlis.size}/${ks.length} doğru. Yanlışların bir sonraki çalışmada karşına gelecek.</p>`;
  };
}

/* ================= Oyunlar (serbest, ilerlemeyi etkilemez) ================= */
function oyunHavuzu() {
  const t = K.filter(k => P.w[k.id] && Metin.izgarayaUygun(k.w));
  return t.length >= 5 ? t : K.filter(k => Metin.izgarayaUygun(k.w));
}
function ekranOyun(tur) {
  const havuzAz = K.filter(k => P.w[k.id]).length < 5;
  ana().innerHTML = `<section class="panel">
    <h1>Oyunlar</h1>
    <p class="soluk">Serbest oyunlar tekrar takvimini etkilemez; istediğin kadar oyna.${havuzAz ? ' Henüz az kelimeyle tanıştığın için tüm listeden soruluyor.' : ' Tanıştığın kelimelerden soruluyor.'}</p>
    <div class="butonlar orta">${[['adam', 'Çiçek büyüt'], ['harf', 'Karışık harfler'], ['esles', 'Kelime eşleştirme'], ['parcacik', 'Parçacık tamamlama']].map(([k, ad]) =>
      `<button class="${(tur || 'adam') === k ? 'ana-btn' : 'btn'}" data-oyun="${k}">${ad}</button>`).join('')}</div></section>
    <section class="sahne ${tur === 'esles' ? 'genis' : ''}" id="oyunAlani"></section>`;
  document.querySelectorAll('[data-oyun]').forEach(b => b.onclick = () => ekranOyun(b.dataset.oyun));
  if (tur === 'parcacik') return OyunParcacik.oyna($('#oyunAlani'));
  ({ harf: karisikOyun, esles: eslesOyun }[tur] || adamAsmaca)();
}

// Kelime eşleştirme: ipuçlarını kelime havuzuyla eşleştir. Çeldirici arttıkça zorlaşır.
function eslesOyun() {
  const A = (P.oyun.eslesAyar ||= { adet: 5, celdirici: 2, ipucu: 'karisik' });
  const havuz = oyunHavuzu();
  const sorular = karistir(havuz).slice(0, A.adet).map(k => {
    const tip = A.ipucu === 'karisik' ? ['tr', 'd', 'c'][Math.floor(Math.random() * 3)] : A.ipucu;
    return { k, ip: ipucuSec(k, tip === 'c' ? 'c' : 'p', tip), secim: null };
  });
  const cevaplar = new Set(sorular.map(s => s.k.w.toLowerCase()));
  const ekstra = karistir(K.filter(x => !cevaplar.has(x.w.toLowerCase()))).slice(0, A.celdirici).map(x => x.w);
  const banka = karistir([...sorular.map(s => s.k.w), ...ekstra]);
  let aktif = 0, bitti = false;
  const alan = $('#oyunAlani');
  const secenek = (ad, ad2, deger, liste) => `<label>${ad}<select data-ayar="${ad2}">${liste.map(([v, t]) => `<option value="${v}" ${String(deger) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  const ciz = () => {
    alan.innerHTML = `
      <div class="oyun-ayar">
        ${secenek('Soru sayısı', 'adet', A.adet, [3, 4, 5, 6, 7, 8].map(n => [n, n]))}
        ${secenek('Çeldirici kelime', 'celdirici', A.celdirici, [0, 1, 2, 3, 4, 5, 6, 8, 10].map(n => [n, n === 0 ? 'yok (en kolay)' : n >= 8 ? `${n} (çok zor)` : n]))}
        ${secenek('İpucu', 'ipucu', A.ipucu, [['karisik', 'Karışık'], ['tr', 'Türkçe anlam'], ['d', 'İngilizce tanım'], ['c', 'Boşluklu cümle']])}
        <span class="soluk kucuk">Zorluk: ${'★'.repeat(1 + Math.min(4, Math.floor(A.celdirici / 2)))}</span>
      </div>
      <ol class="esle">${sorular.map((s, i) => {
        const d = bitti ? (s.secim === s.k.w ? 'dogru' : 'yanlis') : '';
        return `<li class="${i === aktif && !bitti ? 'aktif' : ''} ${d}" data-i="${i}">
          <span class="etiket">${s.ip.tip === 'c' ? 'cümle' : s.ip.tip === 'd' ? 'tanım' : 'Türkçe'}</span>
          <span class="ipucu ${s.ip.tip === 'c' ? 'cumle' : ''}">${s.ip.html}</span>
          <button class="yuva-btn" data-i="${i}">${s.secim ? esc(s.secim) : '…'}</button>
          ${bitti && s.secim !== s.k.w ? `<span class="duzeltme">✓ ${esc(s.k.w)}</span>` : ''}
          ${bitti ? sesBtn(s.k.w) : ''}</li>`;
      }).join('')}</ol>
      ${bitti ? '' : `<div class="banka">${banka.map((w, j) => `<button class="cip" data-j="${j}" ${sorular.some(s => s.secim === w) ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`}
      <div class="butonlar orta">${bitti ? `<button class="ana-btn" id="eYeni">Yeni tur <kbd>Enter</kbd></button>`
        : `<button class="ana-btn" id="eKontrol" ${sorular.some(s => !s.secim) ? 'disabled' : ''}>Kontrol et</button>`}</div>
      ${bitti ? (() => { const d = sorular.filter(s => s.secim === s.k.w).length; return `<div class="sonuc ${d === sorular.length ? 'iyi' : 'kotu'}"><b>${d}/${sorular.length} doğru.</b> ${d === sorular.length ? 'Kusursuz tur! 🎉' : ''}</div>`; })() : ''}`;
    alan.querySelectorAll('[data-ayar]').forEach(sel => sel.onchange = () => {
      A[sel.dataset.ayar] = sel.dataset.ayar === 'ipucu' ? sel.value : +sel.value; kaydet(); eslesOyun();
    });
    alan.querySelectorAll('.esle li').forEach(li => li.onclick = e => {
      if (bitti || e.target.closest('.ses')) return;
      const i = +li.dataset.i;
      if (e.target.closest('.yuva-btn') && sorular[i].secim) sorular[i].secim = null;
      aktif = i; ciz();
    });
    alan.querySelectorAll('.cip').forEach(b => b.onclick = () => {
      sorular[aktif].secim = banka[+b.dataset.j];
      const bos = sorular.findIndex(s => !s.secim); if (bos >= 0) aktif = bos; ciz();
    });
    $('#eKontrol')?.addEventListener('click', () => {
      bitti = true;
      const tam = sorular.every(s => s.secim === s.k.w);
      const o = (P.oyun.esles ||= { tur: 0, tam: 0, dogru: 0 });
      o.tur++; o.dogru += sorular.filter(s => s.secim === s.k.w).length; if (tam) o.tam++;
      kaydet(); Basari.kontrol(); ciz();
    });
    $('#eYeni')?.addEventListener('click', eslesOyun);
  };
  klavye = e => {
    if (bitti) { if (e.key === 'Enter') { e.preventDefault(); eslesOyun(); } return; }
    const n = +e.key; const c = alan.querySelectorAll('.cip')[n - 1];
    if (n >= 1 && c && !c.disabled) c.click();
  };
  ciz();
}

// Çiçek büyüt: harf tahmin oyunu. Doğru harfler fideyi büyütür, kelime tamamlanınca çiçek açar.
// Yanlış tahmin bir su damlası harcatır; damlalar biterse çiçek bu sefer açmaz. (İç anahtar "adam" geriye dönük uyumluluk için korunur.)
function cicekSvg(oran, acti, kurudu) {
  const boy = Math.round(8 + 78 * oran);           // gövde uzunluğu
  const ust = 112 - boy;                            // gövdenin tepe noktası
  const yaprak = (y, sag) => `<path d="M60 ${y} q ${sag ? 22 : -22} -6 ${sag ? 26 : -26} -20 q ${sag ? -16 : 16} 2 ${sag ? -26 : 26} 20z" class="ck-yaprak"/>`;
  const parcalar = [];
  parcalar.push(`<path d="M60 112 L60 ${ust}" class="ck-govde"/>`);
  if (oran > 0.25) parcalar.push(yaprak(Math.min(104, ust + boy * 0.7), true));
  if (oran > 0.5) parcalar.push(yaprak(Math.min(100, ust + boy * 0.45), false));
  if (acti) {
    const tac = [0, 72, 144, 216, 288].map(a => `<ellipse cx="60" cy="${ust - 12}" rx="9" ry="15" transform="rotate(${a} 60 ${ust})" class="ck-tac"/>`).join('');
    parcalar.push(`<g class="ck-cicek">${tac}<circle cx="60" cy="${ust}" r="7" class="ck-gobek"/></g>`);
  } else if (oran > 0.8) parcalar.push(`<ellipse cx="60" cy="${ust - 6}" rx="7" ry="10" class="ck-tomurcuk"/>`);
  else parcalar.push(`<circle cx="60" cy="${ust}" r="3.5" class="ck-filiz"/>`);
  return `<svg viewBox="0 0 120 150" class="cicek ${kurudu ? 'kurudu' : ''}" aria-hidden="true">
    ${parcalar.join('')}
    <path d="M30 112 h60 l-7 32 h-46z" class="ck-saksi"/><rect x="26" y="106" width="68" height="10" rx="3" class="ck-saksi-agiz"/>
  </svg>`;
}
function adamAsmaca() {
  const k = oyunHavuzu()[Math.floor(Math.random() * oyunHavuzu().length)];
  const hedef = k.w.replace(/\(.*?\)/g, '').trim().toUpperCase();
  const tahmin = new Set(); let hata = 0; const MAX = 7; let bitti = false;
  const alan = $('#oyunAlani');
  const harfSay = new Set([...hedef].filter(ch => /[A-Z]/.test(ch))).size;
  const ciz = () => {
    const kazandi = [...hedef].every(ch => !/[A-Z]/.test(ch) || tahmin.has(ch));
    bitti = kazandi || hata >= MAX;
    const bulunan = [...new Set([...hedef].filter(ch => /[A-Z]/.test(ch) && tahmin.has(ch)))].length;
    const oran = kazandi ? 1 : bulunan / Math.max(1, harfSay);
    alan.innerHTML = `<div class="adam">
      <div class="cicek-kutu">${cicekSvg(oran, kazandi, !kazandi && bitti)}
        <div class="damlalar" aria-label="${MAX - hata} su damlası kaldı">${Array.from({ length: MAX }, (_, i) => `<span class="${i < MAX - hata ? '' : 'bos'}">💧</span>`).join('')}</div></div>
      <div><p class="ust-baslik">İpucu</p><div class="soru-ipucu">${esc(k.tr)}</div>${k.d ? `<p class="soluk">${esc(Metin.gizle(k.d, k.w))}</p>` : ''}
      <p class="adam-kelime">${[...hedef].map(ch => /[A-Z]/.test(ch) ? `<span>${tahmin.has(ch) || bitti ? ch : '&nbsp;'}</span>` : `<b>${ch === ' ' ? '&nbsp;&nbsp;' : esc(ch)}</b>`).join('')}</p>
      <p class="soluk">Her doğru harf fideni büyütür; yanlış tahmin bir su damlası harcar. Kalan su: ${MAX - hata}</p></div></div>
      <div class="klavye">${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(sira => `<div class="klavye-sira">${[...sira].map(h =>
        `<button class="harf ${tahmin.has(h) ? (hedef.includes(h) ? 'var' : 'yok') : ''}" data-h="${h}" ${tahmin.has(h) || bitti ? 'disabled' : ''}>${h}</button>`).join('')}</div>`).join('')}</div>
      ${bitti ? `<div class="sonuc ${kazandi ? 'iyi' : 'kotu'}"><b>${kazandi ? 'Çiçeğin açtı! 🌸' : 'Su bitti; bu çiçek bir dahaki sefere.'}</b> ${esc(k.w)} ${sesBtn(k.w)} <span class="soluk">— ${esc(k.tr)}</span>
        <button class="ana-btn" id="yeniOyun">Yeni tohum <kbd>Enter</kbd></button></div>` : ''}`;
    alan.querySelectorAll('.klavye .harf').forEach(b => b.onclick = () => tahminEt(b.dataset.h));
    $('#yeniOyun')?.addEventListener('click', adamAsmaca);
    if (bitti) Ses.oku(k.w);
  };
  const tahminEt = h => {
    if (bitti || tahmin.has(h)) return; tahmin.add(h); if (!hedef.includes(h)) hata++; ciz();
    if (bitti) { const a = (P.oyun.adam ||= { oyun: 0, kazan: 0 }); a.oyun++; if (hata < MAX) a.kazan++; kaydet(); Basari.kontrol(); }
  };
  klavye = e => {
    if (bitti && e.key === 'Enter') return adamAsmaca();
    const h = e.key.toUpperCase(); if (/^[A-Z]$/.test(h)) tahminEt(h);
  };
  ciz();
}

function karisikOyun() {
  let puan = 0, seri = 0;
  const tur = () => {
    const h = oyunHavuzu(); const k = h[Math.floor(Math.random() * h.length)];
    const parcalar = k.w.replace(/\(.*?\)/g, '').trim().split(/\s+/);
    const karisik = parcalar.map(p => { let x = karistir([...p.toUpperCase()]).join(''); if (x === p.toUpperCase() && p.length > 2) x = [...x].reverse().join(''); return x; });
    $('#oyunAlani').innerHTML = `<p class="ust-baslik">Harfleri düzelt · Puan ${puan} · Seri ${seri}</p>
      <div class="karisik">${karisik.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      <p class="orta soluk">İpucu: ${esc(k.tr)}</p>
      <form id="kForm" class="yaz" autocomplete="off"><input id="kCevap" spellcheck="false" placeholder="kelimeyi yaz…" aria-label="Cevap"><button class="ana-btn">Kontrol</button><button type="button" class="btn" id="kPas">Pas</button></form>
      <div id="kGeri"></div>`;
    const inp = $('#kCevap'); inp.focus(); let bitti = false;
    const son = ok => {
      bitti = true; inp.disabled = true;
      if (ok) { puan += 10 + seri * 2; seri++; } else seri = 0;
      const h = (P.oyun.harf ||= { oyun: 0, dogru: 0 }); h.oyun++; if (ok) h.dogru++; kaydet(); Basari.kontrol();
      $('#kGeri').innerHTML = `<div class="sonuc ${ok ? 'iyi' : 'kotu'}"><b>${ok ? 'Doğru!' : 'Cevap:'}</b> ${esc(k.w)} ${sesBtn(k.w)}<button class="ana-btn" id="kSonraki">Sonraki <kbd>Enter</kbd></button></div>`;
      $('#kSonraki').onclick = tur; $('#kSonraki').focus();
      Ses.oku(k.w);
    };
    $('#kForm').onsubmit = e => { e.preventDefault(); if (bitti) return tur(); if (inp.value.trim()) son(Metin.kontrol(inp.value, k.w) !== 'yanlis'); };
    $('#kPas').onclick = () => !bitti && son(false);
    klavye = null;
  };
  tur();
}

/* Sözlük, istatistikler ve başarılar: app/sozluk.js, app/istatistik.js, app/basari.js */

/* ================= Ayarlar, yedek ve senkron ================= */
function ekranAyar() {
  const sesler = Ses.liste();
  ana().innerHTML = `<section class="panel">
    <h1>Ayarlar</h1>
    <form id="ayarForm" class="form-izgara">
      <label>Günlük yeni kelime sayısı <input type="number" name="gunluk" min="0" max="50" value="${P.ayar.gunluk}"></label>
      <label>Günlük soru sınırı
        <select name="sinir">${SINIR_SECENEK.map(n => `<option value="${n}" ${+P.ayar.sinir === n ? 'selected' : ''}>${n} soru${n === 50 ? ' (önerilen)' : ''}</option>`).join('')}</select>
        <small class="soluk">Günlük rutinde sorulacak en fazla soru. Fazlası yarına kalır, böylece tekrarlar seni bunaltmaz.</small></label>
      <label>Ses
        <select name="ses"><option value="">Otomatik (İngiliz İngilizcesi öncelikli)</option>
        ${sesler.map(v => `<option value="${esc(v.name)}" ${v.name === P.ayar.ses ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
      <label>Konuşma hızı <input type="range" name="hiz" min="0.6" max="1.2" step="0.05" value="${P.ayar.hiz}"></label>
      <label class="yan"><input type="checkbox" name="yds" ${P.ayar.yds !== false ? 'checked' : ''}> Günlük rutinin sonunda 5 YDS / YÖKDİL tarzı soru sor</label>
      <label class="yan"><input type="checkbox" name="otoSes" ${P.ayar.otoSes ? 'checked' : ''}> Kelimeleri otomatik seslendir</label>
      <div class="butonlar"><button class="ana-btn">Kaydet</button><button type="button" class="btn" data-oku="This is how I sound.">Sesi dene</button></div>
    </form>
    ${!Ses.var() ? '<p class="uyari">Bu tarayıcıda İngilizce ses bulunamadı. Dinleme alıştırmaları yazılı olarak sorulacak.</p>' : ''}
  </section>
  <section class="panel">
    <h2>Görünüm</h2>
    <p class="soluk">Bir tema seç; anında uygulanır. “Sistem”, cihazının açık/koyu ayarını izler. Tema seçimin, ilerlemenle birlikte diğer cihazlarına da taşınır.</p>
    <div class="tema-liste" id="temaListe">
      ${[Tema.SISTEM, ...Object.keys(Tema.HAZIR), Tema.OZEL].map(ad => `<button class="tema-kart ${P.ayar.tema === ad ? 'secili' : ''}" data-tema="${esc(ad)}">
        ${Tema.ornek(ad, P.ayar.ozelTema)}<span>${esc(ad)}</span></button>`).join('')}
    </div>
    <div id="ozelTema" ${P.ayar.tema === Tema.OZEL ? '' : 'hidden'}>
      <h3>Özel tema</h3>
      <div class="renk-izgara">${Tema.ROLLER.map(([k, ad]) => `<label><input type="color" data-rol="${k}" value="${esc(Tema.renkler(Tema.OZEL, P.ayar.ozelTema)[k])}"> ${esc(ad)}</label>`).join('')}</div>
      <div class="butonlar"><span class="soluk kucuk">Hazır bir temadan başla:</span>
        ${Object.keys(Tema.HAZIR).map(ad => `<button class="btn kucuk" data-temel="${esc(ad)}">${esc(ad)}</button>`).join('')}</div>
    </div>
  </section>
  ${Kurulum.yuklu() ? '' : `<section class="panel">${Kurulum.html('ayar')}</section>`}
  <section class="panel">
    <h2>Telefon ve bilgisayarlar arasında ilerleme</h2>
    ${Bulut.ayarHtml()}
  </section>
  ${Senkron.destek ? `<section class="panel">
    <h2>İlerleme dosyası (yalnızca bilgisayarda)</h2>
    ${Senkron.ayarHtml()}
  </section>` : ''}
  <section class="panel">
    <h2>Yedek</h2>
    <p class="soluk">İlerlemen bu tarayıcıda saklanır. Senkron dosyası kullanmıyorsan ara sıra yedek al.</p>
    <div class="butonlar"><button class="btn" id="yedekAl">Yedeği indir</button>
      <label class="btn">Yedekten yükle<input type="file" id="yedekYukle" accept=".json,application/json" hidden></label>
      <button class="btn tehlike" id="sifirla">Tüm ilerlemeyi sıfırla</button></div>
  </section>`;
  $('#ayarForm').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    P.ayar.gunluk = Math.max(0, Math.min(50, +f.get('gunluk') || 0));
    P.ayar.sinir = SINIR_SECENEK.includes(+f.get('sinir')) ? +f.get('sinir') : 50;
    P.ayar.ses = f.get('ses'); P.ayar.hiz = +f.get('hiz'); P.ayar.otoSes = !!f.get('otoSes'); P.ayar.yds = !!f.get('yds');
    kaydet(); bildir('Ayarlar kaydedildi');
  };
  // Tema seçimi
  document.querySelectorAll('[data-tema]').forEach(b => b.onclick = () => {
    P.ayar.tema = b.dataset.tema; temaUygula(); kaydet();
    document.querySelectorAll('[data-tema]').forEach(x => x.classList.toggle('secili', x === b));
    $('#ozelTema').hidden = P.ayar.tema !== Tema.OZEL;
  });
  const ozelOnizle = () => {
    const kart = document.querySelector(`[data-tema="${Tema.OZEL}"] .tema-ornek`);
    if (kart) kart.outerHTML = Tema.ornek(Tema.OZEL, P.ayar.ozelTema);
  };
  document.querySelectorAll('[data-rol]').forEach(inp => inp.oninput = () => {
    P.ayar.ozelTema = { ...Tema.renkler(Tema.OZEL, P.ayar.ozelTema), [inp.dataset.rol]: inp.value };
    temaUygula(); ozelOnizle();
  });
  document.querySelectorAll('[data-rol]').forEach(inp => inp.onchange = () => kaydet());
  document.querySelectorAll('[data-temel]').forEach(b => b.onclick = () => {
    P.ayar.ozelTema = { ...Tema.HAZIR[b.dataset.temel] };
    document.querySelectorAll('[data-rol]').forEach(inp => inp.value = P.ayar.ozelTema[inp.dataset.rol]);
    temaUygula(); ozelOnizle(); kaydet();
  });

  $('#yedekAl').onclick = () => indir(`anadilimgibi-ilerleme-${bugun()}.json`, JSON.stringify(P));
  $('#yedekYukle').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const x = JSON.parse(await f.text());
      if (!x.w || !x.ayar) throw new Error('biçim');
      if (!confirm('Bu yedek mevcut ilerlemenin yerine geçecek. Emin misin?')) return;
      P = x; tamamla(); kaydet(); bildir('Yedek yüklendi'); git('bugun');
    } catch (err) { alert('Bu dosya geçerli bir yedek değil.'); }
  };
  $('#sifirla').onclick = () => {
    if (confirm('Tüm ilerleme silinecek (önce yedek almanı öneririm). Emin misin?') && confirm('Gerçekten sıfırlansın mı?')) {
      const { tema, ozelTema } = P.ayar;
      const sozluk = confirm('Sözlükte yaptığın ekleme/düzenleme/silmeler de silinsin mi?\n\nTamam: evet, sözlüğü de sıfırla\nİptal: sözlük değişikliklerim kalsın') ? {} : P.sozluk;
      P = yeniIlerleme(); Object.assign(P.ayar, { tema, ozelTema }); P.sozluk = sozluk; tamamla(); kaydet(); git('bugun');
    }
  };
  Senkron.ayarBagla();
  Bulut.ayarBagla();
  Kurulum.bagla();
}
function indir(ad, metin) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([metin], { type: 'application/json' }));
  a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function bildir(m) {
  const d = document.createElement('div'); d.className = 'bildirim'; d.textContent = m;
  document.body.appendChild(d); setTimeout(() => d.remove(), 2500);
}

// Senkron dosyası: OneDrive / Google Drive / USB klasöründeki bir JSON dosyasına otomatik yazar.
const Senkron = (() => {
  const destek = 'showSaveFilePicker' in window && 'indexedDB' in window;
  let tutamak = null, izin = false, zamanlayici = null, durumMetni = '';
  const SON = 'kelimeBulmaca.sonSenkron';

  function db() {
    return new Promise((ok, hata) => {
      const r = indexedDB.open('kelimeBulmaca', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('h');
      r.onsuccess = () => ok(r.result); r.onerror = () => hata(r.error);
    });
  }
  async function hGet() { try { const d = await db(); return await new Promise(ok => { const q = d.transaction('h').objectStore('h').get('dosya'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch (e) { return null; } }
  async function hSet(v) { try { const d = await db(); d.transaction('h', 'readwrite').objectStore('h').put(v, 'dosya'); } catch (e) { } }

  async function baslat() {
    if (!destek) return;
    tutamak = await hGet();
    if (!tutamak) return;
    try { izin = (await tutamak.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { izin = false; }
    if (izin) await esitle(); else yenile();
  }
  async function baglan() {
    try {
      izin = (await tutamak.requestPermission({ mode: 'readwrite' })) === 'granted';
      if (izin) await esitle();
    } catch (e) { durumMetni = 'Bağlanılamadı: ' + e.message; }
    yenile();
  }
  // Dosyadakiyle karşılaştır: hangisi yeniyse onu kullan
  async function esitle() {
    try {
      const dosya = await tutamak.getFile();
      const metin = await dosya.text();
      let uzak = null; try { uzak = metin.trim() ? JSON.parse(metin) : null; } catch (e) { }
      const son = +localStorage.getItem(SON) || 0;
      // Koruma: dosyada hiç kelime ilerlemesi yoksa ama bu bilgisayarda varsa,
      // dosya daha yeni görünse bile buradaki ilerlemeyi ezme; dosyaya bunu yaz.
      const uzakBos = uzak && uzak.w && Object.keys(uzak.w).length === 0;
      const yerelDolu = P.w && Object.keys(P.w).length > 0;
      if (uzak && uzak.w && uzak.updated > P.updated && !(uzakBos && yerelDolu)) {
        const yerelDegisti = P.updated > son + 1000 && Object.keys(P.w).length > 0;
        if (!yerelDegisti || confirm('Senkron dosyasında daha yeni ilerleme var, ama bu bilgisayarda da dosyaya yazılmamış çalışma görünüyor.\n\nTamam: dosyadakini kullan\nİptal: bu bilgisayardakini kullan (dosyanın üzerine yazılır)')) {
          P = uzak; tamamla();
          try { localStorage.setItem(LS, JSON.stringify(P)); } catch (e) { }
          localStorage.setItem(SON, String(P.updated));
          durumMetni = 'Dosyadaki ilerleme yüklendi.';
          git(aktifEkran === 'calis' ? 'bugun' : aktifEkran);
          return;
        }
      }
      await yaz();
      durumMetni = 'Senkron dosyası güncel.';
    } catch (e) { izin = false; durumMetni = 'Dosya okunamadı: ' + e.message; }
    yenile();
  }
  async function yaz() {
    if (!tutamak || !izin) return;
    const w = await tutamak.createWritable();
    await w.write(JSON.stringify(P)); await w.close();
    localStorage.setItem(SON, String(P.updated));
  }
  function planla() {
    if (!tutamak || !izin) return;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => yaz().catch(e => { izin = false; durumMetni = 'Yazılamadı: ' + e.message; yenile(); }), 1200);
  }
  async function dosyaSec(yeni) {
    try {
      const h = yeni
        ? await window.showSaveFilePicker({ suggestedName: 'anadilimgibi-ilerleme.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] })
        : (await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] }))[0];
      tutamak = h; await hSet(h);
      izin = (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
      if (izin) await esitle();
    } catch (e) { if (e.name !== 'AbortError') durumMetni = 'Hata: ' + e.message; }
    yenile();
  }
  async function birak() { tutamak = null; izin = false; await hSet(null); durumMetni = 'Senkron kapatıldı.'; yenile(); }
  function yenile() { if (aktifEkran === 'ayar' || aktifEkran === 'bugun') { const s = window.scrollY; git(aktifEkran); window.scrollTo(0, s); } }

  function bantHtml() {
    if (!tutamak || izin) return '';
    return `<div class="bant">İlerleme dosyana (<b>${esc(tutamak.name)}</b>) bağlanmak için izin gerekiyor. <button class="ana-btn kucuk" id="sBaglan">Bağlan ve eşitle</button></div>`;
  }
  function bantBagla() { $('#sBaglan')?.addEventListener('click', baglan); }
  function ayarHtml() {
    if (!destek) return `<p>Bu tarayıcı dosyaya otomatik yazmayı desteklemiyor (Chrome veya Edge destekler).
      Bilgisayarların arasında <b>Yedeği indir</b> ve <b>Yedekten yükle</b> ile taşıyabilirsin.</p>`;
    return `<p class="soluk">Uygulama klasörünü OneDrive / Google Drive gibi kullandığın tüm bilgisayarlarda eşitlenen bir klasöre koy.
      Sonra burada bir <b>ilerleme dosyası</b> seç: her cevaptan sonra otomatik olarak o dosyaya yazılır,
      uygulama açılınca da dosyadaki daha yeni ilerleme alınır. Bulut kullanamıyorsan aynı dosyayı USB bellekte taşıyabilirsin.</p>
      ${tutamak ? `<p>Bağlı dosya: <b>${esc(tutamak.name)}</b> — ${izin ? '<span class="iyi-yazi">bağlı ✓</span>' : '<span class="kotu-yazi">izin bekliyor</span>'}</p>` : ''}
      <div class="butonlar">
        ${tutamak && !izin ? '<button class="ana-btn" id="sBaglan2">Bağlan ve eşitle</button>' : ''}
        <button class="btn" id="sYeni">Yeni ilerleme dosyası oluştur</button>
        <button class="btn" id="sAc">Var olan dosyayı seç (diğer bilgisayarlar)</button>
        ${tutamak ? '<button class="btn" id="sBirak">Senkronu kapat</button>' : ''}
      </div>
      ${durumMetni ? `<p class="bilgi">${esc(durumMetni)}</p>` : ''}`;
  }
  function ayarBagla() {
    $('#sYeni')?.addEventListener('click', () => dosyaSec(true));
    $('#sAc')?.addEventListener('click', () => dosyaSec(false));
    $('#sBaglan2')?.addEventListener('click', baglan);
    $('#sBirak')?.addEventListener('click', birak);
  }
  // sekme kapanırken bekleyen yazımı hemen yap
  window.addEventListener('pagehide', () => { if (zamanlayici) { clearTimeout(zamanlayici); yaz(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tutamak && izin) esitle(); });
  return { destek, baslat, planla, bantHtml, bantBagla, ayarHtml, ayarBagla };
})();

/* Hakkında, karşılama ve kılavuz ekranları: vitrin.js */

/* ================= Başlat ================= */
yukle();
{ const h = location.hash.slice(1); let ilk = EKRANLAR.includes(h) && h !== 'calis' ? h : 'bugun';
  // Uygulama her açılışta karşılama (ana sayfa) ile başlar; belirli bir bölümün bağlantısıyla gelindiyse o bölüm açılır
  if (!h || h === 'bugun') ilk = 'karsilama';
  history.replaceState({ ekran: ilk }, '', '#' + ilk); aktifEkran = ilk; git(ilk, false); }
// Ana ekrana eklenebilen uygulama: dosyaları önbelleğe al, internetsiz de açılsın
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
Senkron.baslat();
Bulut.baslat();
// Anonim ziyaret sayımı (yalnızca anadilimgibi.com'da)
if (ZIYARET_SAYACI.kod && location.hostname.replace(/^www\./, '') === ZIYARET_SAYACI.alanAdi) {
  const sc = document.createElement('script');
  sc.async = true; sc.src = 'https://gc.zgo.at/count.js';
  sc.dataset.goatcounter = `https://${ZIYARET_SAYACI.kod}.goatcounter.com/count`;
  document.head.appendChild(sc);
}
Basari.kontrol();
