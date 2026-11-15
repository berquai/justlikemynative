// AnadilimGibi — Sözlük: arama, kelime ekleme, düzenleme, silme
// Copyright (C) 2026 Berkay Çelik
'use strict';

/* ---------- Genel modal ---------- */
function modal(icerik, { genis = false } = {}) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-ic ${genis ? 'genis' : ''}" role="dialog" aria-modal="true">${icerik}</div>`;
  document.body.appendChild(m);
  const eskiKlavye = klavye;
  const kapat = () => { m.remove(); klavye = eskiKlavye; document.removeEventListener('keydown', esc_); };
  // Kazara kapanmaya karşı: forma bir şey yazıldıysa dış tıklama / Esc / geri tuşu önce sorar
  let degisti = false;
  m.addEventListener('input', () => { degisti = true; }, true);
  const istekKapat = () => {
    if (degisti && !confirm('Girdiğin bilgiler kaydedilmeden kapanacak. Pencere kapatılsın mı?')) return false;
    kapat(); return true;
  };
  m._istekKapat = istekKapat;
  const esc_ = e => { if (e.key === 'Escape' && !e.isComposing) istekKapat(); };
  document.addEventListener('keydown', esc_);
  klavye = null;
  // Yalnızca basma da bırakma da dış alanda olduysa kapat. Kutuda metin seçerken fare dışarıda
  // bırakılınca tarayıcı bunu dış alana "tıklama" sayar; eskiden pencere bu yüzden kapanıyordu.
  let distaBasildi = false;
  m.addEventListener('pointerdown', e => { distaBasildi = e.target === m; });
  m.onclick = e => { if (e.target === m && distaBasildi) istekKapat(); distaBasildi = false; };
  m.querySelectorAll('[data-kapat]').forEach(b => b.onclick = kapat);
  return { el: m, kapat };
}

/* ---------- Yardımcılar ---------- */
const anahtar = w => String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
function mevcutKelime(w) {
  const a = anahtar(w);
  if (!a) return null;
  return KID.get(a) || K.find(k => anahtar(k.w) === a) || null;
}
function kaynakAd(id) {
  const o = P.sozluk[id];
  if (o && o.kaynak === 'ekle') return { kod: 'ekle', ad: 'Senin eklediğin' };
  if (o && !o.silindi) return { kod: 'duzen', ad: 'Düzenlendi' };
  return { kod: 'excel', ad: 'Hazır liste' };
}
function silinenler() {
  return Object.entries(P.sozluk).filter(([, v]) => v === null || (v && v.silindi)).map(([id, v]) => {
    const taban = K_TABAN.find(k => k.id === id) || {};
    return { id, ...taban, ...(v || {}) };
  });
}
function gunMetni(ds) {
  if (!ds) return '—';
  if (ds === MEZUN) return 'mezun';
  const fark = Math.round((new Date(ds + 'T12:00') - new Date(bugun() + 'T12:00')) / 864e5);
  if (fark <= 0) return 'bugün';
  if (fark === 1) return 'yarın';
  return `${fark} gün sonra`;
}

/* ---------- Sözlük ekranı ---------- */
const GOSTER = [20, 50, 100, 200];
const SozlukDurum = { q: '', durum: '', kaynak: '', harf: '', lv: '', tp: '', sayfa: 0,
  boyut: (() => { try { const n = +localStorage.getItem('kelimeBulmaca.sozlukBoyut'); return GOSTER.includes(n) ? n : 20; } catch (e) { return 20; } })() };

