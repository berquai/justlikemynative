// AnadilimGibi — YDS / YÖKDİL tarzı sorular (özgün) ve Parçacık Tamamlama oyunu
// Copyright (C) 2026 Berkay Çelik
// Sorular ÖSYM sınavlarının biçimine benzer ama tamamen özgündür; gerçek sınav soruları kullanılmaz.
'use strict';

const Yds = (() => {
  // Bağlaç, edat ve geçiş ifadeleri: aynı gruptan çeldiricilerle sorulur
  const BAGLAC = ['albeit', 'whereas', 'notwithstanding', 'provided that', 'so long as', 'inasmuch as', 'seeing that', 'given that',
    'lest', 'thereby', 'therefore', 'likewise', 'in lieu of', 'on account of', 'in view of', 'with regard to', 'with respect to',
    'regardless of', 'rather than', 'due to', 'in the event of', 'as for', 'as to', 'aside from', 'barring', 'but for', 'if not',
    'let alone', 'not to mention', 'so as to', 'for fear that', 'as soon as', 'by the time', 'even so', 'even as', 'whilst',
    'in that', 'as regards', 'as such', 'in the face of', 'under the guise of', 'by way of', 'in the aftermath of', 'at the expense of',
    'in favor of', 'ahead of', 'following', 'concerning', 'supposing', 'henceforth', 'subsequently', 'admittedly', 'arguably',
    'seemingly', 'ostensibly', 'indeed', 'merely', 'so much so that', 'in the wake of', 'as with', 'for all'];

  // Cümle tamamlama: özgün sorular (kök, beş seçenek, doğru seçeneğin sırası, kısa açıklama)
  const TAMAMLAMA = [
    { k: 'Although the new vaccine proved highly effective in clinical trials, ----.', s: ['it was quickly approved by every health authority', 'its high cost has limited its use in poorer countries', 'scientists had worked on it for many years', 'it was tested on thousands of volunteers', 'the results were published in a leading journal'], d: 1, a: '“Although” bir zıtlık bekler: etkili olmasına rağmen yüksek maliyeti kullanımını sınırlamış.' },
    { k: 'Unless governments take urgent action to reduce emissions, ----.', s: ['global temperatures have remained stable', 'renewable energy became cheaper last year', 'the effects of climate change will become far more severe', 'many countries signed the agreement', 'scientists welcomed the new report'], d: 2, a: '“Unless” (-medikçe) bir koşul ve gelecekteki bir sonucu gerektirir.' },
    { k: 'The museum decided to extend its opening hours ----.', s: ['since the number of visitors had increased dramatically', 'although it had been closed for renovation', 'whereas most of its paintings are from Italy', 'unless the city council approved the budget', 'even though nobody visited it at weekends'], d: 0, a: 'Sebep–sonuç ilişkisi: ziyaretçi sayısı arttığı için saatler uzatıldı.' },
    { k: 'No sooner had the researchers published their findings ----.', s: ['when the funding was cut', 'than other scientists began to question their methods', 'that the results were confirmed', 'before the conference started', 'while the data was being collected'], d: 1, a: '“No sooner … than” kalıbı: “-er -mez”.' },
    { k: '----, the company managed to increase its profits by twenty percent.', s: ['Because the economy grew rapidly last year', 'Since its products are popular among teenagers', 'Despite the economic crisis that hit the country', 'Unless it opens new branches abroad', 'As long as consumers keep spending money'], d: 2, a: 'Krize rağmen kâr artışı: “despite” zıtlık bildirir.' },
    { k: 'Children who read regularly tend to develop larger vocabularies ----.', s: ['than those who rarely open a book', 'so that their parents buy them more books', 'even though reading is a popular hobby', 'unless they attend a good school', 'as soon as they learn the alphabet'], d: 0, a: 'Karşılaştırma yapısı: “larger … than”.' },
    { k: 'If the bridge had been inspected more carefully, ----.', s: ['it will be repaired next year', 'the accident might have been prevented', 'engineers are checking it every month', 'it was built in the nineteenth century', 'traffic would become heavier'], d: 1, a: 'Üçüncü tip koşul: “had been … might have been”.' },
    { k: 'While some experts believe that social media harms young people, ----.', s: ['many parents limit their children\'s screen time', 'others argue that it helps them stay connected', 'it was invented in the early 2000s', 'teenagers spend hours online every day', 'the number of users is increasing'], d: 1, a: '“While” burada karşıtlık kurar: bazıları … iken diğerleri ….' },
    { k: 'The ancient city was so well preserved ----.', s: ['because it was built on a hill', 'that archaeologists could study its streets in great detail', 'although few tourists visit it today', 'which was destroyed by an earthquake', 'unless it is protected by law'], d: 1, a: '“So … that” kalıbı: o kadar … ki.' },
    { k: 'Not only did the storm destroy hundreds of homes, ----.', s: ['but it also left thousands without electricity', 'so the government declared an emergency', 'and the weather was very cold', 'although nobody was injured', 'because the wind was extremely strong'], d: 0, a: '“Not only … but also” kalıbı.' },
    { k: 'Many species are now at risk of extinction ----.', s: ['as their natural habitats are being destroyed', 'even though their populations are growing', 'so that they can adapt to new environments', 'unless they live in warm climates', 'whereas zoos are becoming more popular'], d: 0, a: 'Sebep: yaşam alanlarının yok edilmesi.' },
    { k: 'Had the government invested more in education, ----.', s: ['unemployment would probably be lower today', 'schools are opening across the country', 'teachers will receive higher salaries', 'the budget was announced in June', 'students had studied harder'], d: 0, a: 'Devrik koşul (Had …): karma koşul, bugünkü sonuç.' },
    { k: 'The professor explained the theory so clearly ----.', s: ['since it is very complicated', 'that even first-year students understood it', 'whereas her colleagues disagreed', 'unless the students asked questions', 'which was developed in the 1950s'], d: 1, a: '“So … that” sonuç bildirir.' },
    { k: 'Despite being one of the richest countries in the world, ----.', s: ['it has a strong and stable economy', 'it still struggles with high levels of inequality', 'it exports large amounts of oil', 'its citizens enjoy a high standard of living', 'it attracts many foreign investors'], d: 1, a: '“Despite” beklenenin tersini getirir: zengin olmasına rağmen eşitsizlik.' },
    { k: 'Once a language is no longer spoken by any community, ----.', s: ['it is considered to be extinct', 'it becomes more popular among students', 'it spreads to neighbouring countries', 'its grammar becomes simpler', 'linguists stop studying it immediately'], d: 0, a: '“Once” (-dığında / bir kez … -ince) zaman ve koşul bildirir.' },
    { k: 'The study found that people who sleep less than six hours a night ----.', s: ['were asked to complete a questionnaire', 'are more likely to suffer from heart disease', 'had been living in large cities', 'sleep better during the summer', 'would join the research next year'], d: 1, a: 'Bulgu, genel bir gerçeği (geniş zaman) bildirir.' },
    { k: '----, the team refused to give up and eventually won the match.', s: ['Since they had the best players', 'Although they were losing at half-time', 'Because the referee was unfair', 'As soon as the game started', 'Unless the weather improved'], d: 1, a: 'Zıtlık: yenik olmalarına rağmen pes etmediler.' },
    { k: 'Scientists warn that antibiotics will become less effective ----.', s: ['if they continue to be overused', 'because they were discovered in 1928', 'although they save millions of lives', 'whereas viruses cannot be treated with them', 'so that infections spread more slowly'], d: 0, a: 'Koşul: aşırı kullanılmaya devam ederse.' },
    { k: 'The longer you postpone a difficult decision, ----.', s: ['the harder it becomes to make', 'it is easier to forget about it', 'you made the right choice', 'the problem was solved quickly', 'as soon as possible'], d: 0, a: '“The more/longer …, the more/harder …” paralel karşılaştırma.' },
    { k: 'Whereas earlier generations wrote letters to keep in touch, ----.', s: ['letters were often lost in the post', 'today most people send instant messages', 'they also used the telephone', 'writing by hand is a useful skill', 'postal services were very slow'], d: 1, a: '“Whereas” iki durumu karşılaştırır: eskiden mektup, bugün anlık mesaj.' },
    { k: 'It was not until the invention of the printing press ----.', s: ['when books became expensive', 'that books became widely available', 'which changed the world', 'since people learned to read', 'because monks copied books by hand'], d: 1, a: '“It was not until … that …” kalıbı: ancak … ile.' },
    { k: 'Even though the restaurant is located far from the city centre, ----.', s: ['it is always full of customers', 'prices are quite high', 'it serves traditional dishes', 'the chef trained in Paris', 'parking is difficult'], d: 0, a: 'Zıtlık: uzak olmasına rağmen her zaman dolu.' },
    { k: 'So as to protect the rare birds that nest there, ----.', s: ['the island has a mild climate', 'visitors are not allowed on the island during spring', 'many tourists visit the island', 'the birds migrate in winter', 'scientists counted the eggs'], d: 1, a: '“So as to” amaç bildirir: kuşları korumak için ziyaret yasağı.' },
    { k: 'Provided that the weather conditions remain stable, ----.', s: ['the rocket will be launched on Monday', 'the launch was postponed twice', 'engineers checked the engines', 'the mission was very expensive', 'it rained heavily last week'], d: 0, a: '“Provided that” (şartıyla) koşul ve gelecek sonucu ister.' },
    { k: 'The author\'s first novel was rejected by several publishers; ----, it went on to become a best-seller.', s: ['therefore', 'nevertheless', 'moreover', 'similarly', 'for instance'], d: 1, a: 'Zıtlık bildiren bağlaç: “nevertheless” (yine de).' },
    { k: 'Regular exercise strengthens the heart; ----, it reduces stress and improves sleep.', s: ['however', 'otherwise', 'furthermore', 'in contrast', 'instead'], d: 2, a: 'Ekleme: “furthermore” (ayrıca).' },
    { k: 'The roads were covered with ice; ----, many schools were closed for the day.', s: ['consequently', 'nonetheless', 'likewise', 'in other words', 'on the contrary'], d: 0, a: 'Sonuç: “consequently” (bu nedenle).' },
    { k: 'Some birds, ---- penguins and ostriches, cannot fly at all.', s: ['such as', 'as well as', 'rather than', 'instead of', 'in spite of'], d: 0, a: 'Örnek verme: “such as”.' },
    { k: '---- the heavy rain, thousands of fans gathered outside the stadium.', s: ['Because of', 'In spite of', 'Thanks to', 'Instead of', 'According to'], d: 1, a: 'Zıtlık bildiren edat: “in spite of” (-e rağmen).' },
    { k: 'The meeting was cancelled ---- the manager\'s sudden illness.', s: ['owing to', 'in spite of', 'apart from', 'instead of', 'regardless of'], d: 0, a: 'Sebep bildiren edat: “owing to” (… yüzünden).' },
  ];

  const harfler = ['A', 'B', 'C', 'D', 'E'];
  // Ham İngilizce sözcük karşılaştırması için
  const sade = s => String(s).toLowerCase().trim();

  // Kelime boşluğu sorusu: kelimenin çekimsiz geçtiği örnek cümle + aynı türden dört çeldirici
  function kelimeSorusu(k) {
    if (!k || k.w.includes('...')) return null;
    const b = bosluklar(k).filter(x => sade(x.yuzey) === sade(k.w));
    if (!b.length) return null;
    const x = b[Math.floor(Math.random() * b.length)];
    const c = celdiriciler(k, 4, 'w').filter(y => !y.w.includes('...'));
    if (c.length < 4) return null;
    const secenek = karistir([k.w, ...c.map(y => y.w)]);
    return { tur: 'kelime', id: k.id, baslik: k.w, kok: x.duz.replace(/_____/g, '----'), secenek, dogru: secenek.indexOf(k.w), aciklama: `${k.w}: ${k.tr}` };
  }
  function baglacSorusu(k) {
    if (!k || !BAGLAC.includes(k.id)) return null;
    const b = bosluklar(k).filter(x => sade(x.yuzey) === sade(k.w));
    if (!b.length) return null;
    const x = b[Math.floor(Math.random() * b.length)];
    const havuz = karistir(BAGLAC.filter(w => w !== k.id && KID.has(w)));
    const secenek = karistir([k.w, ...havuz.slice(0, 4).map(w => KID.get(w).w)]);
    return { tur: 'baglac', id: k.id, baslik: k.w, kok: x.duz.replace(/_____/g, '----'), secenek, dogru: secenek.indexOf(k.w), aciklama: `${k.w}: ${k.tr}` };
  }
  // Eşdizim sorusu: kelimenin sık kullanıldığı kalıpta boşluğa doğru kelimeyi bul
  function esdizimSorusu(k) {
    if (!k || !k.col) return null;
    const kalip = karistir(k.col.split(' · ').filter(c => new RegExp('\\b' + k.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c)))[0];
    if (!kalip || !kalip.split(/\s+/).some(w => w.length >= 4 && w.toLowerCase() !== k.w.toLowerCase())) return null; // kalıp yeterince ipucu vermeli
    const c = celdiriciler(k, 8, 'w').filter(y => !y.w.includes(' '));
    if (c.length < 4) return null;
    const secenek = karistir([k.w, ...c.slice(0, 4).map(y => y.w)]);
    const kok = kalip.replace(new RegExp('\\b' + k.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '----');
    return { tur: 'esdizim', id: k.id, baslik: k.w, kok, secenek, dogru: secenek.indexOf(k.w), aciklama: `${kalip} · ${k.w}: ${k.tr}` };
  }
  function tamamlamaSorusu(i) {
    const t = TAMAMLAMA[i];
    const sira = karistir([0, 1, 2, 3, 4]);
    const secenek = sira.map(j => t.s[j]);
    return { tur: 'tamamlama', id: 'yds-tamamlama-' + i, baslik: 'Cümle tamamlama', kok: t.k, secenek, dogru: sira.indexOf(t.d), aciklama: t.a };
  }
  // Bir soru üret: kelime havuzu verilirse kelime boşluğu sorularında oradan seçer
  function uret(havuz, son = []) {
    for (let deneme = 0; deneme < 30; deneme++) {
      const r = Math.random();
      let s = null;
      if (r < 0.2) s = tamamlamaSorusu(Math.floor(Math.random() * TAMAMLAMA.length));
      else if (r < 0.32) { const l = (havuz && havuz.length ? havuz : K.map(k => k.id)).map(id => KID.get(id)).filter(k => k && k.col); s = l.length ? esdizimSorusu(l[Math.floor(Math.random() * l.length)]) : null; }
      else if (r < 0.45) s = baglacSorusu(KID.get(BAGLAC[Math.floor(Math.random() * BAGLAC.length)]));
      else {
        const l = havuz && havuz.length ? havuz : K.map(k => k.id);
        s = kelimeSorusu(KID.get(l[Math.floor(Math.random() * l.length)]));
      }
      if (s && !son.includes(s.id)) return s;
    }
    return tamamlamaSorusu(Math.floor(Math.random() * TAMAMLAMA.length));
  }
  return { uret, esdizimSorusu, TAMAMLAMA, BAGLAC };
})();

/* ---------- YDS sorusu ekranı ---------- */
const YDS_TUR_AD = { kelime: 'Kelime bilgisi', baglac: 'Bağlaç ve edat', tamamlama: 'Cümle tamamlama', esdizim: 'Eşdizim' };
function ydsSoruGoster(it) {
  const s = it.soru;
  ana().innerHTML = `${ilerlemeCubugu()}<section class="sahne">
    <p class="ust-baslik">YDS / YÖKDİL tarzı · ${YDS_TUR_AD[s.tur]}</p>
    <p class="yds-kok">${esc(s.kok).replace(/----/g, '<span class="yds-bosluk">----</span>')}</p>
    <div class="yds-secenekler">${s.secenek.map((x, i) => `<button class="secenek yds-secenek" data-i="${i}"><b>${'ABCDE'[i]})</b> ${esc(x)}</button>`).join('')}</div>
    <div id="geri"></div></section>`;
  ustBagla();
  let bitti = false;
  const sec = i => {
    if (bitti) return; bitti = true;
    const dogru = i === s.dogru;
    document.querySelectorAll('.yds-secenek').forEach((b, j) => {
      b.disabled = true;
      if (j === s.dogru) b.classList.add('dogru'); else if (j === i) b.classList.add('yanlis');
    });
    cevapla(it, dogru, `${'ABCDE'[i]}) ${s.secenek[i]}`, `${'ABCDE'[s.dogru]}) ${s.secenek[s.dogru]}`);
    $('#geri').innerHTML = `<div class="sonuc ${dogru ? 'iyi' : 'kotu'}"><b>${dogru ? 'Doğru!' : `Doğrusu: ${'ABCDE'[s.dogru]}`}</b>
      <span class="soluk">${esc(s.aciklama)}</span> ${s.tur !== 'tamamlama' ? sesBtn(s.baslik) : ''}
      <button class="ana-btn" id="sonraki">Devam <kbd>Enter</kbd></button></div>`;
    sonrakiBagla();
  };
  document.querySelectorAll('.yds-secenek').forEach(b => b.onclick = () => sec(+b.dataset.i));
  klavye = e => {
    const n = 'abcde'.indexOf(e.key.toLowerCase()); const m = +e.key;
    if (n >= 0) sec(n); else if (m >= 1 && m <= 5) sec(m - 1);
  };
}

