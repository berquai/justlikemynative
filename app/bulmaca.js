// Metin yardımcıları + kağıt bulmaca üreticileri (çengel, harf yerleştirme, sözcük avı)
'use strict';

const Metin = (() => {
  const POSS = new Set(["my", "your", "his", "her", "its", "our", "their", "one's", "ones", "someone's", "somebody's"]);
  const YER_TUTUCU = new Set(["sth", "sb", "someone", "something", "somewhere", "x", "...", "v3"]);
  const kac = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Kelimeyi karşılaştırma için sadeleştir
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z' -]/g, ' ')
      .split(/[\s-]+/).filter(Boolean)
      .map(t => POSS.has(t) ? "one's" : t)
      .filter(t => !YER_TUTUCU.has(t))
      .join(' ').trim();
  }

  // Yazılı cevap için kabul edilen biçimler
  function kabuller(w, ekler = []) {
    const set = new Set();
    const ekle = s => { const n = norm(s); if (n) { set.add(n); set.add(n.replace(/'/g, '')); } };
    ekle(w);
    ekle(w.replace(/[()]/g, ''));
    ekle(w.replace(/\(.*?\)/g, ''));
    ekler.forEach(ekle);
    return set;
  }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
      {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[a.length][b.length];
  }

  // Sonuç: 'tam' | 'yakin' (küçük yazım hatası) | 'yanlis'
  function kontrol(girdi, w, ekler) {
    const g = norm(girdi), gs = g.replace(/'/g, '');
    if (!g) return 'yanlis';
    const ks = kabuller(w, ekler);
    if (ks.has(g) || ks.has(gs)) return 'tam';
    for (const k of ks) if (k.length >= 6 && lev(gs, k.replace(/'/g, '')) <= 1) return 'yakin';
    return 'yanlis';
  }

  // Örnek cümlede kelimeyi bul ve boşluk yap
  // Düzensiz fiiller: kök -> çekimli biçimler
  const DUZENSIZ = {};
  ('be:is,am,are,was,were,been,being|have:has,had,having|do:does,did,done,doing|go:goes,went,gone|come:came|take:took,taken|' +
   'bring:brought|break:broke,broken|tear:tore,torn|leave:left|get:got,gotten,getting|send:sent|sink:sank,sunk|blow:blew,blown|' +
   'throw:threw,thrown|make:made|put:putting|keep:kept|lay:laid|draw:drew,drawn|give:gave,given|run:ran,running|see:saw,seen|' +
   'stand:stood|write:wrote,written|speak:spoke,spoken|fall:fell,fallen|hold:held|find:found|think:thought|buy:bought|' +
   'catch:caught|teach:taught|fight:fought|seek:sought|sell:sold|tell:told|feel:felt|meet:met|sit:sat,sitting|win:won,winning|' +
   'lose:lost|pay:paid|say:said|shake:shook,shaken|rise:rose,risen|drive:drove,driven|ride:rode,ridden|wear:wore,worn|' +
   'swear:swore,sworn|bear:bore,borne,born|bite:bit,bitten|hide:hid,hidden|forget:forgot,forgotten|choose:chose,chosen|' +
   'freeze:froze,frozen|steal:stole,stolen|wake:woke,woken|weave:wove,woven|spring:sprang,sprung|swing:swung|sting:stung|' +
   'strike:struck|stick:stuck|dig:dug|hang:hung|lead:led|feed:fed|flee:fled|creep:crept|sweep:swept|sleep:slept|leap:leapt|' +
   'deal:dealt|mean:meant|spend:spent|lend:lent|build:built|bend:bent|shoot:shot|light:lit|grow:grew,grown|know:knew,known|' +
   'fly:flew,flown,flies|cut:cutting|set:setting|let:letting|shut:shutting|beat:beaten|forgive:forgave,forgiven|' +
   'withdraw:withdrew,withdrawn|withstand:withstood|undergo:underwent,undergone|overcome:overcame|undertake:undertook,undertaken|' +
   'uphold:upheld|withhold:withheld|overthrow:overthrew,overthrown|bid:bade|tread:trod,trodden|slide:slid|spin:spun|' +
   'stride:strode|shrink:shrank,shrunk|mislead:misled|misled:mislead|outshine:outshone|shine:shone|drink:drank,drunk|sing:sang,sung|swim:swam,swum|strive:strove,striven|fling:flung|cling:clung|wring:wrung|bleed:bled|breed:bred|shine:shone|a:an|an:a')
    .split('|').forEach(x => { const [k, f] = x.split(':'); DUZENSIZ[k] = f.split(','); });

  function tokenDesen(t) {
    if (POSS.has(t)) return "(?:my|your|his|her|its|our|their|one's)";
    if (t === 'oneself') return '(?:myself|yourself|himself|herself|itself|ourselves|yourselves|themselves|oneself)';
    const formlar = (DUZENSIZ[t] || []).concat(/man$/.test(t) && t.length > 4 ? [t.slice(0, -3) + 'men'] : []);
    const duz = formlar.length ? '|' + formlar.map(kac).join('|') : '';
    if (t === 'a' || t === 'an') return '(?:a|an)';
    if (t.endsWith('ie') && t.length <= 4) return '(?:' + kac(t) + '[a-z]{0,2}|' + kac(t.slice(0, -2)) + 'ying' + duz + ')';
    if (t.length <= 4 && /[bcdfgklmnprstvz]$/.test(t) && /[aeiou][^aeiou]$/.test(t))
      return '(?:' + kac(t) + '(?:' + kac(t.slice(-1)) + ')?(?:s|es|ed|d|ing|er|y)?' + duz + ')';
    if (t.length <= 3) return '(?:' + kac(t) + "(?:s|es|ed|d|ing|n)?" + duz + ')';
    if (duz) {
      const kok = /[ey]$/.test(t) ? t.slice(0, -1) : t;
      return '(?:' + kac(kok) + '[a-z]{0,4}' + duz + ')';
    }
    const kok = /[ey]$/.test(t) && t.length >= 4 ? t.slice(0, -1) : t;
    return kac(kok) + "[a-z]{0,4}";
  }
  function bosluk(cumle, w) {
    const tokenler = String(w).toLowerCase().replace(/[’]/g, "'").replace(/\(.*?\)/g, ' ')
      .split(/[\s]+/).filter(t => t && !YER_TUTUCU.has(t));
    if (!tokenler.length) return null;
    const rx = tokenler.map(t => new RegExp('(?<![A-Za-z])(' + tokenDesen(t) + ')(?![A-Za-z])', 'gi'));
    const ilk = [...cumle.matchAll(rx[0])];
    for (const m0 of ilk) {
      const parcalar = [{ i: m0.index, s: m0[1] }];
      let pos = m0.index + m0[1].length, ok = true;
      for (let k = 1; k < rx.length; k++) {
        rx[k].lastIndex = pos;
        const m = rx[k].exec(cumle);
        if (!m || m.index - pos > 25) { ok = false; break; }
        parcalar.push({ i: m.index, s: m[1] });
        pos = m.index + m[1].length;
      }
      if (!ok) continue;
      let html = '', duz = '', son = 0;
      for (const p of parcalar) {
        html += esc(cumle.slice(son, p.i)) + '<span class="bosluk">_____</span>';
        duz += cumle.slice(son, p.i) + '_____';
        son = p.i + p.s.length;
      }
      html += esc(cumle.slice(son)); duz += cumle.slice(son);
      return { html, duz, yuzey: parcalar.map(p => p.s).join(' ') };
    }
    return null;
  }

  // Tanım vb. içinde kelimenin kendisi geçiyorsa gizle
  function gizle(metin, w) {
    const b = bosluk(metin, w);
    return b ? b.duz : metin;
  }

  // Bulmaca harfleri
  function harfler(w) { return String(w).toUpperCase().replace(/[^A-Z]/g, ''); }
  function desen(w) {
    return '(' + String(w).replace(/\(.*?\)/g, '').trim().split(/[\s-]+/).map(p => p.replace(/[^A-Za-z]/g, '').length).filter(Boolean).join(',') + ')';
  }
  function izgarayaUygun(w) {
    const t = String(w).toLowerCase();
    if (/\b(sth|sb|someone|something|one's|x)\b|\(|\.\.\.|\//.test(t)) return false;
    const n = harfler(w).length;
    return n >= 3 && n <= 14;
  }

  return { norm, kontrol, bosluk, gizle, harfler, desen, izgarayaUygun, lev };
})();

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function karistir(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const Izgara = (() => {
  // Çapraz yerleşim (çengel bulmaca ve harf yerleştirme için)
  // girdi: [{ans:'POACH', ref:any}]  -> {gen, yuk, hucre:Map, yerlesen:[{ans,ref,r,c,yon,no}], disarida:[]}
  function capraz(liste, { maxGen = 21, maxYuk = 25, deneme = 60 } = {}) {
    let enIyi = null;
    for (let d = 0; d < deneme; d++) {
      const sira = d === 0
        ? liste.slice().sort((a, b) => b.ans.length - a.ans.length)
        : karistir(liste).sort((a, b) => (b.ans.length - a.ans.length) + (Math.random() - 0.5) * 6);
      const s = tekDeneme(sira, maxGen, maxYuk);
      const puan = s.yerlesen.length * 1000 - s.gen * s.yuk + s.kesisim * 15;
      if (!enIyi || puan > enIyi.puan) enIyi = { ...s, puan };
      if (enIyi.yerlesen.length === liste.length && d > 25) break;
    }
    return numarala(enIyi);
  }

  function tekDeneme(sira, maxGen, maxYuk) {
    const hucre = new Map(); // "r,c" -> {h, yon:Set}
    const yerlesen = [], disarida = [];
    let minR = 0, maxR = 0, minC = 0, maxC = 0, kesisim = 0;
    const al = (r, c) => hucre.get(r + ',' + c);

    function uygunMu(ans, r, c, yon) {
      const dr = yon === 'A' ? 0 : 1, dc = yon === 'A' ? 1 : 0;
      if (al(r - dr, c - dc) || al(r + dr * ans.length, c + dc * ans.length)) return -1;
      let kes = 0;
      for (let k = 0; k < ans.length; k++) {
        const rr = r + dr * k, cc = c + dc * k, h = al(rr, cc);
        if (h) {
          if (h.h !== ans[k] || h.yon.has(yon)) return -1;
          kes++;
        } else {
          // yanlara bitişik harf olmasın
          if (al(rr + dc, cc + dr) || al(rr - dc, cc - dr)) return -1;
        }
      }
      const nMinR = Math.min(minR, r), nMaxR = Math.max(maxR, r + dr * (ans.length - 1));
      const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + dc * (ans.length - 1));
      if (nMaxC - nMinC + 1 > maxGen || nMaxR - nMinR + 1 > maxYuk) return -1;
      return kes;
    }
    function koy(o, r, c, yon) {
      const dr = yon === 'A' ? 0 : 1, dc = yon === 'A' ? 1 : 0;
      for (let k = 0; k < o.ans.length; k++) {
        const key = (r + dr * k) + ',' + (c + dc * k);
        const h = hucre.get(key) || { h: o.ans[k], yon: new Set() };
        h.yon.add(yon); hucre.set(key, h);
      }
      minR = Math.min(minR, r); maxR = Math.max(maxR, r + dr * (o.ans.length - 1));
      minC = Math.min(minC, c); maxC = Math.max(maxC, c + dc * (o.ans.length - 1));
      yerlesen.push({ ...o, r, c, yon });
    }

    let kalan = sira.slice();
    if (kalan.length) koy(kalan.shift(), 0, 0, 'A');
    for (let tur = 0; tur < 2; tur++) {
      const sonraki = [];
      for (const o of kalan) {
        let iyi = null;
        for (const p of yerlesen) {
          const yon = p.yon === 'A' ? 'D' : 'A';
          for (let j = 0; j < p.ans.length; j++) for (let i = 0; i < o.ans.length; i++) {
            if (p.ans[j] !== o.ans[i]) continue;
            const pr = p.yon === 'A' ? p.r : p.r + j, pc = p.yon === 'A' ? p.c + j : p.c;
            const r = yon === 'A' ? pr : pr - i, c = yon === 'A' ? pc - i : pc;
            const k = uygunMu(o.ans, r, c, yon);
            if (k > 0) {
              const alan = (Math.max(maxC, c + o.ans.length) - Math.min(minC, c)) * (Math.max(maxR, r + o.ans.length) - Math.min(minR, r));
              const puan = k * 40 - alan * 0.1 + Math.random();
              if (!iyi || puan > iyi.puan) iyi = { r, c, yon, puan, k };
            }
          }
        }
        if (iyi) { koy(o, iyi.r, iyi.c, iyi.yon); kesisim += iyi.k; } else sonraki.push(o);
      }
      kalan = sonraki;
    }
    disarida.push(...kalan);
    return { hucre, yerlesen, disarida, minR, minC, gen: maxC - minC + 1, yuk: maxR - minR + 1, kesisim };
  }

  function numarala(s) {
    const hucre = new Map();
    for (const [k, v] of s.hucre) {
      const [r, c] = k.split(',').map(Number);
      hucre.set((r - s.minR) + ',' + (c - s.minC), v.h);
    }
    const yerlesen = s.yerlesen.map(y => ({ ...y, r: y.r - s.minR, c: y.c - s.minC }));
    const baslar = [...new Set(yerlesen.map(y => y.r + ',' + y.c))]
      .map(k => k.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const no = new Map(baslar.map((rc, i) => [rc.join(','), i + 1]));
    yerlesen.forEach(y => y.no = no.get(y.r + ',' + y.c));
    return { gen: s.gen, yuk: s.yuk, hucre, yerlesen, disarida: s.disarida, numara: no };
  }

  // Sözcük avı
  const SIKLIK = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOIIIIIIINNNNNNNSSSSSSRRRRRRHHHHHLLLLDDDDCCCUUUMMMFFPPGGWWYYBVKXJQZ';
  function soz(liste, { boyut = 14, zorluk = 'orta' } = {}) {
    const yonler = [[0, 1], [1, 0]];
    if (zorluk !== 'kolay') yonler.push([1, 1], [-1, 1]);
    if (zorluk === 'zor') yonler.push([0, -1], [-1, 0], [-1, -1], [1, -1]);
    const n = Math.max(boyut, ...liste.map(o => o.ans.length));
    let enIyi = null;
    for (let d = 0; d < 25; d++) {
      const g = Array.from({ length: n }, () => Array(n).fill(''));
      const yer = [], dis = [];
      for (const o of liste.slice().sort((a, b) => b.ans.length - a.ans.length)) {
        let tamam = false;
        for (let t = 0; t < 300 && !tamam; t++) {
          const [dr, dc] = yonler[Math.floor(Math.random() * yonler.length)];
          const r = Math.floor(Math.random() * n), c = Math.floor(Math.random() * n);
          const er = r + dr * (o.ans.length - 1), ec = c + dc * (o.ans.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
          let ok = true;
          for (let k = 0; k < o.ans.length && ok; k++) { const x = g[r + dr * k][c + dc * k]; if (x && x !== o.ans[k]) ok = false; }
          if (!ok) continue;
          for (let k = 0; k < o.ans.length; k++) g[r + dr * k][c + dc * k] = o.ans[k];
          yer.push({ ...o, r, c, dr, dc }); tamam = true;
        }
        if (!tamam) dis.push(o);
      }
      if (!enIyi || yer.length > enIyi.yer.length) enIyi = { g, yer, dis };
      if (!dis.length) break;
    }
    const cozum = new Set();
    enIyi.yer.forEach(y => { for (let k = 0; k < y.ans.length; k++) cozum.add((y.r + y.dr * k) + ',' + (y.c + y.dc * k)); });
    enIyi.g.forEach(sat => sat.forEach((x, i) => { if (!x) sat[i] = SIKLIK[Math.floor(Math.random() * SIKLIK.length)]; }));
    return { n, grid: enIyi.g, yerlesen: enIyi.yer, disarida: enIyi.dis, cozum };
  }

  return { capraz, soz };
})();
