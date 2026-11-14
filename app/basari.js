// AnadilimGibi — Rozetler, başarılar, Şeref Tribünü ve kutlamalar
// Copyright (C) 2026 Berkay Çelik
'use strict';

const Basari = (() => {
  // Her grup kademeli rozetlerden oluşur: [hedef, ad]
  const GRUPLAR = [
    { id: 'tanis', ikon: '🌱', ad: 'Kelime avcısı', acik: n => `${n} kelimeyle tanış`, deger: S => S.tanisilan,
      kademe: [[1, 'İlk adım'], [10, 'Isınma turu'], [50, 'Elli kelime'], [100, 'Yüzler kulübü'], [250, 'Çeyrek bin'], [500, 'Beş yüzler'], [1000, 'Bin kelime'], [2000, 'İki bin'], [3000, 'Üç bin']] },
    { id: 'pekis', ikon: '🧱', ad: 'Sağlam temeller', acik: n => `${n} kelimeyi pekiştir (14 günlük aralığı geç)`, deger: S => S.pekisenToplam,
      kademe: [[10, 'İlk tuğlalar'], [50, 'Sağlam duvar'], [100, 'Yüz pekişmiş'], [250, 'Kale'], [500, 'Hafıza sarayı'], [1000, 'Bin pekişmiş']] },
    { id: 'usta', ikon: '🎓', ad: 'Ustalık', acik: n => `${n} kelimede ustalaş (180 günlük aralığı geç)`, deger: S => S.ustaToplam,
      kademe: [[10, 'Çırak'], [50, 'Kalfa'], [100, 'Usta'], [500, 'Üstat']] },
    { id: 'seref', ikon: '🏆', ad: 'Şeref Tribünü', acik: n => `${n} kelimeyi Şeref Tribünü'ne çıkar (bir yıl sonra da hatırla)`, deger: S => S.say.seref,
      kademe: [[1, 'Tribünün ilk konuğu'], [10, 'Onur listesi'], [50, 'Altın tribün'], [100, 'Yüzlerin onuru'], [500, 'Efsane']] },
    // Toplam çalışılan gün sayısı (art arda olması gerekmez; ara vermek hiçbir şeyi bozmaz)
    { id: 'seri', ikon: '📅', ad: 'Çalışma günleri', acik: n => `Toplam ${n} gün çalış (art arda olması gerekmez)`, deger: S => S.seri.gunSayisi,
      kademe: [[3, 'Kıvılcım'], [7, 'Bir haftalık emek'], [14, 'İki haftalık emek'], [30, 'Otuz gün'], [60, 'Altmış gün'], [100, 'Yüz gün'], [180, 'Yüz seksen gün'], [250, 'İki yüz elli gün'], [365, 'Üç yüz altmış beş gün'], [500, 'Beş yüz gün']] },
    { id: 'cevap', ikon: '✍️', ad: 'Çalışkan', acik: n => `Toplam ${n.toLocaleString('tr-TR')} cevap ver`, deger: S => S.cevap,
      kademe: [[100, 'Yüz cevap'], [500, 'Beş yüz cevap'], [1000, 'Bin cevap'], [5000, 'Beş bin cevap'], [10000, 'On bin cevap'], [25000, 'Yirmi beş bin']] },
    { id: 'kusursuz', ikon: '💎', ad: 'Kusursuz gün', acik: n => `${n} gün en az 20 cevabın hepsini doğru ver`, deger: S => S.kusursuz,
      kademe: [[1, 'Pırlanta gün'], [5, 'Beş pırlanta'], [20, 'Mücevher kutusu']] },
    { id: 'maraton', ikon: '🏃', ad: 'Maraton', acik: n => `Bir günde ${n} cevap ver`, deger: S => S.maxGun,
      kademe: [[100, 'Yarı maraton'], [200, 'Maraton'], [400, 'Ultra maraton']] },
    { id: 'kagit', ikon: '📝', ad: 'Yazdır-Çöz', acik: n => `${n} kâğıt bulmacanın sonucunu gir`, deger: S => S.kagitNot,
      kademe: [[1, 'İlk kâğıt'], [5, 'Kalem ısındı'], [10, 'On kâğıt'], [25, 'Bulmaca tutkunu'], [50, 'Elli kâğıt'], [100, 'Bulmaca ustası'], [200, 'Kâğıt kurdu']] },
    { id: 'sozlukcu', ikon: '📖', ad: 'Sözlükçü', acik: n => `Sözlüğe kendin ${n} kelime ekle`, deger: S => S.ekle,
      kademe: [[1, 'İlk kendi kelimen'], [5, 'Not defteri'], [10, 'Koleksiyoncu'], [25, 'Kelime avcısı'], [50, 'Sözlük yazarı'], [100, 'Lügatçi'], [250, 'Sözlük editörü'], [500, 'Ansiklopedist']] },
    { id: 'adam', ikon: '🌸', ad: 'Çiçek büyüt', acik: n => `Çiçek büyüt oyununda ${n} çiçek aç`, deger: S => S.adam,
      kademe: [[1, 'İlk filiz'], [5, 'Saksı dolusu'], [10, 'Küçük bahçe'], [25, 'Çiçek tarhı'], [50, 'Bahçıvan'], [100, 'Gül bahçesi'], [250, 'Botanik bahçesi'], [500, 'Bahar perisi']] },
    { id: 'harf', ikon: '🔤', ad: 'Karışık harfler', acik: n => `Karışık harflerde ${n} doğru yap`, deger: S => S.harf,
      kademe: [[10, 'Harf çözücü'], [25, 'Harf avcısı'], [50, 'Karmaşa çözen'], [100, 'Anagram ustası'], [250, 'Harf sihirbazı'], [500, 'Anagram üstadı'], [1000, 'Bin anagram']] },
    { id: 'esles', ikon: '🧩', ad: 'Kelime eşleştirme', acik: n => `Eşleştirme oyununda ${n} turu hatasız bitir`, deger: S => S.esles,
      kademe: [[1, 'İlk tam eşleşme'], [5, 'Eşleştirici'], [10, 'Göz kararı'], [25, 'Bağlantı ustası'], [50, 'Eşleşme makinesi'], [100, 'Yüz kusursuz tur'], [250, 'Eşleştirme efsanesi']] },
    { id: 'gece', ikon: '🦉', ad: 'Gece kuşu', acik: n => `${n} farklı gece 22:00–04:00 arasında çalış`, deger: S => S.gece,
      kademe: [[1, 'Gece kuşu'], [5, 'Gece nöbeti'], [15, 'Baykuş'], [30, 'Ay ışığı'], [60, 'Gecelerin efendisi'], [100, 'Uykusuz bilge']] },
    { id: 'sabah', ikon: '🌅', ad: 'Erkenci kuş', acik: n => `${n} farklı sabah 05:00–08:00 arasında çalış`, deger: S => S.sabah,
      kademe: [[1, 'Erkenci kuş'], [5, 'Gün doğumu'], [15, 'Sabah sporcusu'], [30, 'Şafak bekçisi'], [60, 'Horozla yarışan'], [100, 'Güneşi uyandıran']] },
    { id: 'haftasonu', ikon: '🎒', ad: 'Hafta sonu savaşçısı', acik: n => `${n} hafta sonunun iki gününde de çalış`, deger: S => S.haftaSonu,
      kademe: [[1, 'Hafta sonu savaşçısı'], [4, 'Bir ayın hafta sonları'], [10, 'Tatil bilmez'], [26, 'Yarım yılın hafta sonları'], [52, 'Bir yılın hafta sonları']] },
    { id: 'parcacik', ikon: '🧲', ad: 'Parçacık Tamamlama', acik: n => `Parçacık Tamamlama oyununda ${n} doğru yap`, deger: () => P.oyun.parcacik || 0,
      kademe: [[10, 'Parçacık avcısı'], [25, 'Fiil ustası'], [50, 'Phrasal çözücü'], [100, 'Yüz parçacık'], [250, 'Phrasal ustası'], [500, 'Phrasal efsanesi']] },
    // Etüt Köşesi: birikimli süre ve etüt alışkanlıkları
    { id: 'etut', ikon: '⏳', ad: 'Etüt Köşesi', acik: n => `Toplam ${n} saat etüt yap`, deger: () => etutIstat().saat,
      kademe: [[1, 'İlk saat'], [10, 'On saat'], [50, 'Elli saat'], [100, 'Yüz saat'], [250, 'İki yüz elli saat'], [500, 'Beş yüz saat'], [1000, 'Bin saat']] },
    { id: 'etutSabah', ikon: '☀️', ad: 'Sabah etüdü', acik: n => `${n} farklı sabah 05:00–09:00 arasında etüt yap`, deger: () => etutIstat().sabah,
      kademe: [[1, 'İlk sabah etüdü'], [5, 'Sabahçı'], [15, 'Şafakta masa başında'], [30, 'Sabah disiplini'], [60, 'Sabahların ustası']] },
    { id: 'etutGece', ikon: '🌙', ad: 'Gece etüdü', acik: n => `${n} farklı gece 22:00–02:00 arasında etüt yap`, deger: () => etutIstat().gece,
      kademe: [[1, 'İlk gece etüdü'], [5, 'Gece mesaisi'], [15, 'Lamba ışığında'], [30, 'Gece disiplini'], [60, 'Gecelerin ustası']] },
    { id: 'etutHafta', ikon: '📚', ad: 'Hafta sonu etüdü', acik: n => `${n} hafta sonu gününde etüt yap`, deger: () => etutIstat().haftaSonu,
      kademe: [[1, 'İlk hafta sonu etüdü'], [4, 'Bir ayın hafta sonları'], [10, 'Hafta sonu azmi'], [26, 'Yarım yılın etüdü'], [52, 'Bir yılın etüdü']] },
    { id: 'etutSeri', ikon: '🔗', ad: 'Etüt serisi', acik: n => `${n} gün art arda etüt yap`, deger: () => etutIstat().enUzun,
      kademe: [[3, 'Üç gün art arda'], [7, 'Bir hafta'], [14, 'İki hafta'], [30, 'Bir ay'], [60, 'İki ay'], [100, 'Yüz gün']] },
  ];
  const ROZETLER = GRUPLAR.flatMap(g => g.kademe.map(([hedef, ad], i) => ({
    id: `${g.id}-${hedef}`, grup: g, hedef, ad, kademe: Madalya.seviye(i, g.kademe.length), acik: g.acik(hedef),
  })));

  let zamanlayici = null;
  function kontrol() { clearTimeout(zamanlayici); zamanlayici = setTimeout(simdiKontrol, 400); }
  function simdiKontrol() {
    if (!P) return;
    const S = Istat.ozet(), t = bugun(), yeni = [];
    for (const r of ROZETLER) if (!P.rozet[r.id] && r.grup.deger(S) >= r.hedef) { P.rozet[r.id] = t; yeni.push(r); }
    if (yeni.length) { kaydet(); kutla(yeni); }
  }

  /* ---------- Kutlama ---------- */
  function konfeti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const renk = ['#f3d36b', '#2f6f5e', '#e8a54b', '#7357a8', '#4f7cac', '#c2410c'];
    const kap = document.createElement('div'); kap.className = 'konfeti'; kap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = renk[i % renk.length];
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
      p.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      kap.appendChild(p);
    }
    document.body.appendChild(kap);
    setTimeout(() => kap.remove(), 4500);
  }
  function kutla(liste) {
    konfeti();
    document.querySelector('.kutlama')?.remove();
    const d = document.createElement('div');
    d.className = 'kutlama'; d.setAttribute('role', 'status');
    const ilk = liste[liste.length - 1];
    d.innerHTML = `<button class="kapat-x" aria-label="Kapat">×</button>
      <div class="kt-baslik">🎉 ${liste.length > 1 ? `${liste.length} yeni rozet kazandın!` : 'Yeni rozet kazandın!'}</div>
      <div class="kt-liste">${liste.slice(-4).reverse().map(r => `<div class="kt-rozet">${rozetIkon(r, true)}<div><span class="seviye sv${r.kademe}">${Madalya.SEVIYE[r.kademe]}</span><b>${esc(r.ad)}</b><small>${esc(r.acik)}</small></div></div>`).join('')}</div>
      <button class="ana-btn kucuk" data-git="basari">Rozetlerime bak</button>`;
    document.body.appendChild(d);
    const kapat = () => d.remove();
    d.querySelector('.kapat-x').onclick = kapat;
    d.querySelector('[data-git]').addEventListener('click', kapat);
    setTimeout(kapat, 9000);
    if (Ses.var() && ilk) { /* ses yok: dil çalışmasını bölmeyelim */ }
  }

  function rozetIkon(r, kazanildi) {
    return `<span class="rozet-ikon ${kazanildi ? '' : 'kilitli'}" title="${Madalya.SEVIYE[r.kademe]}">${Madalya.svg(r.kademe, r.grup.ikon)}</span>`;
  }

  return { ROZETLER, GRUPLAR, kontrol, simdiKontrol, rozetIkon, kutla };
})();

