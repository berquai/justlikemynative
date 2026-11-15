// AnadilimGibi — vitrin: karşılama ekranı, kullanım kılavuzu, Hakkında ve ana ekrana ekleme rehberi
// Copyright (C) 2026 Berkay Çelik
'use strict';

// Karşılama ekranı uygulamanın ana sayfasıdır: her açılışta ve logoya dokununca gösterilir.

const SOZLUK_ACIKLAMA = 'Uygulamada kullanılan sözlük, <b>Berkay Çelik</b> tarafından derlenmiştir. Uzun yıllar süren çalışmaların ve harcanan emeğin ürünüdür. Telaffuzlar ve örnek cümleler yapay zekâ desteğiyle gözden geçirilip eksiklikler tamamlanmış ve tespit edilen bazı hatalar düzeltilmiştir. Gerçek bir sözlük olma iddiası yoktur: A\'dan Z\'ye bütün kelimeleri ya da bir kelimenin bütün anlamlarını içermez; mümkün olduğunca en yaygın kullanılan ve sınavlarda en çok tercih edilen anlamlara öncelik verilmiştir. İçerik hiçbir garanti olmaksızın sunulur. Sözlüğü dilediğin gibi düzenleyebilir, kelime ekleyip çıkarabilirsin.';
const KONUM_METNI = 'İngilizcesini geliştirmek ve kelime bilgisini kalıcı olarak artırmak isteyenler için tasarlandı. Akademik ağırlıklı kelime listesi sayesinde YDS ve YÖKDİL\'e hazırlanırken de güçlü bir avantaj sağlar.';
// Oyun adları her yerde cümle düzeninde yazılır (yalnızca ilk harf büyük)
const PARCACIK_AD = 'Parçacık tamamlama';
const SEREF_METNI = 'Üç alıştırma türünde de 360 günlük tekrarını doğru cevapladığın kelime Şeref Tribünü\'ne çıkar ve artık sorulmaz.';

// Basit çizgi simgeler (24×24)
const IKON = {
  takvim: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  uc: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.8 7.2 6.2 15.8M13.2 7.2l4.6 8.6M7.5 18h9"/>',
  kalem: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><path d="M6 14h12v7H6z"/>',
  oyun: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4M15.5 11.5h.01M18 13.5h.01"/>',
  rozet: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
  kitap: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11h5"/>',
  bulut: '<path d="M7 18a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19.5 11 3.5 3.5 0 0 1 18 18z"/><path d="m10 14 2-2 2 2M12 12v5"/>',
  yds: '<path d="M9 3h6l1 3H8z"/><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 11h2M8 15h2M13 11h3M13 15h3"/>',
  miknatis: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/>',
  ucak: '<path d="M10.5 3.5 12 3l1.5.5v6.5l7.5 4.5v2l-7.5-2.5V19l2 1.5v1.5L12 21l-3.5 1v-1.5l2-1.5v-4.5L3 16.5v-2L10.5 10z"/>',
  ses: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  saat: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  kep: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  ok: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  paylas: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  menu: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  arti: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
};
const ikon = (ad, s = '') => `<svg class="ikon ${s}" viewBox="0 0 24 24" aria-hidden="true">${IKON[ad] || ''}</svg>`;
const logoImg = (boy = 64, s = '') => `<img class="logo-img ${s}" src="app/ikon.svg" width="${boy}" height="${boy}" alt="">`;