/* ================= Parçacık Tamamlama (phrasal verb oyunu) ================= */
const PARCACIKLAR = ['up', 'down', 'in', 'out', 'on', 'off', 'over', 'away', 'back', 'through', 'into', 'across', 'about', 'around', 'along', 'forward', 'apart', 'aside', 'by', 'for', 'with', 'to', 'of', 'after'];
function phrasalListe() {
  // "fiil + parçacık" biçimindeki phrasal verb'ler (araya nesne girmeyenler); fiile göre gruplanır
  const l = [];
  for (const k of K) {
    if (!/phrasal/i.test(k.p || '')) continue;
    const p = k.w.toLowerCase().replace(/\b(sth|sb|someone|something|one's)\b/g, '').trim().split(/\s+/);
    if (p.length < 2 || p.length > 3) continue;
    const parca = p.slice(1).join(' ');
    if (!p.slice(1).every(x => PARCACIKLAR.includes(x))) continue;
    l.push({ k, fiil: p[0], parca });
  }
  return l;
}
const OyunParcacik = (() => {
  let liste = null, puan = 0, seri = 0, sayac = 0;
  function oyna(alan) {
    liste ||= phrasalListe();
    const fiiller = {}; liste.forEach(x => (fiiller[x.fiil] ||= []).push(x));
    // Birden çok parçacığı olan fiiller önce: karşılaştırma öğretici olsun
    const tercih = liste.filter(x => fiiller[x.fiil].length > 1 && (!P.w[x.k.id] || Math.random() < 0.7));
    const havuz = tercih.length && Math.random() < 0.75 ? tercih : liste;
    const x = havuz[Math.floor(Math.random() * havuz.length)];
    const ayni = fiiller[x.fiil];
    // Cümlede fiil görünür kalır, yalnızca parçacık boşluk olur
    const b0 = bosluklar(x.k)[0];
    let cumle = null;
    if (b0) {
      const parca = b0.yuzey.split(' '); let i = 0;
      cumle = { html: b0.html.replace(/<span class="bosluk">_____<\/span>/g, () => i++ === 0 ? `<mark>${esc(parca[0])}</mark>` : '<span class="bosluk">_____</span>') };
    }
    const yanlis = karistir(PARCACIKLAR.filter(p => p !== x.parca && !p.includes(' ')).filter(p => !ayni.some(a => a.parca === p))).slice(0, 2);
    const kardes = karistir(ayni.filter(a => a.parca !== x.parca).map(a => a.parca)).slice(0, 1);
    const secenek = karistir([x.parca, ...kardes, ...yanlis]).slice(0, 4);
    if (!secenek.includes(x.parca)) secenek[0] = x.parca;
    alan.innerHTML = `<p class="ust-baslik">Parçacık Tamamlama · Puan ${puan} · Seri ${seri}</p>
      <div class="pt-fiil">${esc(x.fiil)} <span class="pt-bos">____</span></div>
      <p class="orta">${esc(x.k.tr)}</p>
      ${cumle ? `<div class="soru-ipucu cumle">${cumle.html}</div>` : ''}
      <div class="secenekler">${karistir(secenek).map(p => `<button class="secenek pt-sec" data-p="${esc(p)}">${esc(x.fiil)} <b>${esc(p)}</b></button>`).join('')}</div>
      <div id="ptGeri"></div>`;
    let bitti = false;
    document.querySelectorAll('.pt-sec').forEach(b => b.onclick = () => {
      if (bitti) return; bitti = true;
      const ok = b.dataset.p === x.parca;
      document.querySelectorAll('.pt-sec').forEach(y => { y.disabled = true; if (y.dataset.p === x.parca) y.classList.add('dogru'); else if (y === b) y.classList.add('yanlis'); });
      if (ok) { puan += 10 + seri * 2; seri++; P.oyun.parcacik = (P.oyun.parcacik || 0) + 1; kaydet(); Basari.kontrol(); } else seri = 0;
      sayac++;
      // Aynı fiilin farklı parçacıklarla kazandığı anlamlar
      const tablo = ayni.slice().sort((a, b) => a.parca.localeCompare(b.parca)).map(a => `<tr class="${a.parca === x.parca ? 'pt-aktif' : ''}"><td><b>${esc(a.k.w)}</b> ${sesBtn(a.k.w)}</td><td>${esc(a.k.tr)}</td></tr>`).join('');
      $('#ptGeri').innerHTML = `<div class="sonuc ${ok ? 'iyi' : 'kotu'}"><b>${ok ? 'Doğru!' : 'Doğrusu:'}</b> ${esc(x.k.w)} ${sesBtn(x.k.w)}
        <button class="ana-btn" id="ptSonraki">Sonraki <kbd>Enter</kbd></button></div>
        ${ayni.length > 1 ? `<div class="pt-karsilastir"><h3>“${esc(x.fiil)}” ile kurulan phrasal verb'ler</h3><table class="tablo">${tablo}</table></div>` : ''}`;
      if (P.ayar.otoSes) Ses.oku(x.k.w);
      $('#ptSonraki').focus();
      $('#ptSonraki').onclick = () => oyna(alan);
      klavye = e => { if (e.key === 'Enter') { e.preventDefault(); oyna(alan); } };
    });
    klavye = e => { const n = +e.key; const bs = document.querySelectorAll('.pt-sec'); if (n >= 1 && n <= bs.length) bs[n - 1].click(); };
  }
  return { oyna, sayi: () => (liste ||= phrasalListe()).length };
})();