/* ---------- Başarılar ekranı: Rozetlerim · Başarılarım · Şeref Tribünü ---------- */
let basariSekme = 'rozet';
function ekranBasari(sekme) {
  if (sekme) basariSekme = sekme;
  const kazanilan = Basari.ROZETLER.filter(r => P.rozet[r.id]).length;
  const tribun = Object.values(P.w).filter(w => w.seref).length;
  ana().innerHTML = `
  <section class="panel">
    <h1>Başarılar</h1>
    <p class="soluk">${kazanilan} / ${Basari.ROZETLER.length} rozet · Şeref Tribünü'nde ${tribun} kelime</p>
    <div class="sekmeler" role="tablist">
      ${[['rozet', 'Rozetlerim'], ['zaman', 'Başarılarım'], ['tribun', '🏆 Şeref Tribünü']].map(([k, ad]) =>
        `<button role="tab" aria-selected="${basariSekme === k}" class="${basariSekme === k ? 'aktif' : ''}" data-sekme="${k}">${ad}</button>`).join('')}
    </div>
  </section>
  <div id="basariIcerik"></div>`;
  document.querySelectorAll('[data-sekme]').forEach(b => b.onclick = () => ekranBasari(b.dataset.sekme));
  ({ rozet: rozetlerCiz, zaman: zamanCiz, tribun: tribunCiz })[basariSekme]();
}