function ekranSozluk() {
  const S = SozlukDurum;
  const harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const ek = Object.values(P.sozluk).filter(v => v && v.kaynak === 'ekle' && !v.silindi).length;
  const duz = Object.entries(P.sozluk).filter(([, v]) => v && v.kaynak !== 'ekle' && !v.silindi).length;
  const sil = silinenler().length;
  ana().innerHTML = `
  <section class="panel">
    <div class="baslik-satir">
      <div><h1>Sözlük</h1><p class="soluk">${K.length.toLocaleString('tr-TR')} kelime · ${ek} eklediğin · ${duz} düzenlediğin${sil ? ` · ${sil} silinen` : ''}</p></div>
      <div class="butonlar ust0"><button class="ana-btn" id="yeniKelime">+ Yeni kelime</button><button class="btn" id="csvAl" title="Excel'de açılabilir">⬇ Listeyi indir (CSV)</button></div>
    </div>
    <div class="liste-ust">
      <input id="ara" type="search" placeholder="Ara: İngilizce, Türkçe ya da tanım…" aria-label="Sözlükte ara" value="${esc(S.q)}">
      <select id="fDurum" aria-label="Duruma göre süz"><option value="">Tüm durumlar</option>${DURUM_SIRA.map(d => `<option value="${d}" ${S.durum === d ? 'selected' : ''}>${DURUM_AD[d]}</option>`).join('')}</select>
      <select id="fKaynak" aria-label="Kaynağa göre süz">
        <option value="">Tüm kaynaklar</option>
        <option value="excel" ${S.kaynak === 'excel' ? 'selected' : ''}>Hazır liste</option>
        <option value="ekle" ${S.kaynak === 'ekle' ? 'selected' : ''}>Eklediklerim</option>
        <option value="duzen" ${S.kaynak === 'duzen' ? 'selected' : ''}>Düzenlediklerim</option>
        <option value="silinen" ${S.kaynak === 'silinen' ? 'selected' : ''}>Silinenler</option>
      </select>
      ${etiketSecimHtml(S.lv, S.tp, { etiketli: false })}
      <label class="goster">Göster <select id="fBoyut" aria-label="Sayfadaki satır sayısı">${GOSTER.map(n => `<option value="${n}" ${S.boyut === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    </div>
    <div class="harf-dizin" role="group" aria-label="Harfe göre">
      <button class="${!S.harf ? 'aktif' : ''}" data-harf="">Tümü</button>${harfler.map(h => `<button class="${S.harf === h ? 'aktif' : ''}" data-harf="${h}">${h}</button>`).join('')}
    </div>
    <div id="sozlukListe"></div>
  </section>`;
  $('#yeniKelime').onclick = () => kelimeFormu();
  $('#csvAl').onclick = csvIndir;
  const yenile = () => { S.sayfa = 0; listeCiz(); };
  $('#ara').oninput = e => { S.q = e.target.value; yenile(); };
  $('#fDurum').onchange = e => { S.durum = e.target.value; yenile(); };
  $('#fKaynak').onchange = e => { S.kaynak = e.target.value; yenile(); };
  document.querySelector('.liste-ust [name=lv]').onchange = e => { S.lv = e.target.value; yenile(); };
  document.querySelector('.liste-ust [name=tp]').onchange = e => { S.tp = e.target.value; yenile(); };
  $('#fBoyut').onchange = e => { S.boyut = +e.target.value; try { localStorage.setItem('kelimeBulmaca.sozlukBoyut', S.boyut); } catch (x) { } yenile(); };
  document.querySelectorAll('[data-harf]').forEach(b => b.onclick = () => {
    S.harf = b.dataset.harf; document.querySelectorAll('[data-harf]').forEach(x => x.classList.toggle('aktif', x === b)); yenile();
  });
  listeCiz();
}

function listeCiz() {
  const S = SozlukDurum, q = anahtar(S.q);
  let l;
  if (S.kaynak === 'silinen') l = silinenler();
  else l = K.filter(k => (!S.durum || durum(k.id) === S.durum) && (!S.kaynak || kaynakAd(k.id).kod === S.kaynak));
  if (S.harf) l = l.filter(k => anahtar(k.w).toUpperCase().startsWith(S.harf));
  if (S.lv || S.tp) l = etiketSuz(l, S.lv, S.tp);
  if (q) {
    l = l.filter(k => anahtar(k.w).includes(q) || (k.tr || '').toLowerCase().includes(q) || (k.d || '').toLowerCase().includes(q));
    // tam eşleşme ve başta geçenler önce
    l.sort((a, b) => (anahtar(b.w) === q) - (anahtar(a.w) === q) || anahtar(b.w).startsWith(q) - anahtar(a.w).startsWith(q) || anahtar(a.w).localeCompare(anahtar(b.w), 'en'));
  } else l.sort((a, b) => anahtar(a.w).localeCompare(anahtar(b.w), 'en'));

  const silinenMod = S.kaynak === 'silinen';
  const sayfaSay = Math.max(1, Math.ceil(l.length / S.boyut));
  S.sayfa = Math.min(Math.max(0, S.sayfa), sayfaSay - 1);
  const bas = S.sayfa * S.boyut;
  const satir = k => {
    const d = silinenMod ? null : durum(k.id);
    return `<li class="sz-satir" data-id="${esc(k.id)}" tabindex="0">
      <div class="sz-kelime"><b>${esc(k.w)}</b> ${k.pr ? `<span class="kk-pr">/${esc(k.pr)}/</span>` : ''} ${k.p ? `<span class="etiket">${esc(k.p)}</span>` : ''}
        ${!silinenMod && kaynakAd(k.id).kod !== 'excel' ? `<span class="etiket vurgu">${kaynakAd(k.id).kod === 'ekle' ? 'eklediğin' : 'düzenlendi'}</span>` : ''}</div>
      <div class="sz-anlam">${esc(k.tr || '')}</div>
      ${silinenMod ? `<button class="btn kucuk" data-geri="${esc(k.id)}">Geri yükle</button>` : `<span class="nokta d-${d}" title="${DURUM_AD[d]}"></span>`}
    </li>`;
  };
  $('#sozlukListe').innerHTML = !l.length
    ? `<div class="bos-durum"><p>${q ? `“${esc(S.q)}” sözlükte bulunamadı.` : 'Bu süzgeçle eşleşen kelime yok.'}</p>
        ${q && !silinenMod ? `<button class="ana-btn" id="aranaEkle">“${esc(S.q.trim())}” kelimesini ekle</button>` : ''}</div>`
    : `<p class="soluk kucuk">${l.length.toLocaleString('tr-TR')} sonuç${sayfaSay > 1 ? ` · ${bas + 1}–${Math.min(l.length, bas + S.boyut)} arası gösteriliyor` : ''}</p>
       <ul class="sz-liste">${l.slice(bas, bas + S.boyut).map(satir).join('')}</ul>
       ${sayfaSay > 1 ? `<nav class="sayfalama" aria-label="Sayfalar">
         <button class="btn kucuk" data-sayfa="${S.sayfa - 1}" ${S.sayfa === 0 ? 'disabled' : ''}>‹ Önceki</button>
         <span class="soluk">Sayfa ${S.sayfa + 1} / ${sayfaSay}</span>
         <button class="btn kucuk" data-sayfa="${S.sayfa + 1}" ${S.sayfa >= sayfaSay - 1 ? 'disabled' : ''}>Sonraki ›</button></nav>` : ''}`;
  $('#aranaEkle')?.addEventListener('click', () => kelimeFormu(null, { w: S.q.trim() }));
  document.querySelectorAll('#sozlukListe [data-sayfa]').forEach(b => b.onclick = () => { S.sayfa = +b.dataset.sayfa; listeCiz(); $('#sozlukListe').scrollIntoView({ block: 'start' }); });
  document.querySelectorAll('#sozlukListe [data-geri]').forEach(b => b.onclick = e => { e.stopPropagation(); geriYukle(b.dataset.geri); });
  if (!silinenMod) document.querySelectorAll('#sozlukListe .sz-satir').forEach(li => {
    li.onclick = () => kelimeDetay(li.dataset.id);
    li.onkeydown = e => { if (e.key === 'Enter') kelimeDetay(li.dataset.id); };
  });
}

/* ---------- Kelime ayrıntısı ---------- */
function kelimeDetay(id) {
  const k = KID.get(id); if (!k) return;
  const w = P.w[id], d = durum(id), kay = kaynakAd(id);
  const modSatir = m => {
    const v = w?.m[m]; if (!v) return '';
    const aralik = v.d === MEZUN ? 'mezun ✓' : `${ARALIK[v.b]} günlük aralıkta`;
    return `<tr><td>${MODLAR[m]}</td><td><span class="kutucuk b${Math.min(v.b, 8)}">${v.b}</span> ${aralik}</td><td>${gunMetni(v.d)}</td></tr>`;
  };
  const { el, kapat } = modal(`
    ${kelimeKarti(k)}
    <div class="detay-bilgi">
      <span class="etiket"><i class="nokta d-${d}"></i> ${DURUM_AD[d]}</span>
      <span class="etiket">${kay.ad}</span>
      ${w ? `<span class="etiket">Tanışma: ${new Date(w.i + 'T12:00').toLocaleDateString('tr-TR')}</span>` : ''}
      ${w?.x ? `<span class="etiket">${w.x} kez yanlış</span>` : ''}
      ${w?.seref ? `<span class="etiket altin">🏆 Şeref Tribünü'nde (${new Date(w.seref + 'T12:00').toLocaleDateString('tr-TR')})</span>` : ''}
    </div>
    ${w && !w.seref ? `<table class="tablo kucuk-tablo"><thead><tr><th>Yön</th><th>Kutu</th><th>Sıradaki tekrar</th></tr></thead><tbody>${['r', 'c', 'p'].map(modSatir).join('')}</tbody></table>` : ''}
    <div class="butonlar">
      <button class="ana-btn" id="dDuzenle">✎ Düzenle / anlam ekle</button>
      ${!w ? `<button class="btn" id="dOncelik">${(P.oncelik || []).includes(id) ? '✓ Sıradaki yeni kelimelerde' : 'Hemen öğrenmek istiyorum'}</button>` : ''}
      ${w?.seref ? '<button class="btn" id="dIndir">Tribünden indir, yeniden çalış</button>' : ''}
      <button class="btn tehlike" id="dSil">Sil</button>
      <button class="btn" data-kapat>Kapat</button>
    </div>`, { genis: true });
  $('#dDuzenle', el).onclick = () => { kapat(); kelimeFormu(id); };
  $('#dOncelik', el)?.addEventListener('click', e => {
    P.oncelik = (P.oncelik || []).filter(x => x !== id);
    P.oncelik.unshift(id); kaydet();
    e.target.textContent = '✓ Sıradaki yeni kelimelerde'; bildir('Bir sonraki çalışmada ilk sırada gelecek');
  });
  $('#dIndir', el)?.addEventListener('click', () => {
    if (!confirm(`“${k.w}” Şeref Tribünü'nden indirilip yeniden öğrenilecekler havuzuna alınsın mı?`)) return;
    yenidenOgren(id); kaydet(); kapat(); bildir('Kelime yeniden öğrenilecekler arasına alındı'); git(aktifEkran);
  });
  $('#dSil', el).onclick = () => { if (kelimeSil(id)) { kapat(); git(aktifEkran); } };
}

