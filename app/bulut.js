// AnadilimGibi — bulut eşitleme (Google Drive ve GitHub)
// Copyright (C) 2026 Berkay Çelik
//
// İlerleme (P) kullanıcının KENDİ hesabında tutulur:
//   • Google Drive: Drive'ında "justlikemynative-ilerleme.json" dosyası (uygulama yalnızca kendi oluşturduğu dosyayı görebilir)
//   • GitHub: hesabındaki gizli bir Gist
// Uygulamanın kendi sunucusu yoktur; veriler tarayıcıdan doğrudan Google'a / GitHub'a gider.
'use strict';

// Google Cloud Console'da oluşturulan OAuth istemci kimliği (gizli değildir). Boşsa Google girişi gösterilmez.
const GOOGLE_ISTEMCI_KIMLIGI = window.JLMN_GOOGLE_ISTEMCI || '421367082349-qsj92l223i39mk907v0k3lkbe635uq10.apps.googleusercontent.com';

const Bulut = (() => {
  const DOSYA = 'justlikemynative-ilerleme.json';
  const YAZMA_ARALIGI = 15000; // çalışırken en fazla 15 sn'de bir gönder

  function jsonOku(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
  function jsonYaz(k, v) { try { v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k); } catch (e) { } }
  const hataNesnesi = (m, oturum) => Object.assign(new Error(m), { oturum: !!oturum });
  async function getir(url, secenek, ad) {
    let r;
    try { r = await fetch(url, secenek); } catch (e) { throw hataNesnesi('İnternet bağlantısı yok gibi görünüyor'); }
    if (r.status === 401) throw hataNesnesi(`${ad} erişimi geçersiz ya da süresi dolmuş`, true);
    if (r.status === 403 || r.status === 429) throw hataNesnesi(`${ad} isteği şu an reddetti (izin ya da sınır); biraz sonra tekrar denenecek`);
    if (r.status === 404) throw Object.assign(hataNesnesi(`${ad}'daki ilerleme kaydı bulunamadı`), { yok: true });
    if (!r.ok) throw hataNesnesi(`${ad} yanıtı: ${r.status}`);
    return r;
  }

  /* ---------- Ortak eşitleme motoru ---------- */
  // s: { kod, ad, bagli(), erisim(), oku() -> metin|null, yaz(metin), hemenYaz(metin) }
  function motor(s) {
    const SON = 'kelimeBulmaca.son.' + s.kod; // iki tarafın en son uzlaştığı P.updated
    const m = { durum: '', hata: false, oturum: false };
    let zamanlayici = null, calisiyor = false, tekrar = false;
    const son = () => +localStorage.getItem(SON) || 0;
    const sonYaz = u => { try { localStorage.setItem(SON, String(u)); } catch (e) { } };
    function durumla(d, h, o = false) {
      const degisti = d !== m.durum || h !== m.hata || o !== m.oturum;
      Object.assign(m, { durum: d, hata: h, oturum: o });
      if (degisti) yenile();
    }
    // Son eşitlemeden beri yalnızca bir taraf değiştiyse onu al; ikisi de değiştiyse kullanıcıya sor.
    async function esitle() {
      if (!s.bagli()) return;
      if (!s.erisim()) return durumla(`${s.ad} oturumunun süresi doldu. Eşitlemek için yeniden bağlan.`, true, true);
      if (calisiyor) { tekrar = true; return; }
      calisiyor = true; clearTimeout(zamanlayici); zamanlayici = null;
      try {
        const metin = await s.oku();
        let uzak = null; try { uzak = metin && metin.trim() ? JSON.parse(metin) : null; } catch (e) { }
        const sn = son();
        const dolu = x => !!(x && x.w && Object.keys(x.w).length);
        const uzakDegisti = dolu(uzak) && uzak.updated > sn;
        const yerelDegisti = dolu(P) && P.updated > sn;
        let al = false;
        if (uzakDegisti) al = !yerelDegisti || confirm(`Başka bir cihazda yapılmış ve buraya henüz gelmemiş çalışma var; bu cihazda da ${s.ad}'a gönderilmemiş çalışma var.\n\nTamam: diğer cihazdakini kullan\nİptal: bu cihazdakini kullan (${s.ad}'dakinin üzerine yazılır)`);
        if (al) {
          P = uzak; tamamla();
          try { localStorage.setItem(LS, JSON.stringify(P)); } catch (e) { }
          sonYaz(P.updated);
          Object.assign(m, { durum: 'Diğer cihazdaki ilerleme yüklendi.', hata: false, oturum: false });
          git(aktifEkran === 'calis' ? 'bugun' : aktifEkran);
        } else {
          if (!uzak || uzak.updated !== P.updated) { const u = P.updated; await s.yaz(JSON.stringify(P)); sonYaz(u); }
          else sonYaz(P.updated);
          durumla('Eşitlendi.', false);
        }
      } catch (e) { durumla('Eşitlenemedi: ' + e.message, true, e.oturum); }
      finally { calisiyor = false; if (tekrar) { tekrar = false; esitle(); } }
    }
    function planla() {
      if (!s.bagli() || zamanlayici) return;
      zamanlayici = setTimeout(() => { zamanlayici = null; esitle(); }, YAZMA_ARALIGI);
    }
    // Sayfa gizlenirken (telefonda başka uygulamaya geçince de) bekleyen değişikliği hemen gönder
    function hemenGonder() {
      if (!s.bagli() || !s.erisim() || !zamanlayici) return;
      clearTimeout(zamanlayici); zamanlayici = null;
      const u = P.updated;
      s.hemenYaz(JSON.stringify(P)).then(r => { if (r && r.ok) sonYaz(u); }).catch(() => { });
    }
    function sifirla() { clearTimeout(zamanlayici); zamanlayici = null; localStorage.removeItem(SON); Object.assign(m, { durum: '', hata: false, oturum: false }); }
    return { m, esitle, planla, hemenGonder, sifirla, sonYaz, durumla };
  }

  /* ---------- Google Drive ---------- */
  const Google = (() => {
    const AYAR = 'kelimeBulmaca.google'; // { id, token, bitis, hesap }
    const KAPSAM = 'https://www.googleapis.com/auth/drive.file';
    const API = 'https://www.googleapis.com';
    let st = jsonOku(AYAR), istemci = null, bekleyen = null;
    const etkin = !!GOOGLE_ISTEMCI_KIMLIGI;
    const bagli = () => !!(etkin && st && st.bagli);
    const erisim = () => !!(st && st.token && Date.now() < st.bitis);
    const sakla = () => jsonYaz(AYAR, st);
    const basliklar = ek => ({ Authorization: 'Bearer ' + st.token, ...ek });

    // Google kimlik kitaplığını arka planda yükle (düğmeye basıldığında hazır olsun; açılır pencere engellenmesin)
    if (etkin) {
      const kur = () => {
        istemci = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_ISTEMCI_KIMLIGI, scope: KAPSAM,
          callback: c => { const b = bekleyen; bekleyen = null; if (!b) return; c.error ? b.hata(new Error(c.error_description || c.error)) : b.ok(c); },
          error_callback: e => { const b = bekleyen; bekleyen = null; if (b) b.hata(new Error(e.type === 'popup_closed' ? 'Giriş penceresi kapatıldı' : e.type === 'popup_failed_to_open' ? 'Giriş penceresi açılamadı (açılır pencere engelleyiciyi kontrol et)' : (e.message || e.type))); },
        });
      };
      if (window.google && google.accounts && google.accounts.oauth2) kur();
      else {
        const sc = document.createElement('script');
        sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = kur;
        document.head.appendChild(sc);
      }
    }
    // Mutlaka bir dokunma/tıklama içinden çağrılmalı
    function tokenAl(ilk) {
      return new Promise((ok, hata) => {
        if (!istemci) return hata(new Error('Google bileşeni henüz yüklenmedi; birkaç saniye sonra tekrar dene'));
        bekleyen = { ok, hata };
        istemci.requestAccessToken({ prompt: ilk ? 'consent' : '', ...(st && st.hesap ? { login_hint: st.hesap } : {}) });
      });
    }
    async function oturumAc(ilk) {
      const c = await tokenAl(ilk);
      if (!c.scope || !c.scope.includes(KAPSAM)) throw new Error('Drive izni verilmedi. Girişte Drive kutusunu işaretlemen gerekiyor');
      st = { ...(st || {}), bagli: true, token: c.access_token, bitis: Date.now() + (c.expires_in - 120) * 1000 };
      sakla();
    }
    async function dosyaBul() {
      const q = encodeURIComponent(`name='${DOSYA}' and trashed=false`);
      const r = await getir(`${API}/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id)&spaces=drive`, { headers: basliklar(), cache: 'no-store' }, 'Google Drive');
      const j = await r.json();
      return j.files && j.files[0] ? j.files[0].id : null;
    }
    async function olustur(metin) {
      const sinir = 'jlmn' + Date.now();
      const govde = `--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: DOSYA, mimeType: 'application/json', description: 'AnadilimGibi ilerlemen. Uygulama tarafından otomatik güncellenir; silme ya da adını değiştirme.' }) +
        `\r\n--${sinir}\r\nContent-Type: application/json\r\n\r\n${metin}\r\n--${sinir}--`;
      const r = await getir(`${API}/upload/drive/v3/files?uploadType=multipart&fields=id`, { method: 'POST', headers: basliklar({ 'Content-Type': 'multipart/related; boundary=' + sinir }), body: govde }, 'Google Drive');
      const id = (await r.json()).id;
      if (!id) throw hataNesnesi('Google Drive dosyası oluşturulamadı');
      st.id = id; sakla();
    }
    const s = {
      kod: 'google', ad: 'Google Drive', bagli, erisim,
      async oku() {
        if (!st.id) { st.id = await dosyaBul(); sakla(); if (!st.id) return null; }
        try {
          const r = await getir(`${API}/drive/v3/files/${st.id}?alt=media`, { headers: basliklar(), cache: 'no-store' }, 'Google Drive');
          return await r.text();
        } catch (e) { if (e.yok) { st.id = null; sakla(); return null; } throw e; } // dosya silinmişse yeniden oluşturulur
      },
      async yaz(metin) {
        if (!st.id) return olustur(metin);
        await getir(`${API}/upload/drive/v3/files/${st.id}?uploadType=media`, { method: 'PATCH', headers: basliklar({ 'Content-Type': 'application/json' }), body: metin }, 'Google Drive');
      },
      hemenYaz(metin) {
        if (!st.id) return Promise.resolve(null);
        return fetch(`${API}/upload/drive/v3/files/${st.id}?uploadType=media`, { method: 'PATCH', headers: basliklar({ 'Content-Type': 'application/json' }), body: metin, keepalive: true });
      },
    };
    const e = motor(s);
    async function hesapAdi() {
      try {
        const r = await getir(`${API}/drive/v3/about?fields=user(emailAddress)`, { headers: basliklar() }, 'Google Drive');
        st.hesap = (await r.json()).user.emailAddress; sakla();
      } catch (x) { }
    }
    async function baglan() {
      try {
        const ilk = !bagli();
        await oturumAc(ilk);
        if (ilk) { await hesapAdi(); e.sifirla(); }
        await e.esitle();
        if (!e.m.hata) bildir(ilk ? 'Google Drive\'a bağlandı' : 'Eşitlendi');
      } catch (x) { if (!bagli()) { st = null; sakla(); } e.durumla('Bağlanılamadı: ' + x.message, true, bagli()); }
    }
    function kes() {
      if (!confirm('Bu cihazın Google bağlantısı kesilsin mi? İlerlemen bu cihazda ve Google Drive\'ında durmaya devam eder.')) return;
      try { if (st && st.token && window.google) google.accounts.oauth2.revoke(st.token, () => { }); } catch (x) { }
      st = null; sakla(); e.sifirla(); yenile();
    }
    function ayarHtml() {
      if (!etkin) return '';
      const d = e.m.durum ? `<p class="bilgi">${esc(e.m.durum)}</p>` : '';
      if (bagli()) return `<div class="bulut-kart bagli">
          <div class="bk-ust">${GOOGLE_LOGO}<div><b>Google Drive</b><small>${st.hesap ? esc(st.hesap) : 'bağlı'} · <span class="iyi-yazi">bağlı ✓</span></small></div></div>
          <p class="soluk kucuk">İlerlemen Drive'ındaki <b>${DOSYA}</b> dosyasında tutuluyor. Çalışırken ve uygulamadan çıkarken gönderilir,
            açınca diğer cihazlarda yaptığın çalışma alınır.${erisim() ? '' : ' Google güvenlik gereği oturumu her saat yeniler; eşitlemek için “Şimdi eşitle”ye dokun.'}</p>
          <div class="butonlar"><button class="ana-btn" id="gEsitle">Şimdi eşitle</button><button class="btn" id="gKes">Bağlantıyı kes</button></div>${d}</div>`;
      return `<div class="bulut-kart">
          <p class="soluk">Google hesabınla giriş yap; ilerlemen Google Drive'ına kaydedilsin ve telefon, bilgisayar fark etmeden kaldığın yerden devam et.
            Uygulama Drive'ında yalnızca kendi oluşturduğu ilerleme dosyasını görebilir.</p>
          <button class="google-btn" id="gBaglan">${GOOGLE_LOGO}<span>Google ile giriş yap</span></button>${d}</div>`;
    }
    function ayarBagla() {
      $('#gBaglan')?.addEventListener('click', baglan);
      $('#gEsitle')?.addEventListener('click', () => erisim() ? e.esitle() : baglan());
      $('#gKes')?.addEventListener('click', kes);
    }
    return { e, bagli, baglan, ayarHtml, ayarBagla, etkin };
  })();

  /* ---------- GitHub Gist ---------- */
  const GitHub = (() => {
    const AYAR = 'kelimeBulmaca.bulut'; // { token, id }
    const API = 'https://api.github.com';
    let a = jsonOku(AYAR);
    const bagli = () => !!(a && a.token && a.id);
    const sakla = () => jsonYaz(AYAR, a);
    const basliklar = ek => ({ Authorization: 'Bearer ' + a.token, Accept: 'application/vnd.github+json', ...ek });
    const istek = async (yol, o = {}) => (await getir(API + yol, { ...o, headers: basliklar(o.body ? { 'Content-Type': 'application/json' } : {}) }, 'GitHub')).json();
    const govde = metin => JSON.stringify({ files: { [DOSYA]: { content: metin } } });
    const s = {
      kod: 'github', ad: 'GitHub', bagli, erisim: () => true,
      async oku() {
        const g = await istek(`/gists/${a.id}?t=${Date.now()}`); // t: tarayıcı önbelleğini atla
        const f = g.files && g.files[DOSYA];
        if (!f) return null;
        return f.truncated ? (await fetch(f.raw_url)).text() : f.content;
      },
      yaz: metin => istek('/gists/' + a.id, { method: 'PATCH', body: govde(metin) }),
      hemenYaz: metin => fetch(API + '/gists/' + a.id, { method: 'PATCH', headers: basliklar({ 'Content-Type': 'application/json' }), body: govde(metin), keepalive: true }),
    };
    const e = motor(s);
    async function baglan(token) {
      a = { token: token.trim() };
      e.durumla('Bağlanıyor…', false);
      try {
        const liste = await istek(`/gists?per_page=100&t=${Date.now()}`);
        const g = liste.find(x => x.files && x.files[DOSYA]);
        e.sifirla();
        if (g) { a.id = g.id; sakla(); await e.esitle(); }
        else {
          const y = await istek('/gists', { method: 'POST', body: JSON.stringify({ description: 'AnadilimGibi ilerleme (uygulama tarafından otomatik güncellenir)', public: false, files: { [DOSYA]: { content: JSON.stringify(P) } } }) });
          a.id = y.id; sakla(); e.sonYaz(P.updated);
          e.durumla('GitHub\'da ilerleme kaydın oluşturuldu. Diğer cihazlarında da aynı şekilde bağlan.', false);
        }
        if (!e.m.hata) bildir('GitHub\'a bağlandı');
      } catch (x) { a = null; sakla(); e.durumla('Bağlanılamadı: ' + x.message, true); }
    }
    function kes() {
      if (!confirm('Bu cihazın GitHub bağlantısı kesilsin mi? İlerlemen bu cihazda ve GitHub\'da durmaya devam eder.')) return;
      a = null; sakla(); e.sifirla(); yenile();
    }
    function ayarHtml() {
      const d = e.m.durum ? `<p class="bilgi">${esc(e.m.durum)}</p>` : '';
      const ic = bagli()
        ? `<p>GitHub bağlantısı: <span class="iyi-yazi">bağlı ✓</span></p>
          <p class="soluk kucuk">İlerlemen GitHub hesabındaki gizli bir Gist'te tutuluyor.</p>
          <div class="butonlar"><button class="ana-btn" id="bEsitle">Şimdi eşitle</button><button class="btn" id="bKes">Bağlantıyı kes</button></div>${d}`
        : `<ol class="kucuk">
            <li>GitHub'a giriş yapıp <a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=AnaDilimGibi" target="_blank" rel="noopener">bu sayfada</a>
              yalnızca <b>gist</b> izni olan bir erişim anahtarı (token) oluştur.</li>
            <li>Anahtarı aşağıya yapıştır. Her cihazda bir kez yapman yeterli.</li>
          </ol>
          <form class="butonlar" id="bForm"><input type="password" id="bAnahtar" placeholder="ghp_…" autocomplete="off" spellcheck="false" required class="genis-giris">
            <button class="ana-btn">Bağlan</button></form>
          <p class="soluk kucuk">Anahtar yalnızca bu tarayıcıda saklanır ve yalnızca GitHub'a gönderilir.</p>${d}`;
      return `<details class="gelismis" ${bagli() || !Google.etkin ? 'open' : ''}><summary>${Google.etkin ? 'Gelişmiş: ' : ''}GitHub ile eşitle</summary>${ic}</details>`;
    }
    function ayarBagla() {
      $('#bForm')?.addEventListener('submit', x => { x.preventDefault(); const t = $('#bAnahtar').value; if (t.trim()) baglan(t); });
      $('#bEsitle')?.addEventListener('click', e.esitle);
      $('#bKes')?.addEventListener('click', kes);
    }
    return { e, bagli, ayarHtml, ayarBagla };
  })();

  const GOOGLE_LOGO = `<svg class="g-logo" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
  const saglayicilar = [Google, GitHub];

  function yenile() { if (aktifEkran === 'ayar' || aktifEkran === 'bugun') { const y = window.scrollY; git(aktifEkran); window.scrollTo(0, y); } }
  function hepsi(f) { for (const x of saglayicilar) if (x.bagli()) f(x); }

  function bantHtml() {
    let h = '';
    hepsi(x => {
      if (!x.e.m.hata) return;
      const dugme = x === Google && x.e.m.oturum
        ? `<button class="google-btn kucuk" data-bulut-giris>${GOOGLE_LOGO}<span>Google ile eşitle</span></button>`
        : `<button class="ana-btn kucuk" data-bulut-tekrar="${x === Google ? 'google' : 'github'}">Tekrar dene</button>`;
      h += `<div class="bant bulut-bant"><span>${esc(x.e.m.durum)}</span>${dugme}</div>`;
    });
    return h;
  }
  function bantBagla() {
    document.querySelectorAll('[data-bulut-giris]').forEach(b => b.addEventListener('click', Google.baglan));
    document.querySelectorAll('[data-bulut-tekrar]').forEach(b => b.addEventListener('click', () => (b.dataset.bulutTekrar === 'google' ? Google : GitHub).e.esitle()));
  }
  function ayarHtml() { return Google.ayarHtml() + GitHub.ayarHtml(); }
  function ayarBagla() { Google.ayarBagla(); GitHub.ayarBagla(); }
  function baslat() { hepsi(x => x.e.esitle()); }

  document.addEventListener('visibilitychange', () => hepsi(x => document.visibilityState === 'visible' ? x.e.esitle() : x.e.hemenGonder()));
  window.addEventListener('pagehide', () => hepsi(x => x.e.hemenGonder()));
  window.addEventListener('online', () => hepsi(x => x.e.esitle()));

  return { baslat, planla: () => hepsi(x => x.e.planla()), bantHtml, bantBagla, ayarHtml, ayarBagla };
})();
