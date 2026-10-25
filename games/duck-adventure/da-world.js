/* =============================================================
   DUCK ADVENTURE — mundo
   Geração de tiles, cenários em camadas (paralaxe) e vegetação,
   tudo em pixel art desenhada por código com variação por semente.
   ============================================================= */
(function (DA) {
  'use strict';
  const Art = DA.Art = DA.Art || {};
  const sheet = Art.sheet, px = Art.px, box = Art.box;

  /* Círculo pixelado: usado em copas, arbustos, nuvens e pedras. */
  function circ(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (w > 0) { g.fillRect((cx - w) | 0, (cy + dy) | 0, w * 2 + 1, 1); }
    }
  }
  Art.circ = circ;

  /* ---------- temas ---------- */
  const THEMES = {
    1: {
      name: 'FLORESTA VERDE',
      sky: ['#8FD3F4', '#C7ECFF', '#E8F7FF'],
      far: '#8FB8C6', far2: '#6F9BA8', mid: '#3E8A4F', mid2: '#2F6B4F',
      grass: '#4FA83D', grass2: '#3E8A31', grassLight: '#8FD46A',
      dirt: '#7A5636', dirt2: '#5C3F27', dirtLight: '#966A44',
      stone: '#7C7A72', stone2: '#5A584F',
      water: '#3E9BE0', water2: '#2A6FB0', waterDeep: '#1C4B7E',
      wood: '#9A6B3C', wood2: '#6E4A26',
      deco: ['tree', 'bush', 'flower', 'mushroom', 'tuft', 'rock', 'root']
    },
    2: {
      name: 'PANTANO PIXELADO',
      sky: ['#6FA88A', '#A8CFB0', '#D6E8C8'],
      far: '#7E9B84', far2: '#5C7A66', mid: '#2F6B4A', mid2: '#214F38',
      grass: '#6EA83C', grass2: '#4E7A2C', grassLight: '#A8D46A',
      dirt: '#5C4A2A', dirt2: '#423520', dirtLight: '#7A6238',
      stone: '#6E6C5E', stone2: '#4A493E',
      water: '#4E8F62', water2: '#2E6A4A', waterDeep: '#1C4436',
      wood: '#8A6538', wood2: '#5C4222',
      deco: ['mangrove', 'bush', 'mushroom', 'tuft', 'lily', 'rock', 'reed']
    },
    3: {
      name: 'CAVERNAS SUBTERRANEAS',
      sky: ['#101728', '#1A2338', '#26304A'],
      far: '#243049', far2: '#172034', mid: '#2E3A54', mid2: '#1E2740',
      grass: '#5A6478', grass2: '#414B5E', grassLight: '#8A93A8',
      dirt: '#4A5064', dirt2: '#343A4C', dirtLight: '#616A80',
      stone: '#5A6070', stone2: '#3C4250',
      water: '#3A6EA8', water2: '#264E80', waterDeep: '#183460',
      wood: '#7A5E3A', wood2: '#4E3A22',
      deco: ['crystal', 'stalag', 'rock', 'mushroomCave', 'tuftRock']
    },
    4: {
      name: 'MONTANHAS SELVAGENS',
      sky: ['#79BEE8', '#B8E0F6', '#E4F4FF'],
      far: '#9FB4C8', far2: '#7A90A8', mid: '#3A6A4A', mid2: '#28503A',
      grass: '#5FA445', grass2: '#447A31', grassLight: '#9CD46A',
      dirt: '#6E5A44', dirt2: '#50402E', dirtLight: '#8E7458',
      stone: '#9AA0AC', stone2: '#6E7480',
      water: '#3E86C8', water2: '#2860A0', waterDeep: '#1A4076',
      wood: '#A87A48', wood2: '#78542A',
      deco: ['pine', 'bush', 'rock', 'tuft', 'flower', 'log']
    },
    5: {
      name: 'PANTANO DOS JACARES',
      sky: ['#4A3A6A', '#8A6A9A', '#C89AA8'],
      far: '#5E4A70', far2: '#40304E', mid: '#2E4A3A', mid2: '#1E3428',
      grass: '#57893A', grass2: '#3C6328', grassLight: '#86B85A',
      dirt: '#4E4028', dirt2: '#37301C', dirtLight: '#6A5834',
      stone: '#5E5A50', stone2: '#403C34',
      water: '#3E7A72', water2: '#285A54', waterDeep: '#16383A',
      wood: '#7A5A34', wood2: '#503A20',
      deco: ['mangrove', 'reed', 'skull', 'bush', 'rock', 'lily']
    }
  };
  Art.THEMES = THEMES;

  /* ---------- tiles ---------- */
  function speckle(g, rng, count, colors, sizeMax) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * 16), y = Math.floor(rng() * 16);
      const c = colors[Math.floor(rng() * colors.length)];
      const s = 1 + Math.floor(rng() * (sizeMax || 2));
      box(g, x, y, s, s, c);
    }
  }
  function terrainTop(t, rng, variant) {
    const s = sheet(16, 16), g = s.g;
    box(g, 0, 0, 16, 16, t.dirt);
    speckle(g, rng, 14, [t.dirt2, t.dirtLight], 2);
    // camada de grama com borda irregular desenhada pixel a pixel
    for (let x = 0; x < 16; x++) {
      const h = 4 + Math.floor(rng() * 2);
      box(g, x, 0, 1, h, x % 5 === 0 && variant % 2 ? t.grass2 : t.grass);
      px(g, x, 0, t.grassLight);
      if (rng() > 0.72) { px(g, x, -0, t.grassLight); box(g, x, 1, 1, 1, t.grassLight); }
    }
    box(g, 0, 3, 16, 1, t.grass2);
    box(g, 0, 4, 16, 1, t.dirt2);
    // tufos, flores e pedrinhas
    for (let i = 0; i < 4; i++) {
      const x = 1 + Math.floor(rng() * 14);
      box(g, x, 1, 1, 2, t.grass2);
      px(g, x + 1, 2, t.grassLight);
    }
    if (variant % 3 === 0) { px(g, 3, 1, '#F2BA38'); px(g, 4, 1, '#FFF3B0'); px(g, 4, 2, '#E66278'); }
    if (variant % 3 === 1) { box(g, 10, 2, 2, 1, '#E66278'); px(g, 11, 1, '#FFF3B0'); }
    if (variant % 4 === 2) { box(g, 6, 1, 3, 2, t.grassLight); }
    if (rng() > 0.5) { box(g, 12, 3, 2, 2, t.stone); }
    px(g, 0, 5, t.dirt2); px(g, 15, 5, t.dirt2); px(g, 7, 6, t.dirt2);
    return s.c;
  }
  function terrainMid(t, rng, variant) {
    const s = sheet(16, 16), g = s.g;
    box(g, 0, 0, 16, 16, variant % 2 ? t.dirt : t.dirt2);
    speckle(g, rng, 18, [t.dirt, t.dirtLight, t.dirt2], 2);
    for (let i = 0; i < 3; i++) { box(g, Math.floor(rng() * 15), Math.floor(rng() * 15), 2 + Math.floor(rng() * 3), 1, t.dirt2); }
    if (variant % 3 === 0) { // raiz exposta
      for (let i = 0; i < 7; i++) { px(g, 3 + i, 2 + Math.round(Math.sin(i) * 2), t.dirt2); px(g, 4 + i, 3 + Math.round(Math.sin(i) * 2), '#4A3018'); }
    }
    if (variant % 3 === 1) { box(g, 9, 8, 3, 3, t.stone); box(g, 10, 9, 1, 1, t.stone2); }
    if (variant % 3 === 2) { box(g, 4, 5, 4, 2, t.dirtLight); box(g, 5, 4, 2, 1, '#4A3018'); }
    return s.c;
  }
  function terrainDeep(t, rng, variant) {
    const s = sheet(16, 16), g = s.g;
    box(g, 0, 0, 16, 16, t.stone2);
    speckle(g, rng, 10, [t.stone, t.dirt2], 3);
    box(g, 0, 0, 16, 1, t.stone);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rng() * 12), y = Math.floor(rng() * 12);
      box(g, x, y, 4, 1, t.stone); box(g, x + 1, y + 1, 3, 1, t.stone);
    }
    if (variant % 2) { box(g, 2, 10, 3, 2, t.dirt2); px(g, 13, 4, t.stone); }
    return s.c;
  }
  function slab(t, rng, wood) {
    const s = sheet(16, 16), g = s.g;
    if (wood) {
      box(g, 0, 0, 16, 9, t.wood);
      box(g, 0, 0, 16, 2, '#B98A52');
      box(g, 0, 7, 16, 2, t.wood2);
      for (let x = 0; x < 16; x += 5) { box(g, x, 0, 1, 9, t.wood2); }
      px(g, 2, 3, '#4E3A22'); px(g, 12, 4, '#4E3A22');
    } else {
      box(g, 0, 0, 16, 7, t.dirt);
      box(g, 0, 0, 16, 3, t.grass);
      box(g, 0, 2, 16, 1, t.grass2);
      for (let x = 0; x < 16; x += 4) { px(g, x, 0, t.grassLight); }
      box(g, 0, 6, 16, 2, t.dirt2);
      if (rng() > 0.6) { box(g, 11, 3, 2, 2, t.stone); }
      box(g, 0, 7, 16, 1, 'rgba(0,0,0,.25)');
    }
    return s.c;
  }
  function waterFrame(t, frame, deep) {
    const s = sheet(16, 16), g = s.g;
    const c1 = deep ? t.waterDeep : t.water, c2 = deep ? t.water2 : t.waterDeep;
    g.globalAlpha = deep ? 0.92 : 0.8;
    box(g, 0, 0, 16, 16, c2);
    box(g, 0, 0, 16, 6, c1);
    g.globalAlpha = 1;
    if (!deep) {
      // ondas animadas + espuma
      for (let x = 0; x < 16; x++) {
        const wave = Math.round(Math.sin((x + frame * 2.4) * 0.9) * 1.4);
        box(g, x, 1 + wave, 1, 2, '#A8E0FF');
        px(g, x, 0 + wave, '#E8F8FF');
      }
      if (frame % 2) { px(g, 3, 5, '#E8F8FF'); px(g, 10, 5, '#E8F8FF'); }
    } else {
      for (let i = 0; i < 3; i++) {
        const y = (frame * 7 + i * 11) % 14;
        px(g, 2 + i * 4, y + 2, '#9AD4F0');
      }
    }
    return s.c;
  }
  function spikes(t) {
    const s = sheet(16, 16), g = s.g;
    for (let i = 0; i < 3; i++) {
      const bx = i * 5 + 1;
      for (let h = 0; h < 8; h++) {
        const w = Math.max(1, 5 - Math.floor(h / 2));
        box(g, bx + Math.floor((5 - w) / 2), 14 - h, w, 1, h < 3 ? '#E8EDF5' : '#B8C0CC');
      }
      box(g, bx + 1, 6, 1, 2, '#FFFFFF');
      px(g, bx + (i % 2 ? 0 : 3), 10, '#8A93A2');
    }
    box(g, 0, 14, 16, 2, '#6E7480');
    return s.c;
  }
  function currentTile(dir, t) {
    const s = sheet(16, 16), g = s.g;
    g.globalAlpha = 0.75;
    box(g, 0, 0, 16, 16, t.water);
    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const y = 3 + i * 5;
      for (let x = 0; x < 9; x++) {
        px(g, dir > 0 ? 3 + x : 12 - x, y + (x % 2 ? 1 : 0), '#E8F8FF');
      }
      if (dir > 0) { px(g, 12, y, '#FFFFFF'); px(g, 13, y - 1, '#FFFFFF'); px(g, 13, y + 1, '#FFFFFF'); }
      else { px(g, 3, y, '#FFFFFF'); px(g, 2, y - 1, '#FFFFFF'); px(g, 2, y + 1, '#FFFFFF'); }
    }
    return s.c;
  }

  /* ---------- vegetação e detalhes ---------- */
  function decoSprite(kind, t, rng) {
    const K = '#20301A';
    if (kind === 'tree' || kind === 'mangrove' || kind === 'pine') {
      const big = kind === 'mangrove';
      const W = big ? 56 : 44, H = big ? 64 : 56;
      const s = sheet(W, H), g = s.g;
      const trunk = t.wood2, trunk2 = '#4A3418';
      if (kind === 'pine') {
        box(g, W / 2 - 3, H - 18, 6, 18, trunk);
        box(g, W / 2 - 3, H - 18, 2, 18, trunk2);
        for (let i = 0; i < 4; i++) {
          const w = 10 + i * 6, y = 10 + i * 9;
          for (let r = 0; r < 9; r++) {
            const rw = Math.max(2, w - r * 2);
            box(g, W / 2 - rw / 2, y + r, rw, 1, i % 2 ? t.mid : t.mid2);
          }
        }
      } else if (big) {
        // mangue torto com raízes
        for (let i = 0; i < 30; i++) { box(g, W / 2 - 4 + Math.round(Math.sin(i / 6) * 2), H - 30 + i, 7, 1, i % 3 ? trunk : trunk2); }
        for (let i = 0; i < 4; i++) {
          for (let r = 0; r < 12; r++) { px(g, W / 2 - 6 + i * 4, H - 12 + Math.floor(r / 2), trunk2); }
        }
        circ(g, W / 2 - 10, 22, 12, t.mid);
        circ(g, W / 2 + 8, 18, 14, t.mid);
        circ(g, W / 2, 12, 11, t.mid2);
        circ(g, W / 2 - 4, 16, 6, '#3E7A4A');
      } else {
        box(g, W / 2 - 4, H - 22, 8, 22, trunk);
        box(g, W / 2 - 4, H - 22, 3, 22, trunk2);
        box(g, W / 2 - 7, H - 6, 4, 6, trunk2);
        box(g, W / 2 + 3, H - 6, 5, 6, trunk2);
        circ(g, W / 2 - 9, H - 30, 11, t.mid);
        circ(g, W / 2 + 9, H - 28, 12, t.mid2);
        circ(g, W / 2, H - 38, 12, t.mid);
        circ(g, W / 2 - 6, H - 36, 6, t.grass);
        circ(g, W / 2 + 7, H - 33, 5, t.grassLight);
      }
      return s.c;
    }
    if (kind === 'bush' || kind === 'reed' || kind === 'tuft' || kind === 'tuftRock') {
      const s = sheet(24, 16), g = s.g;
      if (kind === 'reed' || kind === 'tuft' || kind === 'tuftRock') {
        const c = kind === 'tuftRock' ? t.mid : t.grass;
        for (let i = 0; i < 7; i++) {
          const x = 2 + i * 3, h = 5 + Math.floor(rng() * 8);
          for (let y = 0; y < h; y++) { px(g, x + Math.round(Math.sin(y / 3) * 1.2), 15 - y, y > h - 3 ? t.grassLight : c); }
        }
        if (kind === 'tuftRock') { box(g, 10, 12, 6, 4, t.stone); }
      } else {
        circ(g, 8, 11, 6, t.mid2); circ(g, 14, 10, 7, t.mid); circ(g, 19, 12, 5, t.mid2);
        circ(g, 12, 8, 4, t.grass);
        px(g, 6, 14, t.grassLight); px(g, 20, 13, t.grassLight);
      }
      return s.c;
    }
    if (kind === 'flower') {
      const s = sheet(10, 12), g = s.g;
      for (let i = 0; i < 5; i++) { px(g, 4, 12 - i, t.grass2); px(g, 5, 12 - i, t.grass); }
      const petal = ['#F2BA38', '#E66278', '#D89AE8', '#FFF3B0'][Math.floor(rng() * 4)];
      circ(g, 5, 4, 2, petal); px(g, 5, 4, '#FFF8D0'); px(g, 4, 3, petal); px(g, 6, 5, petal);
      return s.c;
    }
    if (kind === 'mushroom' || kind === 'mushroomCave') {
      const s = sheet(12, 12), g = s.g;
      const cap = kind === 'mushroomCave' ? '#7BE0E8' : '#D8543F';
      box(g, 5, 7, 2, 5, '#E8DCC0'); box(g, 5, 7, 1, 5, '#C8B896');
      for (let r = 0; r < 5; r++) { const w = 11 - Math.abs(r - 2) * 2; box(g, 6 - w / 2, 2 + r, w, 1, cap); }
      px(g, 4, 4, '#FFF0E0'); px(g, 8, 3, '#FFF0E0'); px(g, 6, 5, '#FFF0E0');
      return s.c;
    }
    if (kind === 'rock' || kind === 'stalag' || kind === 'skull') {
      const s = sheet(20, 16), g = s.g;
      if (kind === 'skull') {
        circ(g, 10, 7, 6, '#E8E4D8'); box(g, 6, 10, 8, 4, '#E8E4D8');
        box(g, 7, 5, 2, 2, '#3A3A32'); box(g, 11, 5, 2, 2, '#3A3A32'); box(g, 9, 9, 2, 2, '#3A3A32');
        px(g, 8, 13, '#3A3A32'); px(g, 11, 13, '#3A3A32');
      } else if (kind === 'stalag') {
        for (let h = 0; h < 14; h++) { const w = Math.max(1, 8 - Math.floor(h / 2)); box(g, 10 - w / 2, 15 - h, w, 1, h % 3 ? t.stone : t.stone2); }
        px(g, 9, 6, '#9AA3B5');
      } else {
        circ(g, 8, 11, 6, t.stone); circ(g, 14, 12, 5, t.stone2);
        box(g, 2, 13, 11, 3, t.stone2);
        px(g, 6, 8, '#A8AEBA'); px(g, 12, 9, '#A8AEBA');
      }
      return s.c;
    }
    if (kind === 'crystal') {
      const s = sheet(16, 26), g = s.g;
      for (let h = 0; h < 20; h++) {
        const w = Math.max(1, Math.round(6 - Math.abs(h - 10) / 3));
        box(g, 8 - w / 2, 24 - h, w, 1, h % 4 === 0 ? '#B77BF0' : '#7BE0E8');
      }
      box(g, 6, 6, 2, 12, '#D8F8FF'); px(g, 9, 9, '#FFFFFF');
      return s.c;
    }
    if (kind === 'lily' || kind === 'log') {
      const s = sheet(22, 12), g = s.g;
      if (kind === 'lily') {
        circ(g, 11, 7, 6, '#4E9A3E'); circ(g, 11, 6, 4, '#6EBF4A');
        px(g, 8, 6, '#D8543F'); px(g, 9, 5, '#F0907A');
      } else {
        box(g, 0, 4, 22, 7, t.wood); box(g, 0, 4, 22, 2, '#B98A52'); box(g, 0, 9, 22, 2, t.wood2);
        box(g, 3, 6, 2, 4, t.wood2); box(g, 15, 6, 2, 4, t.wood2);
      }
      return s.c;
    }
    if (kind === 'root') {
      const s = sheet(20, 14), g = s.g;
      for (let i = 0; i < 20; i++) { px(g, i, 6 + Math.round(Math.sin(i / 3) * 3), t.dirt2); px(g, i, 7 + Math.round(Math.sin(i / 3) * 3), '#4A3018'); }
      return s.c;
    }
    return null;
  }
  Art.decoSprite = decoSprite;

  /* ---------- cenário em camadas (paralaxe) ---------- */
  function backdrop(themeId, t, layer, width, height) {
    const s = sheet(width, height), g = s.g;
    const rng = DA.rng(themeId * 977 + layer * 31 + 7);
    g.globalAlpha = 1;
    if (layer === 'far') {
      // céu com faixas pontilhadas (dithering) + nuvens
      const steps = t.sky.length;
      for (let i = 0; i < steps; i++) { box(g, 0, Math.floor(height * i / steps), width, Math.ceil(height / steps) + 1, t.sky[i]); }
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          if ((x + y) % 3 === 0) { g.globalAlpha = 0.10; box(g, x, y, 1, 1, '#FFFFFF'); }
        }
      }
      g.globalAlpha = 1;
      for (let c = 0; c < 7; c++) {
        const cx = Math.floor(rng() * width), cy = 14 + Math.floor(rng() * 40), r = 6 + Math.floor(rng() * 7);
        circ(g, cx, cy, r, 'rgba(255,255,255,.75)');
        circ(g, cx + r, cy + 2, r - 2, 'rgba(255,255,255,.62)');
        circ(g, cx - r, cy + 3, r - 3, 'rgba(255,255,255,.55)');
      }
      // silhuetas de montanhas em duas distâncias
      for (let pass = 0; pass < 2; pass++) {
        const base = height - 40 + pass * 14, color = pass ? t.far : t.far2;
        let x = -20;
        while (x < width + 20) {
          const w = 60 + Math.floor(rng() * 90), h = 24 + Math.floor(rng() * 34);
          for (let i = 0; i < w; i++) {
            const t2 = i / w;
            const hh = Math.round(h * Math.sin(Math.PI * t2));
            box(g, x + i, base - hh, 1, hh + 60, color);
          }
          x += w - 12;
        }
      }
      return s.c;
    }
    if (layer === 'mid') {
      // vegetação distante / paredes de caverna / pinheiros
      g.globalAlpha = 0.85;
      if (themeId === 3) {
        for (let i = 0; i < 14; i++) {
          const x = Math.floor(rng() * width);
          const w = 10 + Math.floor(rng() * 22);
          const h = 30 + Math.floor(rng() * 90);
          box(g, x, height - h, w, h, i % 2 ? t.mid2 : t.mid);
          box(g, x, height - h, 3, h, '#8A93A8');
        }
      } else if (themeId === 4) {
        for (let i = 0; i < 22; i++) {
          const x = Math.floor(rng() * width), h = 40 + Math.floor(rng() * 50), w = 12 + Math.floor(rng() * 10);
          for (let r = 0; r < h; r++) { const rw = Math.max(2, Math.round(w * (r / h))); box(g, x - rw / 2, height - r, rw, 1, r % 5 ? t.mid : t.mid2); }
        }
      } else {
        for (let i = 0; i < 18; i++) {
          const x = Math.floor(rng() * width), r = 14 + Math.floor(rng() * 20);
          circ(g, x, height - 16 - Math.floor(rng() * 12), r, t.mid2);
          circ(g, x - 6, height - 20 - Math.floor(rng() * 10), r - 4, t.mid);
        }
      }
      g.globalAlpha = 1;
      return s.c;
    }
    // camada próxima: galhos, folhas e silhuetas escuras
    g.globalAlpha = 0.95;
    const near = t.mid2;
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * width), y = Math.floor(rng() * 40), r = 10 + Math.floor(rng() * 22);
      circ(g, x, y, r, near);
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng() * width), y = height - 10 - Math.floor(rng() * 30);
      circ(g, x, height + 6, 14 + Math.floor(rng() * 16), near);
      box(g, x - 2, y, 3, height - y, near);
    }
    g.globalAlpha = 1;
    return s.c;
  }

  /* ---------- conjunto completo por mundo ---------- */
  Art.buildWorld = function (themeId) {
    const t = THEMES[themeId] || THEMES[1];
    const rng = DA.rng(themeId * 7919);
    const tiles = {
      top: [], mid: [], deep: [], slab: [], slabWood: [], water: [[], [], []], waterDeep: [],
      spike: spikes(t), currentR: currentTile(1, t), currentL: currentTile(-1, t)
    };
    for (let i = 0; i < 4; i++) {
      tiles.top.push(terrainTop(t, rng, i));
      tiles.mid.push(terrainMid(t, rng, i));
    }
    for (let i = 0; i < 3; i++) { tiles.deep.push(terrainDeep(t, rng, i)); }
    tiles.slab.push(slab(t, rng, false));
    tiles.slab.push(slab(t, rng, false));
    tiles.slabWood.push(slab(t, rng, true));
    tiles.slabWood.push(slab(t, rng, true));
    for (let f = 0; f < 3; f++) { tiles.water[f].push(waterFrame(t, f, false)); }
    tiles.waterDeep.push(waterFrame(t, 0, true), waterFrame(t, 1, true));
    const layerW = 1024;
    return {
      id: themeId, theme: t,
      tiles: tiles,
      backdrop: {
        far: backdrop(themeId, t, 'far', layerW, DA.H),
        mid: backdrop(themeId, t, 'mid', layerW, DA.H),
        near: backdrop(themeId, t, 'near', layerW, DA.H)
      },
      deco: t.deco.map(function (k) { return { kind: k, art: decoSprite(k, t, rng) }; })
    };
  };
})(window.DA);