function rozetlerCiz() {
  const S = Istat.ozet();
  // en yakın 3 hedef
  const hedefler = Basari.ROZETLER.filter(r => !P.rozet[r.id])
    .map(r => ({ r, oran: Math.min(1, r.grup.deger(S) / r.hedef) }))
    .filter(x => x.oran > 0).sort((a, b) => b.oran - a.oran).slice(0, 3);
  const kart = r => {
    const ok = P.rozet[r.id], deger = r.grup.deger(S);
    return `<div class="rozet-kart sv${r.kademe} ${ok ? 'kazanildi' : ''}">
      ${Basari.rozetIkon(r, ok)}
      <span class="seviye sv${r.kademe}">${Madalya.SEVIYE[r.kademe]}</span>
      <b>${esc(r.ad)}</b><small>${esc(r.acik)}</small>
      ${ok ? `<span class="tarih">${new Date(ok + 'T12:00').toLocaleDateString('tr-TR')}</span>`
        : `<div class="mini-ilerleme" data-ipucu="${Math.min(deger, r.hedef).toLocaleString('tr-TR')} / ${r.hedef.toLocaleString('tr-TR')}"><i style="width:${Math.min(100, 100 * deger / r.hedef)}%"></i></div>`}
    </div>`;
  };
  $('#basariIcerik').innerHTML = `
    ${hedefler.length ? `<section class="panel"><h2>Sıradaki hedefler</h2><div class="rozet-izgara">${hedefler.map(x => kart(x.r)).join('')}</div></section>` : ''}
    ${Basari.GRUPLAR.map(g => `<section class="panel"><h2>${g.ikon} ${esc(g.ad)}</h2>
      <div class="rozet-izgara">${Basari.ROZETLER.filter(r => r.grup === g).map(kart).join('')}</div></section>`).join('')}`;
}