/* ---------- Silme / geri yükleme ---------- */
function kelimeSil(id) {
  const k = KID.get(id); if (!k) return false;
  const ilerleme = P.w[id] ? '\nBu kelimedeki çalışma ilerlemen de silinecek.' : '';
  if (!confirm(`“${k.w}” sözlükten silinsin mi?${ilerleme}\n\nSilinen kelimeler Sözlük › Silinenler bölümünden geri yüklenebilir.`)) return false;
  P.sozluk[id] = { ...(P.sozluk[id] || {}), silindi: Date.now() };
  delete P.w[id];
  P.oncelik = (P.oncelik || []).filter(x => x !== id);
  sozlukKur(); kaydet();
  bildir(`“${k.w}” silindi`);
  return true;
}
function geriYukle(id) {
  const v = P.sozluk[id];
  if (v === null) delete P.sozluk[id];
  else if (v) { delete v.silindi; if (K_TABAN_ID.has(id) && Object.keys(v).every(x => x === 'silindi')) delete P.sozluk[id]; }
  sozlukKur(); kaydet();
  bildir('Kelime geri yüklendi; yeni kelimeler arasına katıldı');
  ekranSozluk();
}

/* ---------- Ekleme / düzenleme formu ---------- */
const TURLER = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'phrase', 'idiom', 'preposition', 'conjunction', 'grammar', 'noun/verb'];