/* ================= Ana ekrana ekleme rehberi ================= */
const Kurulum = (() => {
  let olay = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); olay = e; tazele(); });
  window.addEventListener('appinstalled', () => { olay = null; bildir('AnadilimGibi ana ekrana eklendi'); tazele(); });
  const yuklu = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function cihaz() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'masaustu';
  }
  function tazele() { document.querySelectorAll('[data-kurulum]').forEach(el => { el.outerHTML = html(el.dataset.kurulum); }); bagla(); }
  function adimlar() {
    const c = cihaz();
    if (c === 'ios') return {
      baslik: 'iPhone ve iPad (Safari)',
      liste: [
        `Bu sayfayı <b>Safari</b>'de aç.`,
        `Alttaki (iPad'de üstteki) <b>Paylaş</b> düğmesine ${ikon('paylas', 'satir-ici')} dokun.`,
        `Listeyi kaydırıp <b>Ana Ekrana Ekle</b>'yi ${ikon('arti', 'satir-ici')} seç.`,
        `Sağ üstteki <b>Ekle</b>'ye dokun. Simge ana ekranında belirir.`,
      ],
    };
    if (c === 'android') return {
      baslik: 'Android (Chrome)',
      liste: [
        `Bu sayfayı <b>Chrome</b>'da aç.`,
        `Sağ üstteki <b>⋮</b> menüsüne ${ikon('menu', 'satir-ici')} dokun.`,
        `<b>Ana ekrana ekle</b> ya da <b>Uygulamayı yükle</b>'yi seç.`,
        `<b>Yükle</b>'ye dokun. Simge ana ekranında ve uygulama listende belirir.`,
      ],
    };
    return {
      baslik: 'Bilgisayar (Chrome ya da Edge)',
      liste: [
        `Adres çubuğunun sağındaki <b>Yükle</b> simgesine tıkla (Edge'de <b>…</b> menüsü › Uygulamalar › <b>Bu siteyi uygulama olarak yükle</b>).`,
        `<b>Yükle</b>'yi onayla. AnadilimGibi kendi penceresinde açılır.`,
        `Telefonunda bu sayfayı açtığında o telefona uygun adımlar görünür.`,
      ],
    };
  }
  function html(tur = 'kart') {
    if (yuklu()) return tur === 'kilavuz' ? `<div data-kurulum="${tur}"><p class="bilgi">AnadilimGibi şu an uygulama olarak açık; ana ekrana zaten eklemişsin. 👍</p></div>` : `<div data-kurulum="${tur}" hidden></div>`;
    const a = adimlar();
    return `<div class="kurulum" data-kurulum="${tur}">
      <div class="kurulum-ust">${logoImg(48)}<div><b>Ana ekrana ekle</b><span class="soluk">Bir uygulama gibi tek dokunuşla aç, internet yokken de çalış.</span></div>
        ${olay ? `<button class="ana-btn" data-yukle>${ikon('arti')} Ana ekrana ekle</button>` : ''}</div>
      <p class="kucuk"><b>${a.baslik}</b></p>
      <ol class="kurulum-adim">${a.liste.map(x => `<li>${x}</li>`).join('')}</ol>
    </div>`;
  }
  function bagla() {
    document.querySelectorAll('[data-yukle]').forEach(b => b.onclick = async () => {
      if (!olay) return;
      olay.prompt();
      try { await olay.userChoice; } catch (e) { }
      olay = null; tazele();
    });
  }
  return { html, bagla, yuklu, cihaz };
})();