function zamanCiz() {
  const olaylar = [];
  for (const r of Basari.ROZETLER) if (P.rozet[r.id]) olaylar.push({ d: P.rozet[r.id], html: `${Basari.rozetIkon(r, true)}<div><b>${esc(r.ad)}</b><small>${esc(r.acik)}</small></div>` });
  for (const [id, w] of Object.entries(P.w)) if (w.seref && KID.has(id))
    olaylar.push({ d: w.seref, html: `<span class="rozet-ikon">${Madalya.svg(7, '🏆')}</span><div><b>${esc(KID.get(id).w)}</b><small>Şeref Tribünü'ne çıktı</small></div>` });
  const ilk = Object.keys(P.gun).filter(d => P.gun[d].r).sort()[0];
  if (ilk) olaylar.push({ d: ilk, html: `<span class="rozet-ikon">${Madalya.svg(1, '🚀')}</span><div><b>Yolculuk başladı</b><small>İlk çalışma günün</small></div>` });
  olaylar.sort((a, b) => b.d.localeCompare(a.d));
  const aylar = {};
  olaylar.forEach(o => (aylar[o.d.slice(0, 7)] ||= []).push(o));
  $('#basariIcerik').innerHTML = `<section class="panel">
    <h2>Başarılarım</h2>
    ${!olaylar.length ? '<p class="soluk">Henüz kayıt yok. İlk çalışmanla birlikte burası dolmaya başlayacak.</p>' :
      Object.entries(aylar).map(([ay, l]) => `<h3>${new Date(ay + '-15T12:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
        <ul class="zaman">${l.map(o => `<li><span class="z-tarih">${new Date(o.d + 'T12:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span><div class="z-olay">${o.html}</div></li>`).join('')}</ul>`).join('')}
  </section>`;
}

function tribunCiz() {
  const l = Object.entries(P.w).filter(([id, w]) => w.seref && KID.has(id)).sort((a, b) => b[1].seref.localeCompare(a[1].seref));
  const aday = Object.entries(P.w).filter(([id, w]) => !w.seref && KID.has(id))
    .map(([id, w]) => ({ id, min: Math.min(...Object.values(w.m).map(v => v.d === MEZUN ? 99 : v.b)) }))
    .filter(x => x.min >= 5).sort((a, b) => b.min - a.min).slice(0, 8);
  $('#basariIcerik').innerHTML = `<section class="panel tribun">
    <div class="tribun-ust"><span class="tribun-kupa" aria-hidden="true">🏆</span>
      <div><h2>Şeref Tribünü</h2><p class="soluk">Üç alıştırma türünde de 360 günlük tekrarını doğru cevapladığın kelimeler burada yer alır ve artık sorulmaz. Bunlar, bir yıl sonra bile hatırladığın kelimeler.</p></div></div>
    ${l.length ? `<ul class="tribun-liste">${l.map(([id, w]) => `<li><button class="link" data-detay="${esc(id)}"><b>${esc(KID.get(id).w)}</b></button>
        <span class="soluk">${esc(KID.get(id).tr)}</span><small>${new Date(w.seref + 'T12:00').toLocaleDateString('tr-TR')}</small></li>`).join('')}</ul>`
      : `<p class="bos-durum">Tribün şimdilik boş. İlk konuğu ağırlamak için bir kelimenin 360 günlük tekrarını da doğru cevaplaman gerekiyor.</p>`}
    ${aday.length ? `<h3>Tribüne en yakın adaylar</h3><ul class="aday-liste">${aday.map(x => `<li><button class="link" data-detay="${esc(x.id)}">${esc(KID.get(x.id).w)}</button> <span class="soluk">— en zayıf yönü ${ARALIK[Math.min(x.min, 8)]} günlük aralıkta</span></li>`).join('')}</ul>` : ''}
  </section>`;
  document.querySelectorAll('[data-detay]').forEach(b => b.onclick = () => kelimeDetay(b.dataset.detay));
}