function kelimeFormu(id = null, on = {}) {
  const k = id ? KID.get(id) : null;
  const v = k || { w: on.w || '', pr: '', tr: '', p: '', d: '', ex: [] };
  const { el, kapat } = modal(`
    <form id="kForm" class="kelime-form" autocomplete="off">
      <h2>${k ? `“${esc(k.w)}” — düzenle` : 'Yeni kelime ekle'}</h2>
      ${k && P.w[id] ? `<p class="uyari kucuk">Anlamı, tanımı, örnek cümleleri ya da yazılışı değişirse bu kelime <b>yeniden öğrenilecekler</b> havuzuna alınır ve bir sonraki çalışmada kartı yeniden gösterilir.</p>` : ''}
      <label><span>İngilizce kelime ya da ifade <b class="zorunlu">*</b></span>
        <input name="w" required value="${esc(v.w)}" spellcheck="false" placeholder="ör. take for granted"></label>
      <div id="mevcutUyari"></div>
      <div class="form-iki">
        <label>Okunuş <input name="pr" value="${esc(v.pr || '')}" placeholder="ör. teyk for GRAN-tid"></label>
        <label>Kelime türü <input name="p" list="turler" value="${esc(v.p || '')}" placeholder="noun, verb, idiom…"></label>
      </div>
      <datalist id="turler">${TURLER.map(t => `<option value="${t}">`).join('')}</datalist>
      <label><span>Türkçe anlam(lar) <b class="zorunlu">*</b></span>
        <textarea name="tr" rows="2" required placeholder="Birden fazla anlamı ; ile ayır: Garanti görmek; değerini bilmemek">${esc(v.tr || '')}</textarea></label>
      <label>İngilizce tanım (açıklama)
        <textarea name="d" rows="2" placeholder="ör. to fail to appreciate something because it is always there">${esc(v.d || '')}</textarea></label>
      <label>Örnek cümleler (bağlam) — her satıra bir cümle
        <textarea name="ex" rows="4" placeholder="We take clean water for granted.">${esc((v.ex || []).join('\n'))}</textarea></label>
      <ul id="cumleKontrol" class="cumle-kontrol"></ul>
      ${k ? `<fieldset class="yeni-anlam"><legend>Yeni bir anlam ya da bağlam ekle</legend>
        <p class="soluk kucuk">Daha önce bilmediğin bir anlamı ya da yeni bir kullanımı mevcut bilgilere eklemek için:</p>
        <label>Yeni Türkçe anlam <input name="yTr" placeholder="mevcut anlamların sonuna eklenir"></label>
        <label>Yeni İngilizce tanım <input name="yD" placeholder="mevcut tanımın sonuna eklenir"></label>
        <label>Yeni örnek cümle <input name="yEx" placeholder="örnek cümlelere eklenir"></label>
      </fieldset>` : `<label class="yan"><input type="checkbox" name="hemen" checked> Hemen öğrenmeye başla (bir sonraki çalışmada ilk sırada gelsin)</label>`}
      <div class="butonlar">
        <button class="ana-btn">${k ? 'Değişiklikleri kaydet' : 'Sözlüğe ekle'}</button>
        <button type="button" class="btn" data-kapat>Vazgeç</button>
        ${k ? '<button type="button" class="btn tehlike sag" id="fSil">Bu kelimeyi sil</button>' : ''}
      </div>
    </form>`, { genis: true });
  const f = $('#kForm', el);
  const wInp = f.elements.w;

  // Örnek cümlelerin boşluk doldurmada kullanılıp kullanılamayacağını canlı göster
  const cumleKontrol = () => {
    const w = wInp.value.trim();
    const satirlar = [...f.elements.ex.value.split('\n'), f.elements.yEx?.value || ''].map(s => s.trim()).filter(Boolean);
    $('#cumleKontrol', el).innerHTML = !w ? '' : satirlar.map(s => {
      const b = Metin.bosluk(s, w);
      const tr = /[ğüşıöçĞÜŞİÖÇ]/.test(s);
      return `<li class="${b && !tr ? 'iyi-yazi' : 'soluk'}">${b && !tr ? '✓' : '○'} ${esc(s.length > 70 ? s.slice(0, 70) + '…' : s)}
        <small>${b && !tr ? '— boşluk doldurmada kullanılabilir' : tr ? '— Türkçe karakter içeriyor, sadece kartta gösterilir' : '— kelime cümlede bulunamadı, sadece kartta gösterilir'}</small></li>`;
    }).join('');
  };
  // Kelime zaten var mı?
  const mevcutKontrol = () => {
    const m = mevcutKelime(wInp.value);
    const kutu = $('#mevcutUyari', el);
    if (!m || (k && m.id === k.id)) { kutu.innerHTML = ''; return null; }
    kutu.innerHTML = `<div class="uyari mevcut">
      <b>“${esc(m.w)}” sözlükte zaten mevcut:</b> ${esc(m.tr)}
      <div class="butonlar"><span>İçeriğinde değişiklik yapmak ya da yeni bir anlam/bağlam eklemek ister misin?</span>
        <button type="button" class="ana-btn kucuk" id="mevcutDuzenle">Evet, düzenle</button>
        <button type="button" class="btn kucuk" id="mevcutGoster">Kelimeyi göster</button></div></div>`;
    $('#mevcutDuzenle', el).onclick = () => { kapat(); kelimeFormu(m.id); };
    $('#mevcutGoster', el).onclick = () => { kapat(); kelimeDetay(m.id); };
    return m;
  };
  wInp.addEventListener('input', () => { mevcutKontrol(); cumleKontrol(); });
  f.elements.ex.addEventListener('input', cumleKontrol);
  f.elements.yEx?.addEventListener('input', cumleKontrol);
  mevcutKontrol(); cumleKontrol();
  if (!k) wInp.focus();
  $('#fSil', el)?.addEventListener('click', () => { if (kelimeSil(id)) { kapat(); git(aktifEkran); } });

  f.onsubmit = e => {
    e.preventDefault();
    const F = f.elements;
    const ekle = (eski, yeni, ayrac) => (yeni = yeni.trim()) ? (eski ? eski.replace(/[;\s]+$/, '') + ayrac + yeni : yeni) : eski;
    const yeni = {
      w: F.w.value.trim().replace(/\s+/g, ' '),
      pr: F.pr.value.trim(), p: F.p.value.trim(),
      tr: ekle(F.tr.value.trim(), F.yTr?.value || '', '; '),
      d: ekle(F.d.value.trim(), F.yD?.value || '', '; '),
      ex: [...F.ex.value.split('\n'), F.yEx?.value || ''].map(s => s.trim()).filter(Boolean),
    };
    if (!yeni.w || !yeni.tr) { alert('İngilizce kelime ve Türkçe anlam zorunlu.'); return; }
    const m = mevcutKontrol();
    if (m) { alert(`“${m.w}” zaten mevcut. Düzenlemek için “Evet, düzenle” düğmesini kullan.`); return; }

    if (!k) {
      let yid = anahtar(yeni.w), n = 2;
      while (KID.has(yid) || P.sozluk[yid]) yid = `${anahtar(yeni.w)}#${n++}`;
      P.sozluk[yid] = { ...yeni, kaynak: 'ekle', t: Date.now() };
      if (F.hemen.checked) P.oncelik = [yid, ...(P.oncelik || []).filter(x => x !== yid)];
      sozlukKur(); kaydet(); kapat();
      bildir(`“${yeni.w}” sözlüğe eklendi${F.hemen.checked ? ' — bir sonraki çalışmada ilk sırada' : ''}`);
      Basari.kontrol();
    } else {
      const icerikDegisti = anahtar(yeni.w) !== anahtar(k.w) || yeni.tr !== k.tr || yeni.d !== (k.d || '') ||
        JSON.stringify(yeni.ex) !== JSON.stringify(k.ex || []);
      const onceki = P.sozluk[id];
      P.sozluk[id] = { ...(onceki || {}), ...yeni, kaynak: onceki?.kaynak === 'ekle' ? 'ekle' : 'duzen', t: Date.now() };
      sozlukKur();
      let mesaj = 'Değişiklikler kaydedildi';
      if (icerikDegisti && P.w[id]) {
        const ogrenilmisti = ['pekisti', 'usta', 'seref'].includes(durum(id));
        yenidenOgren(id);
        mesaj = ogrenilmisti ? 'Kaydedildi. Öğrenilenler arasındaydı; yeniden öğrenilecekler havuzuna alındı.' : 'Kaydedildi. Kelime kartı bir sonraki çalışmada yeniden gösterilecek.';
      }
      kaydet(); kapat(); bildir(mesaj);
      Basari.kontrol();
    }
    if (aktifEkran === 'sozluk') { const y = window.scrollY; ekranSozluk(); window.scrollTo(0, y); } else git(aktifEkran);
  };
}

/* ---------- CSV dışa aktarma (Excel'de açılır) ---------- */
function csvIndir() {
  const h = ['Word', 'Pronunciation', 'Meaning', 'Definition', 'Examples', 'Type', 'Durum', 'Kaynak'];
  const hucre = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const satirlar = K.slice().sort((a, b) => anahtar(a.w).localeCompare(anahtar(b.w), 'en'))
    .map(k => [k.w, k.pr, k.tr, k.d, (k.ex || []).join(' | '), k.p, DURUM_AD[durum(k.id)], kaynakAd(k.id).ad].map(hucre).join(';'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + [h.join(';'), ...satirlar].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `anadilimgibi-sozluk-${bugun()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