/* ================= Karşılama ================= */
function ekranKarsilama() {
  const ornek = K.reduce((n, k) => n + (k.ex ? k.ex.length : 0), 0);
  const yuvarla = n => (Math.floor(n / 100) * 100).toLocaleString('tr-TR');
  const ozellikler = [
    ['takvim', 'Aralıklı tekrar', 'Her kelimeyi tam unutmak üzereyken yeniden sorar: 1, 3, 7, 14, 30, 60, 180 ve 360 gün sonra. Az çalışırsın, kalıcı öğrenirsin.'],
    ['uc', 'Üç yönlü çalışma', 'Anlamını tanır, cümlenin içinde bulur, sonra kendin yazarsın. Kelime yalnızca tanıdık gelmez, gerçekten senin olur.'],
    ...(typeof ETUT_HAZIR !== 'undefined' && ETUT_HAZIR ? [['saat', 'Etüt Köşesi', 'Günlük rutinden bağımsız, süreli ve sınırsız çalışma: karışık alıştırma, dikte ya da gölgeleme. Sonunda yanlışlarını ve doğrularını gösteren bir karne.']] : []),
    ['kalem', 'Yazdır-Çöz', 'Çengel bulmaca, sözcük avı, boşluk doldurma… Kâğıda yazdır, kalemle çöz; sonuçlarını girince tekrar takvimin de güncellenir. Sınıf etkinlikleri için de çok uygun!'],
    ['yds', 'YDS ve YÖKDİL tarzı sorular', 'Kelime boşluğu, bağlaç ve edat seçimi, cümle tamamlama ve eşdizim (collocation) soruları; beş seçenekli, özgün.'],
    ['oyun', 'Oyunlar', 'Çiçek büyüt, karışık harfler, kelime eşleştirme ve parçacık tamamlama (phrasal verb) ile tekrar etmeyi eğlenceye dönüştür.'],
    ['miknatis', `${PARCACIK_AD} (phrasal verb)`, 'Phrasal verb\'leri oyunla öğren: give up, give in, give away… Aynı fiilin farklı anlamlarını yan yana gör.'],
    ['rozet', 'Başarılar ve rozetler', 'Taştan Efsane\'ye yedi seviyeli rozetler, seriler ve Şeref Tribünü emeğini görünür kılar.'],
    ['ses', 'Dinle, yaz, konuş', 'Kelimeleri ve cümleleri dinle; dikteyle yaz, gölgelemeyle tekrar et. Destekleyen tarayıcılarda söylediklerin de kontrol edilir.'],
    ['kitap', 'Düzenlenebilir sözlük', 'Kelime ekle, anlamı değiştir, kendi örneğini yaz. Sözlük senin çalışma defterine dönüşür.'],
    ['bulut', 'Cihazlar arası eşitleme', 'Google hesabınla giriş yap; telefonda başladığın yerden bilgisayarda devam et.'],
    ['ucak', 'İnternetsiz çalışma', 'Ana ekrana ekle; uçakta, metroda, internet yokken de kaldığın yerden devam et.'],
  ];
  ana().innerHTML = `
  <section class="vitrin-kahraman">
    <div class="vk-metin">
      <p class="vk-ust">Ücretsiz · Sınırsız · Reklamsız</p>
      <h1>Kelime bilgini <span>kalıcı olarak</span> artır.</h1>
      <p class="vk-alt">İngilizcesini geliştirmek isteyenler için aralıklı tekrar, bulmacalar ve oyunlarla kelime çalışma uygulaması. Hiçbir ücret ödemeden, istediğin kadar.</p>
      <div class="butonlar">
        <button class="ana-btn buyuk-btn" id="hadiBasla">Hadi başla ${ikon('ok')}</button>
        <button class="btn buyuk-btn" data-git="kilavuz">Nasıl çalışır?</button>
      </div>
    </div>
    <div class="vk-gorsel" aria-hidden="true">
      ${logoImg(132, 'vk-logo')}
      <div class="vk-kart">
        <div class="vk-kart-ust"><b>resilience</b><span class="kk-pr">/ri-Zİ-li-ıns/</span></div>
        <div class="vk-kart-tr">Direnç, dayanıklılık</div>
        <div class="vk-kart-ex">The community showed great <mark>resilience</mark> after the earthquake.</div>
        <div class="vk-kart-alt"><span class="nokta d-pekisti"></span> 14 gün sonra yeniden</div>
      </div>
    </div>
  </section>

  <section class="vitrin-sayilar">
    <div><b>${K.length.toLocaleString('tr-TR')}</b><span>kelime ve kalıp</span></div>
    <div><b>${yuvarla(ornek)}+</b><span>örnek cümle</span></div>
    <div><b>3</b><span>yönlü çalışma</span></div>
    <div><b>0 ₺</b><span>tamamen ücretsiz</span></div>
  </section>

  <section class="vitrin-bolum">
    <h2>Neler yapabilirsin?</h2>
    <p class="soluk">Hepsi tek bir yerde, hepsi ücretsiz ve sınırsız.</p>
    <div class="ozellik-izgara">${ozellikler.map(([i, b, a]) => `<article class="ozellik">${ikon(i)}<h3>${b}</h3><p>${a}</p></article>`).join('')}</div>
  </section>

  <section class="vitrin-bolum yds">
    ${ikon('kep', 'yds-ikon')}
    <div>
      <h2>YDS ve YÖKDİL'e hazırlananlara</h2>
      <p>${KONUM_METNI}</p>
      <p class="soluk">Listede akademik metinlerde ve sınavlarda sık geçen kelimeler, bağlaçlar, edat kalıpları ve phrasal verb'ler ağırlıktadır. Her kelimede yaklaşık seviye ve konu etiketi, sık kullanılanlarda eşdizimler var; YDS tarzı sorular hem günlük rutinde hem Etüt Köşesi'nde.</p>
    </div>
  </section>

  <section class="vitrin-bolum">
    <h2>Üç adımda başla</h2>
    <ol class="adim-liste">
      <li><b>Hadi başla'ya dokun.</b> Hemen çalışmaya başlarsın. Google ile giriş yaparsan ilerlemen kaydedilir ve bütün cihazlarında seninle gelir.</li>
      <li><b>Her gün birkaç dakika ayır.</b> Her gün yeni kelimeler ve bolca alıştırma; neyi ne zaman tekrar edeceğini uygulama senin için planlar.</li>
      <li><b>Ana ekrana ekle.</b> Uygulama gibi aç, internetsiz de çalış.</li>
    </ol>
    ${Kurulum.html('kart')}
  </section>

  <section class="vitrin-bolum vitrin-son">
    <h2>Hazırsan başlayalım.</h2>
    <div class="butonlar orta"><button class="ana-btn buyuk-btn" id="hadiBasla2">Eğitime başla ${ikon('ok')}</button></div>
  </section>`;
  const basla = () => git('bugun');
  $('#hadiBasla').onclick = basla;
  $('#hadiBasla2').onclick = basla;
  Kurulum.bagla();
}

