/* =============================================================
   DUCK ADVENTURE — arte
   Todos os sprites são pixel art desenhada pixel por pixel em
   canvas de 1x e depois ampliada com escalonamento inteiro, sem
   interpolação: nenhum modelo 3D, nenhum vetor, nenhuma imagem
   externa.
   ============================================================= */
(function (DA) {
  'use strict';
  const Art = DA.Art = {};

  /* ---------- utilidades de desenho ---------- */
  function sheet(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c: c, g: g };
  }
  function px(g, x, y, color) { g.fillStyle = color; g.fillRect(x | 0, y | 0, 1, 1); }
  function box(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x | 0, y | 0, w, h); }
  /* Converte um desenho em texto (1 caractere = 1 pixel) em pixels reais. */
  function ascii(g, rows, palette, ox, oy) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') { continue; }
        const color = palette[ch];
        if (color) { px(g, ox + x, oy + y, color); }
      }
    }
  }
  Art.sheet = sheet; Art.px = px; Art.box = box; Art.ascii = ascii;

  function mirror(c) {
    const out = sheet(c.width, c.height);
    out.g.translate(c.width, 0);
    out.g.scale(-1, 1);
    out.g.drawImage(c, 0, 0);
    return out.c;
  }
  /* Espelha sob demanda (o pato e o jacaré olham para os dois lados).
     Aceita também o par {c,g} devolvido por sheet(): passar o objeto cru para
     drawImage derruba o jogo inteiro na inicialização. */
  function both(c) { const canvas = c && c.getContext ? c : c.c; return { R: canvas, L: mirror(canvas) }; }

  /* ---------- paletas ---------- */
  const P = Art.P = {
    duck: { K: '#2A2118', Y: '#FFD84A', y: '#E0AF2A', W: '#FFFFFF', P: '#2A2118', O: '#FF9E2C', o: '#D97A16', F: '#F08A1D' },
    croc: { K: '#20301E', G: '#54A34C', g: '#3B7A3A', B: '#D6ECB4', W: '#FFFFFF', E: '#FFFFFF', P: '#20301E', R: '#8C3040', Y: '#FFD84A' },
    leaf: { K: '#1E3A1C', G: '#4CAF50', g: '#2E7D32' },
    fruit: { K: '#3A2412', A: '#E23B3B', a: '#A81F26', L: '#3FAE4A', S: '#FFE9A8', P: '#C9D94A', p: '#93A82C', D: '#8E6B3A' }
  };

  /* ---------- pato ---------- */
  const DUCK_BODY = [
    '......KKKK......',
    '.....KYYYYK.....',
    '....KYKWWKYK....',
    '....KYKWPKYKOOO.',
    '....KYKKKKYKOOO.',
    '...KYYYYYYYKOOO.',
    '..KYYYYYYYYYKOO.',
    'KKYYYYYYYYYK....',
    'KYyYYYYYYYYK....',
    'KKyyYYYYYYK.....',
    '.KyyyKKKKKK.....',
    '..KyyyK.........',
    '...KKK..........'
  ];
  const DUCK_LEAF = [
    '..GG...',
    '.GGGG..',
    'GGgGGG.',
    '.GGgG..',
    '..gG...',
    '...g...'
  ];

  /* Pernas desenhadas por código: permite animar passada, salto e natação. */
  function drawDuckLeg(g, x, y, len, footDir) {
    const F = P.duck.F, o = P.duck.o;
    for (let i = 0; i < len; i++) { px(g, x, y + i, F); px(g, x + 1, y + i, o); }
    const fy = y + len;
    if (footDir < 0) { px(g, x - 1, fy, F); px(g, x, fy, F); px(g, x + 1, fy, F); }
    else if (footDir > 0) { px(g, x, fy, F); px(g, x + 1, fy, F); px(g, x + 2, fy, F); }
    else { px(g, x - 1, fy, F); px(g, x, fy, F); px(g, x + 1, fy, F); px(g, x + 2, fy, F); }
  }
  function drawDuckWing(g, ox, oy, raised) {
    const K = P.duck.K, Y = P.duck.y, y2 = P.duck.Y;
    const rows = raised
      ? ['Kyyk.', 'Kyyyk', '.KKKK']
      : ['Kyyyy', 'Kyyyy', '.KKKK'];
    ascii(g, rows, { K: K, y: y2, k: Y }, ox, oy);
  }
  /* Monta um quadro do pato com pernas, asa, olho e folha opcionais. */
  function duckFrame(opt) {
    const o = opt || {};
    const s = sheet(22, 22);
    const g = s.g;
    const bob = o.bob || 0;
    const bodyY = 3 + bob;
    ascii(g, DUCK_BODY, P.duck, 2, bodyY);
    if (o.eye === 'blink') {
      box(g, 6 + 2, bodyY + 2, 3, 1, P.duck.K);
      box(g, 6 + 2, bodyY + 3, 3, 1, P.duck.Y);
    } else if (o.eye === 'wide') {
      box(g, 6 + 2, bodyY + 2, 3, 3, P.duck.W);
      box(g, 6 + 3, bodyY + 3, 1, 1, P.duck.K);
    } else if (o.eye === 'dead') {
      box(g, 6 + 2, bodyY + 2, 3, 3, P.duck.W);
      px(g, 6 + 2, bodyY + 2, P.duck.K); px(g, 6 + 4, bodyY + 2, P.duck.K);
      px(g, 6 + 4, bodyY + 4, P.duck.K); px(g, 6 + 2, bodyY + 4, P.duck.K);
      px(g, 6 + 3, bodyY + 3, P.duck.K);
    }
    drawDuckWing(g, 4, bodyY + (o.wing === 2 ? 6 : o.wing === 1 ? 7 : 8) + 1, o.wing === 2);
    const legs = o.legs || [[5, 3, 0], [9, 3, 0]];
    for (let i = 0; i < legs.length; i++) {
      drawDuckLeg(g, 4 + legs[i][0], bodyY + 13 - (o.legY || 0), legs[i][1], legs[i][2]);
    }
    if (o.leaf) {
      const w = Math.round(Math.sin((o.leafPhase || 0) * 1.6));
      ascii(g, DUCK_LEAF, P.leaf, 6 + w, bodyY - 6 + (o.leafY || 0));
    }
    return s.c;
  }

  Art.buildDuck = function () {
    const d = {};
    /* O motor alterna dois quadros de repouso: descanso e piscada. */
    d.idle = [both(duckFrame({ bob: 0 })), both(duckFrame({ bob: 1, eye: 'blink' }))];
    d.idle2 = d.idle[1];
    d.blink = d.idle[1];
    d.walk = [
      duckFrame({ legs: [[4, 3, 0], [9, 3, 1]], bob: 0 }),
      duckFrame({ legs: [[5, 2, 0], [9, 3, 1]], bob: 1 }),
      duckFrame({ legs: [[5, 3, -1], [8, 3, 0]], bob: 0 }),
      duckFrame({ legs: [[4, 2, 0], [9, 2, 0]], bob: 1 })
    ].map(both);
    d.run = [
      duckFrame({ legs: [[3, 3, 1], [10, 3, 1]], bob: 0, wing: 1 }),
      duckFrame({ legs: [[5, 2, 1], [8, 2, 1]], bob: 1, wing: 1 }),
      duckFrame({ legs: [[6, 3, -1], [7, 3, -1]], bob: 0, wing: 1 }),
      duckFrame({ legs: [[4, 2, 1], [9, 1, 1]], bob: 1, wing: 1 })
    ].map(both);
    d.jump = [duckFrame({ legs: [[4, 2, -1], [9, 2, -1]], wing: 2, legY: 1 }), duckFrame({ legs: [[5, 3, -1], [8, 2, -1]], wing: 2, legY: 0 })].map(both);
    d.fall = [duckFrame({ legs: [[4, 3, 0], [9, 3, 0]], wing: 0, eye: 'wide' }), duckFrame({ legs: [[4, 2, 1], [9, 2, 1]], wing: 1, eye: 'wide' })].map(both);
    d.land = [duckFrame({ legs: [[3, 1, 0], [10, 1, 0]], bob: 1, wing: 0 })].map(both);
    d.stomp = [duckFrame({ legs: [[3, 3, -1], [10, 3, -1]], wing: 0, bob: 1 })].map(both);
    d.swim = [
      duckFrame({ legs: [[5, 0, 0], [9, 0, 0]], bob: 1, legY: 4 }),
      duckFrame({ legs: [[5, 1, 1], [9, 0, -1]], bob: 2, legY: 4 }),
      duckFrame({ legs: [[5, 0, -1], [9, 1, 1]], bob: 1, legY: 4 })
    ].map(both);
    d.dive = [duckFrame({ legs: [[5, 0, 0], [9, 0, 0]], bob: 2, legY: 5, eye: 'wide' })].map(both);
    d.hurt = [duckFrame({ legs: [[4, 2, 1], [9, 2, -1]], bob: 0, eye: 'blink', wing: 2 })].map(both);
    d.dead = [duckFrame({ legs: [[4, 1, 0], [9, 1, 0]], bob: 2, eye: 'dead', wing: 2 })].map(both);
    d.cheer = [
      duckFrame({ legs: [[4, 3, 0], [9, 3, 0]], wing: 2, bob: 0 }),
      duckFrame({ legs: [[4, 2, 0], [9, 2, 0]], wing: 2, bob: 2, eye: 'blink' })
    ].map(both);
    /* Folha do poder da pera: versões com a folha sobre a cabeça. */
    d.leaf = [0, 1, 2, 3].map(function (i) {
      return {
        R: duckFrame({ bob: i % 2, leaf: true, leafPhase: i, leafY: i === 2 ? 1 : 0 }),
        L: mirror(duckFrame({ bob: i % 2, leaf: true, leafPhase: i, leafY: i === 2 ? 1 : 0 }))
      };
    });
    return d;
  };

  /* ---------- jacaré ---------- */
  const CROC_BODY = [
    '..................KKKKKK....',
    '.................KGGGGGGK...',
    '.................KGGEGGGK...',
    '..............KKGGGGGGKKKKK.',
    'KKKKKKKKKKKKKKKGGGGGGGGGGGGK',
    'KGGGGGGGGGGGGGGGGGGGGGGWWWK.',
    'KGGGGGGGGGGGGGGGGGGGGGKKKKKK',
    'KgggBBBBBBBBBBBBBBBBBBWWWWK.',
    '.KKKKBBBBBBBBBBBBBBBBKKKKK..',
    '.....KKKKKKKKKKKKKKKK.......',
    '............................'
  ];
  function drawCrocLegs(g, phase, y) {
    const G = P.croc.g, K = P.croc.K;
    const off = [[0, 0], [1, 1], [2, 0], [0, 1], [2, 1]][phase % 5] || [0, 0];
    [[4, K], [9, 1], [14, K], [19, 1]].forEach(function (l, i) {
      const x = l[0], dx = i % 2 === 0 ? off[0] : off[1];
      for (let k = 0; k < 3; k++) { px(g, x + dx, y + k, G); px(g, x + dx + 1, y + k, K); }
      px(g, x + dx - 1, y + 3, G); px(g, x + dx + 1, y + 3, K); px(g, x + dx + 2, y + 3, G);
    });
  }
  function crocFrame(opt) {
    const o = opt || {};
    const s = sheet(28, 18);
    const g = s.g;
    ascii(g, CROC_BODY, P.croc, 0, 1);
    /* Olho: normal, arregalado ou nocaute. */
    const ey = 3;
    if (o.eyes === 'wide' || o.eyes === 'ko') {
      box(g, 17, ey - 1, 5, 4, P.croc.E);
      box(g, 18, ey, 3, 2, P.croc.K);
      px(g, 18, ey, P.croc.E);
      if (o.eyes === 'ko') { px(g, 21, ey + 3, P.croc.K); }
    } else if (o.eyes === 'alert') {
      box(g, 17, ey, 3, 3, P.croc.E);
      box(g, 18, ey + 1, 2, 2, P.croc.K);
    } else {
      box(g, 17, ey, 2, 2, P.croc.E);
      px(g, 18, ey + 1, P.croc.K);
    }
    /* Boca aberta para a derrota: dentes estilizados, sem violência. */
    if (o.jaw) {
      box(g, 20, 7, 7, 3, P.croc.R);
      for (let i = 0; i < 4; i++) { px(g, 20 + i * 2, 6, P.croc.W); px(g, 21 + i * 2, 9, P.croc.W); }
    }
    if (o.pose === 'fall') {
      drawCrocLegs(g, 0, 12); drawCrocLegs(g, 2, 12);
    } else {
      drawCrocLegs(g, o.phase || 0, o.legY == null ? 12 : o.legY);
    }
    return s.c;
  }
  Art.buildCroc = function () {
    return {
      walk: [0, 1, 2, 3].map(function (i) { return both(crocFrame({ phase: i })); }),
      idle: [both(crocFrame({ phase: 0 })), both(crocFrame({ phase: 3 }))],
      alert: [both(crocFrame({ phase: 0, eyes: 'alert' }))],
      ko: [both(crocFrame({ eyes: 'ko', jaw: true, legY: 11 }))],
      fall: [both(crocFrame({ eyes: 'ko', jaw: true, pose: 'fall' }))]
    };
  };

  /* ---------- frutas, caixas, bandeira, partículas ---------- */
  const APPLE = [
    '...s....',
    '..ss....',
    '..KKK...',
    '.KAAAK..',
    'KAAAAAK.',
    'KAAaAAK.',
    'KAAaAAK.',
    '.KAAAaK.',
    '..KKKK..'
  ];
  const APPLE_PAL = { K: P.fruit.K, A: P.fruit.A, a: P.fruit.a, s: '#6B4A2A' };
  const PEAR = [
    '...ss...',
    '..KKKs..',
    '.KPPPK..',
    '.KPPPKK.',
    'KPPPPPK.',
    'KPppPPK.',
    '.KppppK.',
    '..KKKK..'
  ];
  const PEAR_PAL = { K: P.fruit.K, P: P.fruit.P, p: P.fruit.p, s: '#6B4A2A', K2: P.fruit.K };
  Art.buildItems = function () {
    const apple = sheet(8, 9), pear = sheet(8, 8);
    ascii(apple.g, APPLE, APPLE_PAL, 0, 0);
    ascii(pear.g, PEAR, PEAR_PAL, 0, 0);
    /* Caixa surpresa com ponto de interrogação (4 quadros de brilho). */
    const boxes = [];
    for (let f = 0; f < 4; f++) {
      const s = sheet(16, 16), g = s.g;
      const gold = f % 2 ? '#F6C445' : '#E8AE2A';
      box(g, 0, 0, 16, 16, '#2A2118');
      box(g, 1, 1, 14, 14, gold);
      box(g, 1, 1, 14, 3, '#FFE08A');
      box(g, 1, 11, 14, 4, '#C98B1C');
      box(g, 1, 1, 2, 14, '#FFE9A8');
      box(g, 13, 1, 2, 14, '#B87C14');
      if (f === 1 || f === 3) { box(g, 3, 3, 2, 2, '#FFFFFF'); px(g, 11, 4, '#FFFFFF'); }
      /* ponto de interrogação */
      const q = ['.###.', '#...#', '...#.', '..#..', '..#..', '.....', '..#..'];
      ascii(g, q, { '#': '#5A3A0E', '.': null }, 5, 4);
      boxes.push(both(s.c));
    }
    /* Caixa já usada: madeira sem brilho. */
    const used = sheet(16, 16), ug = used.g;
    box(ug, 0, 0, 16, 16, '#2A2118');
    box(ug, 1, 1, 14, 14, '#B98A4A');
    box(ug, 1, 1, 14, 3, '#D6A96A');
    box(ug, 1, 11, 14, 4, '#8E6330');
    box(ug, 6, 2, 3, 12, '#7A5528');
    box(ug, 2, 6, 12, 3, '#7A5528');
    /* Caixa secreta (invisível) e sua versão revelada. */
    const hidden = sheet(16, 16);
    const revealed = sheet(16, 16), rg = revealed.g;
    box(rg, 0, 0, 16, 16, '#2A2118');
    box(rg, 1, 1, 14, 14, '#9AA3B5');
    box(rg, 1, 1, 14, 3, '#C3CBDB');
    box(rg, 1, 11, 14, 4, '#6E778C');
    /* Bandeira de fim de fase. */
    const flag = sheet(16, 24), fg = flag.g;
    box(fg, 3, 0, 2, 24, '#8E6330');
    box(fg, 5, 2, 9, 3, '#E66278');
    box(fg, 5, 5, 7, 3, '#F2BA38');
    box(fg, 5, 8, 9, 3, '#35A6D9');
    box(fg, 2, 22, 4, 2, '#5C3F27');
    return {
      apple: both(apple.c), pear: both(pear.c),
      box: boxes, usedBox: both(used.c),
      hiddenBox: hidden.c, revealedBox: both(revealed.c),
      flag: flag.c,
      boxParticles: both(sheet(16, 16).c)
    };
  };

  /* ---------- partículas ---------- */
  Art.buildParticles = function () {
    function dot(color, size, color2) {
      const s = sheet(size * 2, size * 2), g = s.g;
      box(g, 0, 0, size, size, color);
      if (color2) { px(g, 0, 0, color2); }
      return s.c;
    }
    return {
      dust: dot('#D9C49A', 2, '#F0E3C6'),
      leaf: dot('#5FBF58', 2, '#2E7D32'),
      bubble: dot('#BFE9FF', 2, '#FFFFFF'),
      splash: dot('#8FD3F4', 2, '#FFFFFF'),
      spark: dot('#FFE9A8', 2, '#FFFFFF'),
      green: dot('#7BE07B', 2, '#FFFFFF'),
      score: dot('#FFFFFF', 1)
    };
  };

  /* ---------- fonte 3x5 (desenhada pixel por pixel) ---------- */
  const GLYPHS = {
    A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
    E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
    I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
    M: [5, 7, 7, 5, 5], N: [5, 7, 7, 7, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
    Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
    U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
    Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
    '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7],
    '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 1, 1],
    '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
    ' ': [0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], ':': [0, 2, 0, 2, 0],
    '-': [0, 0, 7, 0, 0], '/': [1, 1, 2, 4, 4], '!': [2, 2, 2, 0, 2], '?': [6, 1, 3, 0, 2],
    "'": [2, 2, 0, 0, 0], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4], '+': [0, 2, 7, 2, 0],
    '=': [0, 7, 0, 7, 0], '%': [5, 1, 2, 4, 5], '*': [0, 5, 2, 5, 0], '#': [5, 7, 5, 7, 5],
    '@': [2, 5, 5, 5, 2]
  };
  Art.font = { w: 3, h: 5, gap: 1, glyphs: GLYPHS };
  Art.textWidth = function (str, size) { return String(str).length * (Art.font.w + Art.font.gap) * size - Art.font.gap * size; };
  Art.text = function (g, str, x, y, size, color) {
    const text = String(str).toUpperCase();
    g.fillStyle = color || '#FFFFFF';
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const gl = GLYPHS[text[i]] || GLYPHS['?'];
      for (let ry = 0; ry < 5; ry++) {
        const bits = gl[ry];
        for (let rx = 0; rx < 3; rx++) {
          if (bits & (4 >> rx)) { g.fillRect((cx + rx * size) | 0, (y + ry * size) | 0, size, size); }
        }
      }
      cx += (Art.font.w + Art.font.gap) * size;
    }
    return cx;
  };
  Art.textCenter = function (g, str, cx, y, size, color) {
    Art.text(g, str, Math.round(cx - Art.textWidth(str, size) / 2), y, size, color);
  };

  Art.init = function () {
    this.duck = this.buildDuck();
    this.croc = this.buildCroc();
    this.items = this.buildItems();
    this.particles = this.buildParticles();
    this.ready = true;
  };
})(window.DA);
