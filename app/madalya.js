// AnadilimGibi — rozet madalyaları (7 seviye, SVG)
// Copyright (C) 2026 Berkay Çelik
// Seviye ilerledikçe biçim, malzeme ve süs zenginleşir:
// 1 Taş · 2 Bronz · 3 Gümüş · 4 Altın · 5 Platin · 6 Elmas · 7 Efsane
'use strict';

const Madalya = (() => {
  const SEVIYE = ['', 'Taş', 'Bronz', 'Gümüş', 'Altın', 'Platin', 'Elmas', 'Efsane'];
  const PAL = {
    1: { a: '#d9dcdf', b: '#9aa0a6', c: '#62676d' },
    2: { a: '#f6cba4', b: '#c4824e', c: '#6e3b17' },
    3: { a: '#ffffff', b: '#c5ccd4', c: '#6f7a87' },
    4: { a: '#fff4b8', b: '#eebc2f', c: '#8a5d00' },
    5: { a: '#ffffff', b: '#d3ecf4', c: '#5f8aa0' },
    6: { a: '#f3e8ff', b: '#9b6cf7', c: '#33136e' },
    7: { a: '#fff1b0', b: '#d9a514', c: '#5c3d00' },
  };
  let sayac = 0;
  const f = n => +n.toFixed(2);
  const nokta = (r, aci) => [f(60 + r * Math.cos(aci * Math.PI / 180)), f(60 + r * Math.sin(aci * Math.PI / 180))];

  // Düzgün çokgen / yıldız / testere kenarlı disk
  const cokgen = (n, r, don = -90) => Array.from({ length: n }, (_, i) => nokta(r, don + 360 * i / n).join(',')).join(' ');
  const yildiz = (n, R, r, don = -90) => Array.from({ length: 2 * n }, (_, i) => nokta(i % 2 ? r : R, don + 180 * i / n).join(',')).join(' ');

  function defne(renk, R = 52) {
    let s = '';
    for (const yan of [-1, 1]) for (let i = 0; i < 9; i++) {
      const aci = 90 + yan * (22 + i * 15);           // alttan yukarı doğru
      const [x, y] = nokta(R + (i % 2 ? 2 : -1), aci);
      s += `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="8.5" transform="rotate(${f(aci + (yan > 0 ? 20 : -20))} ${x} ${y})" fill="${renk}"/>`;
    }
    return `<g opacity=".95">${s}</g>`;
  }
  function kurdele(r1, r2) {
    return `<polygon points="40,78 28,118 42,109 50,119 58,84" fill="${r1}"/><polygon points="80,78 92,118 78,109 70,119 62,84" fill="${r2}"/>
      <polygon points="40,78 34,101 46,95 58,84" fill="#000" opacity=".18"/><polygon points="80,78 86,101 74,95 62,84" fill="#000" opacity=".18"/>`;
  }
  function tac(id, renk, koyu) {
    return `<g><polygon points="41,24 45,7 53,16 60,2 67,16 75,7 79,24" fill="url(#${id}m)" stroke="${koyu}" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="41" y="21" width="38" height="5" rx="2" fill="${renk}" stroke="${koyu}" stroke-width="1"/>
      <circle cx="60" cy="9" r="2.4" fill="#e11d48"/><circle cx="47" cy="13" r="1.8" fill="#38bdf8"/><circle cx="73" cy="13" r="1.8" fill="#38bdf8"/></g>`;
  }
  function pirilti(x, y, s, renk = '#fff', anim = '') {
    return `<path class="${anim}" d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${renk}"/>`;
  }
  // Mücevher kesimli sekizgen (elmas/efsane)
  function mucevher(r, ic, renk1, renk2) {
    const dis = Array.from({ length: 8 }, (_, i) => nokta(r, -90 + 45 * i + 22.5));
    const ici = Array.from({ length: 8 }, (_, i) => nokta(ic, -90 + 45 * i + 22.5));
    let s = '';
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      s += `<polygon points="${dis[i]} ${dis[j]} ${ici[j]} ${ici[i]}" fill="${i % 2 ? renk1 : renk2}" opacity="${0.55 + 0.4 * ((i * 3) % 8) / 8}"/>`;
    }
    return s + `<polygon points="${ici.map(p => p.join(',')).join(' ')}" fill="${renk1}" opacity=".9"/>`;
  }

  function svg(sv, ikon) {
    sv = Math.max(1, Math.min(7, sv));
    const id = 'rz' + (++sayac), p = PAL[sv];
    const emoji = (boy, y = 61) => `<text x="60" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${boy}" class="rz-emoji">${ikon}</text>`;
    const parlak = r => `<circle cx="60" cy="60" r="${r}" fill="url(#${id}p)"/>`;
    let govde = '';
    const defs = `<defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset=".5" stop-color="${p.b}"/><stop offset="1" stop-color="${p.c}"/></linearGradient>
      <linearGradient id="${id}t" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset=".6" stop-color="${p.b}"/><stop offset="1" stop-color="${p.c}"/></linearGradient>
      <radialGradient id="${id}p" cx=".32" cy=".26" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".35" stop-color="#a855f7"/><stop offset=".7" stop-color="#f472b6"/><stop offset="1" stop-color="#facc15"/></linearGradient>
      <radialGradient id="${id}ob" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4c3a8a"/><stop offset=".6" stop-color="#1a1236"/><stop offset="1" stop-color="#07040f"/></radialGradient>
      <clipPath id="${id}k"><circle cx="60" cy="60" r="40"/></clipPath>
    </defs>`;

    if (sv === 1) {            // Taş: sade düz disk
      govde = `<circle cx="60" cy="60" r="44" fill="url(#${id}m)" stroke="${p.c}" stroke-width="2"/>
        <circle cx="60" cy="60" r="36" fill="${p.b}" opacity=".55"/>${emoji(34)}`;
    } else if (sv === 2) {     // Bronz: çift halka, kabartma
      govde = `<circle cx="60" cy="60" r="50" fill="url(#${id}m)" stroke="${p.c}" stroke-width="1.5"/>
        <circle cx="60" cy="60" r="43" fill="none" stroke="${p.c}" stroke-width="1.5" opacity=".7"/>
        <circle cx="60" cy="60" r="39" fill="url(#${id}t)"/>${parlak(50)}${emoji(36)}`;
    } else if (sv === 3) {     // Gümüş: altıgen kalkan + perçinler
      const percin = Array.from({ length: 6 }, (_, i) => { const [x, y] = nokta(47, -90 + 60 * i); return `<circle cx="${x}" cy="${y}" r="2.2" fill="${p.a}" stroke="${p.c}" stroke-width=".8"/>`; }).join('');
      govde = `<polygon points="${cokgen(6, 55)}" fill="url(#${id}m)" stroke="${p.c}" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="${cokgen(6, 41)}" fill="url(#${id}t)" stroke="${p.c}" stroke-width="1" opacity=".95"/>${percin}${parlak(52)}${emoji(36)}`;
    } else if (sv === 4) {     // Altın: kurdeleli, dişli kenarlı madalya
      govde = `${kurdele('#b91c1c', '#1e3a8a')}
        <polygon points="${yildiz(20, 54, 48)}" fill="url(#${id}m)" stroke="${p.c}" stroke-width="1.2" stroke-linejoin="round"/>
        <circle cx="60" cy="60" r="42" fill="url(#${id}t)" stroke="${p.c}" stroke-width="1.5"/>
        <circle cx="60" cy="60" r="35" fill="none" stroke="${p.a}" stroke-width="1.2" stroke-dasharray="2 3" opacity=".9"/>
        ${parlak(54)}${emoji(36)}${pirilti(88, 30, 5)}`;
    } else if (sv === 5) {     // Platin: defne dalı + kurdele + ince işçilik
      govde = `${kurdele('#1e3a8a', '#64748b')}${defne('#9fb7a5', 53)}
        <polygon points="${yildiz(24, 49, 45)}" fill="url(#${id}m)" stroke="${p.c}" stroke-width="1" stroke-linejoin="round"/>
        <circle cx="60" cy="60" r="40" fill="url(#${id}t)" stroke="${p.c}" stroke-width="1.5"/>
        <circle cx="60" cy="60" r="34" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/>
        <g clip-path="url(#${id}k)"><rect class="rz-parilti" x="-40" y="-20" width="22" height="160" fill="#fff" opacity=".45" transform="rotate(20 60 60)"/></g>
        ${parlak(50)}${emoji(34)}${pirilti(92, 26, 6)}${pirilti(26, 36, 4)}`;
    } else if (sv === 6) {     // Elmas: yıldız patlaması, mücevher kesim, taç
      govde = `${defne('#e2b93b', 54)}
        <polygon points="${yildiz(8, 58, 38, -67.5)}" fill="url(#${id}au)" opacity=".9"/>
        <circle cx="60" cy="62" r="40" fill="${p.c}" stroke="#e2b93b" stroke-width="2.5"/>
        <g transform="translate(0 2)">${mucevher(38, 24, '#c4b5fd', '#5b21b6')}</g>
        ${parlak(44)}${emoji(30, 63)}${tac(id, '#e2b93b', '#8a5d00')}
        ${pirilti(98, 40, 6, '#fff', 'rz-isilti')}${pirilti(22, 86, 5, '#fff', 'rz-isilti g2')}${pirilti(96, 92, 4, '#fde68a', 'rz-isilti g3')}`;
    } else {                   // Efsane: dönen aurora hale, obsidyen, altın taç, parıltı
      govde = `<g class="rz-hale"><circle cx="60" cy="62" r="57" fill="none" stroke="url(#${id}au)" stroke-width="5" stroke-dasharray="10 6"/></g>
        <polygon points="${yildiz(16, 56, 46, -90)}" fill="url(#${id}m)" stroke="#7a5300" stroke-width="1" transform="translate(0 2)"/>
        ${defne('#f5d36b', 52)}
        <circle cx="60" cy="62" r="40" fill="url(#${id}ob)" stroke="url(#${id}m)" stroke-width="3.5"/>
        <g transform="translate(0 2)" opacity=".55">${mucevher(36, 22, '#7c3aed', '#1e1b4b')}</g>
        <g clip-path="url(#${id}k)" transform="translate(0 2)"><rect class="rz-parilti" x="-40" y="-20" width="20" height="160" fill="#fff" opacity=".35" transform="rotate(20 60 60)"/></g>
        ${emoji(30, 63)}${tac(id, '#f5d36b', '#7a5300')}
        ${pirilti(100, 34, 7, '#fff', 'rz-isilti')}${pirilti(18, 50, 5, '#fde68a', 'rz-isilti g2')}${pirilti(100, 96, 5, '#a5f3fc', 'rz-isilti g3')}${pirilti(20, 98, 4, '#fff', 'rz-isilti g2')}`;
    }
    return `<svg viewBox="0 0 120 120" class="rz rz${sv}" aria-hidden="true">${defs}${govde}</svg>`;
  }

  // n kademeli bir grupta i. rozetin seviyesi (ilk rozet daima Taş, son rozet daima Efsane)
  function seviye(i, n) { return n <= 1 ? 4 : Math.round(1 + 6 * i / (n - 1)); }

  return { svg, seviye, SEVIYE };
})();