/* ================= Kullanım kılavuzu ================= */
function ekranKilavuz() {
  const etut = typeof ETUT_HAZIR !== 'undefined' && ETUT_HAZIR;
  const bolumler = [
    ['rutin', 'Günlük rutin', `<p><b>Bugün</b> ekranı o gün ne yapacağını gösterir: kaç yeni kelime, kaç tekrar. <b>Çalışmaya başla</b>'ya dokun; önce yeni kelimelerle tanışırsın, ardından tekrar zamanı gelen alıştırmalar karışık sırayla gelir.</p>
      <p>Günlük rutin, seni yormayacak bir tempoda tutulur. Tekrarlar birikirse uygulama yeni kelimeleri kendiliğinden azaltır, tekrarlar eridikçe geri getirir; böylece hiçbir gün altından kalkamayacağın bir yük oluşmaz. Günlük yeni kelime sayısını ve günlük soru sayısını (25, 50 ya da 100) Ayarlar'dan kendine göre seçebilirsin.</p>`],
    ['uc', 'Üç alıştırma türü', `<ul><li><b>Anlama</b> (İngilizce → Türkçe): Kelimeyi görür ya da dinlersin, anlamını seçersin.</li>
      <li><b>Bağlam</b> (boşluklu cümle): Örnek cümledeki boşluğa uyan kelimeyi bulursun.</li>
      <li><b>Üretme</b> (Türkçe ya da tanım → İngilizce): Kelimeyi kendin yazarsın.</li></ul>
      <p>Kelime ilerledikçe alıştırma zorlaşır: şıktan seçme → harf dizme → ipuçlu yazma → serbest yazma. Küçük yazım hataları hoş görülür.</p>`],
    ['takvim', 'Tekrar takvimi', `<p>Doğru cevapladığın alıştırma <b>1, 3, 7, 14, 30, 60, 180 ve 360</b> gün sonra yeniden sorulur; yanlış cevapladığın hemen başa döner. Üç yönde de 14 günlük aralığı geçen kelime “pekişti”, 180 günlüğü geçen “ustalaştı” sayılır.</p>
      <p>${SEREF_METNI}</p>`],
    ...(etut ? [['saat', 'Etüt Köşesi', `<p>Günlük rutin bittiğinde ya da daha fazla çalışmak istediğinde <b>Etüt</b>'e geç. Süreyi (varsayılan 20 dakika) ve çalışma türünü seç; istediğin kadar oturum başlatabilirsin. Sayaç dakika dakika ilerler, son dakikada saniyeleri gösterir. Süre dolduğunda elindeki soruyu tamamlarsın, ardından <b>Tamamla</b>'yı ya da süreyi uzatmayı seçersin (10 dakikalık etüt 10 dakika, daha uzun etütler 20 dakika uzar).</p>
      <ul><li><b>Karışık alıştırma:</b> Anlama, bağlam ve üretme soruları karışık gelir.</li>
      <li><b>Dikte:</b> Cümleyi dinler, duyduğunu yazarsın. Büyük/küçük harf ve noktalama hata sayılmaz; yanlış ya da eksik kelimeler işaretlenir. <b>Yavaş dinle</b> ile cümleyi ağır tempoda tekrar duyabilirsin.</li>
      <li><b>Gölgeleme:</b> Cümleyi dinler, aynı ritimle yüksek sesle tekrar edersin. Destekleyen tarayıcılarda söylediğin konuşma tanımayla kontrol edilir; desteklemeyenlerde kendini değerlendirirsin.</li></ul>
      <p>Etüdün sonunda bir <b>karne</b> gelir: kaç doğru, kaç yanlış, her yanlışında senin cevabın ve doğrusu. Etütte yanlış yaptığın kelime tekrar takviminde öne alınır; doğru cevaplar günlük düzenini değiştirmez. Toplam etüt süren, sabah, gece ve hafta sonu etütlerin rozet kazandırır.</p>
      <p class="konusma-not">🎤 Konuşma kontrolü Chrome'da en iyi sonucu verir; bazı tarayıcılar desteklemez. İlk kullanımda mikrofon izni istenir.</p>`]] : []),
    ['kalem', 'Yazdır-Çöz', `<p>Tanıştığın kelimelerden çengel bulmaca, sözcük avı, harf yerleştirme ya da boşluk doldurma sayfası hazırla; <b>Yazdır / PDF</b> ile çıktı al. Çözdükten sonra cevap anahtarına bakıp yanlışlarını işaretlersen tekrar takvimin de güncellenir.</p>
      <p>Bu bulmacalar öğrenciler ve öğretmenler için de çok faydalıdır: Her sayfanın ayrı bir cevap anahtarı olduğu için sınıf etkinliği, ödev ya da kısa bir kelime sınavı olarak kullanılabilir.</p>`],
    ['yds', 'YDS ve YÖKDİL tarzı sorular', `<p>Sınavların biçimine benzeyen ama tamamen özgün, beş seçenekli sorular: <b>kelime boşluğu</b>, <b>bağlaç ve edat seçimi</b>, <b>cümle tamamlama</b> ve <b>eşdizim (collocation)</b>. Günlük rutinin sonunda 5 soru gelir (Ayarlar'dan kapatabilirsin); daha fazlası için Etüt Köşesi'nde “YDS / YÖKDİL tarzı” türünü seç.</p>
      <p>Sözlükte, Yazdır-Çöz'de ve Etüt'te kelimeleri <b>yaklaşık seviyeye</b> (A2–C2) ve <b>konuya</b> göre süzebilirsin. Kelime kartlarında sık kullanılan <b>eşdizimler</b> (collocation; make a decision, heavy rain gibi) ayrı bir satırda gösterilir.</p>`],
    ['oyun', 'Oyunlar', `<p><b>Çiçek büyüt</b> (doğru harfleri buldukça saksıdaki fide büyür, kelime tamamlanınca çiçek açar), <b>Karışık harfler</b>, <b>Kelime eşleştirme</b> ve <b>${PARCACIK_AD}</b> (phrasal verb). ${PARCACIK_AD} oyununda fiil verilir, doğru parçacığı seçersin (give <b>up</b>, give <b>in</b>…); ardından aynı fiilin farklı parçacıklarla kazandığı anlamlar yan yana gösterilir. Oyunlar tekrar takvimini etkilemez; istediğin kadar oynayabilirsin.</p>`],
    ['kitap', 'Sözlüğü kişiselleştir', `<p><b>Sözlük</b>'te bütün kelimeleri arayabilir, harfe ve duruma göre süzebilirsin. Yeni kelime ekleyebilir, anlam ya da örnek cümle değiştirebilir, istemediğin kelimeyi silebilirsin (silinenler geri yüklenebilir). Öğrendiğin bir kelimenin içeriği değişirse yeniden öğrenilecekler arasına alınır.</p>
      <p class="soluk kucuk">${SOZLUK_ACIKLAMA}</p>`],
    ['bulut', 'Cihazlar arası eşitleme', `<p>İlerlemen önce bu cihazdaki tarayıcıda saklanır. <b>Ayarlar › Telefon ve bilgisayarlar arasında ilerleme</b> bölümünden Google hesabınla giriş yaparsan ilerlemen Google Drive'ındaki küçük bir dosyaya kaydedilir; diğer cihazlarında da aynı hesapla giriş yaparak kaldığın yerden devam edersin. Eşitleme kullanmıyorsan ara sıra <b>Yedeği indir</b>.</p>`],
    ['ucak', 'Ana ekrana ekle', `<div data-kurulum-yer></div>`],
    ['rozet', 'Önerilen çalışma alışkanlıkları', `<ul>
      <li><b>Her gün az ama düzenli çalış.</b> Günde 15–20 dakika, haftada bir uzun oturumdan çok daha etkilidir.</li>
      <li><b>Tekrarları erteleme.</b> Aralıklı tekrar, kelimeyi tam unutmak üzereyken sorduğu için işe yarar.</li>
      <li><b>Sesli oku.</b> Kelimeyi ve örnek cümleyi dinleyip kendin de söyle; telaffuz böyle yerleşir.</li>
      <li><b>Kendi cümleni kur.</b> Zorlandığın kelimeye sözlükten kendi örneğini ekle.</li>
      <li><b>Kâğıtla pekiştir.</b> Haftada bir Yazdır-Çöz bulmacası, ekranda öğrendiğini kalemle kalıcı hâle getirir. Bu bulmacalar öğrenciler ve öğretmenler için de çok faydalıdır; sınıfta etkinlik ya da ödev olarak kullanılabilir.</li>
      <li><b>Yeni kelime sayısını ayarla.</b> Tekrarlar seni zorluyorsa Ayarlar'dan günlük yeni kelime sayısını düşür.</li></ul>`],
  ];
  ana().innerHTML = `
  <section class="panel kilavuz">
    <h1>Kullanım Kılavuzu</h1>
    <p class="soluk">AnadilimGibi'den en iyi verimi almak için bilmen gereken her şey bu sayfada.</p>
    <div class="bes-adim">
      <h2>5 adımda başla</h2>
      <ol class="adim-liste">
        <li><b>Bugün</b> ekranında <b>Çalışmaya başla</b>'ya dokun.</li>
        <li>Yeni kelimelerin kartını oku, örnek cümleyi dinle.</li>
        <li>Alıştırmaları cevapla; yanlışlar birazdan yeniden gelir.</li>
        <li>Her gün geri gel: uygulama neyi ne zaman tekrar edeceğini senin için planlar.</li>
        <li>Ana ekrana ekle ve istersen Google ile giriş yaparak cihazlarını eşitle.</li>
      </ol>
    </div>
    <nav class="kilavuz-icindekiler" aria-label="İçindekiler">${bolumler.map(([i, b], n) => `<a href="#kilavuz" data-bolum="k${n}">${b}</a>`).join('')}</nav>
  </section>
  ${bolumler.map(([i, b, h], n) => `<section class="panel kilavuz-bolum" id="k${n}"><h2>${ikon(i)} ${b}</h2>${h}</section>`).join('')}
  <p class="orta soluk">Sorun, öneri ya da takıldığın bir yer mi var? <a href="https://instagram.com/${UYGULAMA.instagram}" target="_blank" rel="noopener">Instagram'dan yaz</a>, her türlü geri bildirim beni mutlu eder.</p>`;
  const yer = $('[data-kurulum-yer]');
  if (yer) yer.outerHTML = Kurulum.html('kilavuz');
  Kurulum.bagla();
  document.querySelectorAll('[data-bolum]').forEach(a => a.onclick = e => { e.preventDefault(); e.stopPropagation(); document.getElementById(a.dataset.bolum)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}

/* ================= Hakkında ================= */
function ekranHakkinda() {
  const U = UYGULAMA;
  ana().innerHTML = `
  <section class="panel hakkinda">
    <div class="hk-ust">
      ${logoImg(72, 'hk-logo')}
      <div>
        <h1>${U.ad}</h1>
        <p class="soluk">Sürüm ${U.surum} · ${U.yil} · Tamamen ücretsiz</p>
      </div>
    </div>
    <p class="hk-giris">AnadilimGibi, İngilizcesini geliştirmek ve kelime bilgisini <u>kalıcı olarak</u> artırmak isteyenler için <b>${U.yazar}</b> tarafından geliştirilen <u>tamamen ücretsiz</u> bir eğitim platformudur.
      Aralıklı tekrar sistemini; alıştırmalar, yazdırılabilir bulmacalar ve oyunlarla birleştirip öğrenmeyi eğlenceli bir alışkanlık hâline getirmeyi amaçlar.
      Uygulama, akademik ağırlıklı kelime listesi sayesinde YDS ve YÖKDİL'e hazırlananlar için de iyi bir yardımcıdır.</p>
    <div class="hk-imza">
      <h2>Sözlük nasıl oluştu?</h2>
      <p>${SOZLUK_ACIKLAMA}</p>
    </div>
    <div class="butonlar"><button class="btn" data-git="kilavuz">Kullanım kılavuzu</button></div>
  </section>

  <section class="panel">
    <h2>Nasıl çalışır?</h2>
    <ul class="hk-liste">
      <li>Her gün <b>yeni kelimeler</b> ve bolca alıştırma gelir; günlük yük, seni bunaltmayacak biçimde kendiliğinden dengelenir.</li>
      <li>Her kelime üç yönden çalışılır: <b>anlama</b>, <b>bağlam</b> ve <b>üretme</b>.</li>
      <li>Doğru cevapladığın alıştırma <b>1, 3, 7, 14, 30, 60, 180 ve 360</b> gün sonra yeniden sorulur; yanlış cevapladığın hemen başa döner.</li>
      <li>${SEREF_METNI}</li>
    </ul>
    <p><button class="link" data-git="kilavuz">Ayrıntılar kılavuzda →</button></p>
  </section>

  <section class="panel">
    <h2>Geliştiriciden</h2>
    <p>İngilizce, uzun yıllardır hem eğitim hem de iş hayatımın ayrılmaz bir parçası. Bu dili öğrenmek için yıllarca eğitim aldım, pek çok sınava girdim; bugün de işimde ve günlük çalışmalarımda kullanmaya devam ediyorum. Bu süreç bana, kalıcı öğrenmenin ancak düzenli ve sabırlı bir çalışmayla mümkün olduğunu öğretti.</p>
    <p>Bugün İngilizce öğrenmek isteyenler için sayısız kaynak ve platform var. Ancak bunların önemli bir kısmı ya ücretli, ya reklamlarla dolu ya da kullanıcının gerçek ihtiyacını karşılamaktan uzak.
      AnadilimGibi'yi geliştirirken kendimi kullanıcının yerine koydum ve yıllar içinde “keşke böyle olsaydı” dediğim her şeyi bir araya getirmeye çalıştım. Ortaya çıkan uygulama ücretsizdir, reklam içermez ve İngilizce öğrenmeye katkı sağlamaktan başka hiçbir amaç taşımaz.</p>
    <p>Edindiğim birikimin başkalarına da faydalı olması benim için büyük bir memnuniyet. Uygulamadan yararlanan herkese iyi çalışmalar dilerim; bir teşekkür, benim için fazlasıyla yeterlidir. <span class="hk-imza-ad">— ${U.yazar}</span></p>
    <div class="iletisim">
      <div><b>Her türlü geri bildirim beni mutlu eder</b>
        <span class="soluk">Görüşünü, önerini ya da fark ettiğin bir hatayı paylaşırsan uygulamayı birlikte daha da iyi hâle getirebiliriz.${U.eposta ? ` E-posta: ${U.eposta}` : ''}</span></div>
      <a class="ana-btn" href="https://instagram.com/${U.instagram}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        @${U.instagram}</a>
    </div>
  </section>

  <section class="panel">
    <h2>Gizlilik</h2>
    <p class="soluk">Uygulamanın kendi sunucusu yoktur; çerez, reklam ya da kişisel izleme kullanılmaz, yalnızca anonim ziyaretçi sayısı tutulur. İlerlemen bu cihazdaki tarayıcıda ve yalnızca sen bağlarsan kendi Google Drive'ında ya da GitHub hesabında tutulur.
      Ayrıntılar için <a href="gizlilik.html">Gizlilik Politikası</a> ve <a href="kosullar.html">Kullanım Koşulları</a>.</p>
    <h2>Telif ve garanti</h2>
    <p class="soluk"><b>© ${U.yil} ${U.yazar}.</b> Tüm hakları saklıdır. Uygulamanın dağıtılan her kopyasında yazar bilgisi ve bu telif bildirimi korunmalıdır;
      uygulama ya da herhangi bir parçası başka bir kişinin eseriymiş gibi sunulamaz. Uygulama ve içeriği <b>hiçbir garanti olmaksızın</b>, “olduğu gibi” sunulur.</p>
  </section>`;
}
