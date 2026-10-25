/* =============================================================
   DUCK ADVENTURE — motor do jogo
   Passo de simulação fixo, colisão por tiles + retângulos, câmera
   com paralaxe, estados do pato e dos jacarés, poderes das frutas,
   água, armadilhas, telas e controles (teclado + toque).
   ============================================================= */
(function (DA) {
  'use strict';
  const Game = DA.Game = {};
  const Art = DA.Art;
  const TILE = DA.TILE;
  const SAVE_KEY = 'LETRION_DUCK_ADVENTURE_V1';
  /* Probabilidade configurável das recompensas das caixas. */
  const APPLE_CHANCE = 0.6;      // o resto vira pera
  const POWER_TIME = 14;         // segundos de cada poder
  const CRUMBLE_DELAY = 0.55;

  /* ---------- constantes de física ---------- */
  const PH = {
    g: 1450, maxFall: 430, runSpeed: 112, accel: 620, groundFric: 900, airAccel: 430,
    jumpV: -374, holdG: 0.52, coyote: 0.09, buffer: 0.12, bounce: -258,
    waterG: 150, waterMaxFall: 66, swimUp: -80, swimAccel: 430, waterDrag: 300, waterSpeed: 76,
    apple: 1.5, pear: 1.14, maxParticles: 170
  };

  const S = {
    stage: null, canvas: null, ctx: null, overlay: null, running: false,
    state: 'title', levelIndex: 0, level: null, world: null, cam: { x: 0, y: 0 },
    player: null, objects: [], particles: [], texts: [], deco: [], front: [],
    time: 0, levelScore: 0, sessionScore: 0, fruits: 0, lives: 3, invuln: 0,
    appleTimer: 0, pearTimer: 0, airJumps: 0, acc: 0, last: 0, raf: 0, shake: 0,
    fade: 0, fadeDir: 0, intro: 0, hintT: 0, lastFruit: 'apple', sameRun: 0,
    paused: false, raf: 0, musicOn: false, touch: false
  };
  const save = {
    data: { unlocked: 0, best: {}, settings: { muted: false, volume: 0.7, showControls: true } },
    load: function () {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) { this.data = Object.assign(this.data, JSON.parse(raw)); }
      } catch (e) { }
      return this.data;
    },
    write: function () {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { }
    }
  };

  /* ---------- utilidades ---------- */
  function worldFor(theme) {
    if (!Art._worlds) { Art._worlds = {}; }
    if (!Art._worlds[theme]) { Art._worlds[theme] = Art.buildWorld(theme); }
    return Art._worlds[theme];
  }
  function tileAt(gx, gy) {
    const L = S.level;
    if (!L || gx < 0 || gy < 0 || gx >= L.w || gy >= L.h) { return gx < 0 || gx >= L.w ? DA.CODES.SOLID : 0; }
    return L.grid[gy][gx];
  }
  function isSolid(gx, gy) { return DA.isSolidCode(tileAt(gx, gy)); }
  function isWaterAt(x, y) {
    const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    return DA.isWaterCode(tileAt(gx, gy));
  }
  function rectTouchesTiles(r, predicate) {
    const x0 = Math.floor(r.x / TILE), x1 = Math.floor((r.x + r.w - 1) / TILE);
    const y0 = Math.floor(r.y / TILE), y1 = Math.floor((r.y + r.h - 1) / TILE);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) { if (predicate(gx, gy)) { return true; } }
    }
    return false;
  }
  function spawnParticles(x, y, count, kind, opts) {
    const o = opts || {};
    for (let i = 0; i < count; i++) {
      if (S.particles.length >= PH.maxParticles) { return; }
      S.particles.push({
        x: x, y: y, kind: kind,
        vx: (o.vx == null ? 0 : o.vx) + (Math.random() - 0.5) * (o.spreadX || 40),
        vy: (o.vy == null ? -30 : o.vy) + (Math.random() - 0.5) * (o.spreadY || 40),
        life: o.life || 0.5, t: 0, grav: o.grav == null ? 260 : o.grav, size: o.size || 2
      });
    }
  }
  function addText(x, y, str, color) {
    S.texts.push({ x: x, y: y, str: str, color: color || '#FFFFFF', life: 0.9, t: 0 });
  }

  /* ============================================================
     Início / fim do jogo
     ============================================================ */
  Game.mount = function (container) {
    if (S.stage) { Game.unmount(); }
    save.load();
    if (!Art.ready) { Art.init(); }
    S.stage = container;
    container.innerHTML =
      '<div class="da-root">' +
      '<div class="da-view"><canvas class="da-canvas" width="' + DA.W + '" height="' + DA.H + '"></canvas>' +
      '<div class="da-hudbtns"><button type="button" class="da-iconbtn" data-da="pause" aria-label="Pausar">II</button></div>' +
      '<div class="da-overlay" id="daOverlay"></div></div>' +
      '<div class="da-pad' + (save.data.settings.showControls ? '' : ' off') + '">' +
      '<div class="da-dpad">' +
      '<button type="button" class="da-btn da-left" data-da-hold="left" aria-label="Esquerda">&#9664;</button>' +
      '<button type="button" class="da-btn da-right" data-da-hold="right" aria-label="Direita">&#9654;</button>' +
      '</div>' +
      '<div class="da-actions">' +
      '<button type="button" class="da-btn da-dive" data-da-hold="dive" aria-label="Mergulhar">&#9660;</button>' +
      '<button type="button" class="da-btn da-jump" data-da-hold="jump" aria-label="Pular">A</button>' +
      '</div></div>' +
      '</div>';
    S.canvas = container.querySelector('.da-canvas');
    S.ctx = S.canvas.getContext('2d');
    S.ctx.imageSmoothingEnabled = false;
    S.overlay = container.querySelector('.da-overlay');
    S.running = true;
    S.paused = false;
    S.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    DA.Audio.applySettings(save.data.settings.muted, save.data.settings.volume);
    bindEvents();
    resize();
    showScreen('title');
    S.last = performance.now();
    S.raf = requestAnimationFrame(frame);
  };
  Game.unmount = function () {
    S.running = false;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    DA.Input.detach();
    DA.Audio.stopMusic();
    if (S.stage) { S.stage.innerHTML = ''; }
    S.stage = null; S.canvas = null; S.ctx = null; S.overlay = null;
    S.state = 'title';
  };
  Game.isRunning = function () { return S.running; };

  /* ============================================================
     Telas (DOM sobre o canvas)
     ============================================================ */
  function overlay(html) { S.overlay.innerHTML = '<div class="da-screen">' + html + '</div>'; }
  function btn(label, action, extra) {
    return '<button type="button" class="da-mbtn ' + (extra || '') + '" data-da="' + action + '">' + label + '</button>';
  }
  function levelName(i) {
    const spec = DA.LEVEL_SPECS[i];
    return (spec.world) + '-' + ((i % 2) + 1) + ' ' + spec.name;
  }
  function showScreen(name) {
    S.state = name;
    S.paused = false;
    if (name !== 'playing') { DA.Input.reset(); }
    if (name === 'title') {
      DA.Audio.stopMusic();
      overlay('<div class="da-logo">DUCK<br>ADVENTURE</div>' +
        '<div class="da-sub">PIXEL ART PLATAFORMA</div>' +
        btn('JOGAR', 'play') +
        btn('CONTINUAR', 'continue') +
        btn('SELECIONAR MUNDO', 'worlds') +
        btn('CONFIGURACOES', 'settings') +
        btn('CREDITOS', 'credits'));
    } else if (name === 'worlds') {
      let html = '<div class="da-title">SELECIONAR MUNDO</div><div class="da-worlds">';
      DA.WORLDS.forEach(function (w) {
        html += '<div class="da-world"><div class="da-wname">MUNDO ' + w.id + ' · ' + w.name + '</div><div class="da-llevels">';
        w.levels.forEach(function (i) {
          const locked = i > save.data.unlocked;
          html += '<button type="button" class="da-lvl' + (locked ? ' locked' : '') + '" ' + (locked ? 'disabled' : '') +
            ' data-da="level:' + i + '">' + levelName(i) + '<small>' + (save.data.best[i] ? 'REC ' + save.data.best[i] : (locked ? 'BLOQUEADA' : 'ABRIR')) + '</small></button>';
        });
        html += '</div></div>';
      });
      html += '</div>' + btn('VOLTAR', 'title');
      overlay(html);
    } else if (name === 'settings') {
      const st = save.data.settings;
      overlay('<div class="da-title">CONFIGURACOES</div>' +
        '<div class="da-rows">' +
        '<div class="da-row"><span>Som</span><button type="button" class="da-mbtn small" data-da="mute">' + (st.muted ? 'MUDO' : 'LIGADO') + '</button></div>' +
        '<div class="da-row"><span>Volume ' + Math.round(st.volume * 100) + '%</span><span><button type="button" class="da-mbtn small" data-da="vol-">-</button> <button type="button" class="da-mbtn small" data-da="vol+">+</button></span></div>' +
        '<div class="da-row"><span>Controles na tela</span><button type="button" class="da-mbtn small" data-da="controls">' + (st.showControls ? 'SIM' : 'NAO') + '</button></div>' +
        '</div>' +
        '<div class="da-help">TECLADO: SETAS OU A/D · ESPACO PULA · S MERGULHA · ESC PAUSA<br>TOQUE: BOTOES NA TELA · DIREITA/ESQUERDA PARA ANDAR</div>' +
        btn('VOLTAR', 'title'));
    } else if (name === 'credits') {
      overlay('<div class="da-title">CREDITOS</div>' +
        '<div class="da-help">DUCK ADVENTURE<br>PIXEL ART DESENHADA PIXEL POR PIXEL EM CANVAS 2D<br><br>IDEIA, ARTE E PROGRAMACAO: EQUIPE LETRION<br>MIGUEL, MURILO E VINICIUS<br><br>5 MUNDOS · 10 FASES · 2 PODERES DE FRUTA</div>' +
        btn('VOLTAR', 'title'));
    } else if (name === 'paused') {
      S.paused = true;
      overlay('<div class="da-title">PAUSA</div>' + btn('CONTINUAR', 'resume') + btn('REINICIAR FASE', 'restart') + btn('VOLTAR AO MENU', 'title'));
    } else if (name === 'complete') {
      const best = save.data.best[S.levelIndex] || 0;
      overlay('<div class="da-title">FASE CONCLUIDA!</div>' +
        '<div class="da-row"><span>PONTOS</span><b>' + S.levelScore + '</b></div>' +
        '<div class="da-row"><span>FRUTAS</span><b>' + S.fruits + '</b></div>' +
        '<div class="da-row"><span>TEMPO</span><b>' + S.time.toFixed(1) + 'S</b></div>' +
        '<div class="da-row"><span>RECORDE</span><b>' + Math.max(best, S.levelScore) + '</b></div>' +
        (S.levelIndex + 1 < DA.TOTAL_LEVELS ? btn('PROXIMA FASE', 'next') : '<div class="da-help">VOCE CONCLUIU TODOS OS MUNDOS!</div>') +
        btn('REPETIR FASE', 'restart') + btn('SELECIONAR MUNDO', 'worlds'));
    } else if (name === 'gameover') {
      overlay('<div class="da-title">FIM DA TENTATIVA</div>' +
        '<div class="da-help">O PATO PRECISA DE UMA NOVA CHANCE.</div>' +
        btn('TENTAR DE NOVO', 'restart') + btn('SELECIONAR MUNDO', 'worlds') + btn('VOLTAR AO MENU', 'title'));
    } else if (name === 'playing') {
      S.paused = false;
      overlay('');
    }
  }
  function handleAction(action) {
    DA.Audio.sfx('click');
    if (action === 'play') { startLevel(Math.min(save.data.unlocked, DA.TOTAL_LEVELS - 1)); }
    else if (action === 'continue') { startLevel(Math.min(save.data.unlocked, DA.TOTAL_LEVELS - 1)); }
    else if (action === 'worlds') { showScreen('worlds'); }
    else if (action === 'settings') { showScreen('settings'); }
    else if (action === 'credits') { showScreen('credits'); }
    else if (action === 'title') { showScreen('title'); }
    else if (action === 'pause') { if (S.state === 'playing') { showScreen('paused'); } else if (S.state === 'paused') { showScreen('playing'); } }
    else if (action === 'resume') { showScreen('playing'); }
    else if (action === 'restart') { startLevel(S.levelIndex); }
    else if (action === 'retry') { startLevel(S.levelIndex); }
    else if (action === 'next') { startLevel(Math.min(S.levelIndex + 1, DA.TOTAL_LEVELS - 1)); }
    else if (action === 'mute') { save.data.settings.muted = !save.data.settings.muted; save.write(); DA.Audio.applySettings(save.data.settings.muted, save.data.settings.volume); showScreen('settings'); }
    else if (action === 'vol+') { save.data.settings.volume = Math.min(1, save.data.settings.volume + 0.1); save.write(); DA.Audio.applySettings(save.data.settings.muted, save.data.settings.volume); showScreen('settings'); }
    else if (action === 'vol-') { save.data.settings.volume = Math.max(0, save.data.settings.volume - 0.1); save.write(); DA.Audio.applySettings(save.data.settings.muted, save.data.settings.volume); showScreen('settings'); }
    else if (action === 'controls') {
      save.data.settings.showControls = !save.data.settings.showControls; save.write();
      const pad = S.stage.querySelector('.da-pad');
      if (pad) { pad.classList.toggle('off', !save.data.settings.showControls); }
      showScreen('settings');
    } else if (action.indexOf('level:') === 0) {
      startLevel(parseInt(action.split(':')[1], 10) || 0);
    }
  }

  /* ============================================================
     Entrada
     ============================================================ */
  function bindEvents() {
    DA.Input.attach();
    DA.Input.reset();
    S.overlay.addEventListener('click', function (e) {
      const b = e.target.closest('[data-da]');
      if (b) { e.preventDefault(); handleAction(b.getAttribute('data-da')); }
    });
    S.stage.querySelector('.da-hudbtns').addEventListener('click', function (e) {
      const b = e.target.closest('[data-da]');
      if (b) { handleAction(b.getAttribute('data-da')); }
    });
    Array.prototype.forEach.call(S.stage.querySelectorAll('[data-da-hold]'), function (el) {
      const name = el.getAttribute('data-da-hold');
      const down = function (e) { e.preventDefault(); DA.Input.set(name, true); el.classList.add('active'); };
      const up = function (e) { e.preventDefault(); DA.Input.set(name, false); el.classList.remove('active'); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    document.addEventListener('visibilitychange', onVisibility);
    S.canvas.addEventListener('pointerdown', function () { DA.Audio.resume(); });
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      if (S.state === 'playing') { showScreen('paused'); }
      else if (S.state === 'paused') { showScreen('playing'); }
    }
  }
  function onVisibility() {
    if (document.hidden && S.state === 'playing') { showScreen('paused'); }
  }
  function resize() {
    if (!S.canvas || !S.stage) { return; }
    const view = S.stage.querySelector('.da-view');
    /* Medidas de layout (não o retângulo na tela): independem de qualquer
       transformação aplicada pelo quadro em tela cheia. */
    const vw = view.offsetWidth, vh = view.offsetHeight;
    const min = Math.min((vw - 8) / DA.W, (vh - 8) / DA.H);
    if (min >= 1) {
      const z = Math.max(1, Math.floor(min));
      S.canvas.style.width = (DA.W * z) + 'px';
      S.canvas.style.height = (DA.H * z) + 'px';
    } else {
      S.canvas.style.width = '100%';
      S.canvas.style.height = 'auto';
    }
  }

  /* ============================================================
     Carregar fase
     ============================================================ */
  function startLevel(index) {
    const spec = DA.LEVEL_SPECS[index];
    if (!spec) { return; }
    S.levelIndex = index;
    S.level = DA.buildLevel(spec);
    S.world = worldFor(S.level.theme);
    S.player = {
      x: S.level.start.x, y: S.level.start.y, vx: 0, vy: 0, w: 11, h: 14,
      face: 1, onGround: false, coyote: 0, buffered: 0, inWater: false, anim: 0,
      state: 'idle', stateT: 0, dying: 0, dead: false, cheer: 0
    };
    S.objects = S.level.objects.map(function (o) { return Object.assign({}, o); });
    S.objects.forEach(function (o) {
      if (o.type === 'platform') { o.dx = o.moving ? 0 : 0; }
      if (o.type === 'hazard') { o.state = 0; o.active = false; }
    });
    /* Checkpoint: marco no meio da fase. */
    S.level.checkpoint = { x: Math.floor(S.level.w * 0.55) * TILE, y: 0 };
    S.lives = 3; S.invuln = 0; S.appleTimer = 0; S.pearTimer = 0; S.airJumps = 0;
    S.levelScore = 0; S.fruits = 0; S.time = 0; S.particles = []; S.texts = [];
    S.shake = 0; S.fade = 1; S.fadeDir = -1; S.intro = 2.2; S.hintT = 4;
    buildDecorations();
    showScreen('playing');
    S.state = 'playing';
    DA.Audio.resume();
    DA.Audio.playMusic(S.level.music);
  }
  function buildDecorations() {
    S.deco = []; S.front = [];
    const L = S.level, rng = DA.rng(L.decoSeed);
    const deco = S.world.deco;
    if (!deco.length) { return; }
    for (let x = 0; x < L.w; x++) {
      /* solo com ar acima recebe vegetação */
      let top = -1;
      for (let y = 0; y < L.h; y++) {
        const c = L.grid[y][x];
        if (c === DA.CODES.SOLID) { top = y; break; }
        if (DA.isWaterCode(c)) { top = -2; break; }
      }
      if (top > 0 && rng() > 0.72) {
        const d = deco[Math.floor(rng() * deco.length)];
        if (d.art) {
          S.deco.push({ art: d.art, x: x * TILE + Math.floor(rng() * 6) - 3, y: top * TILE + 16, sway: rng() * 6.28, kind: d.kind });
        }
      }
      /* camada frontal esparsa: folhas e galhos passando na frente */
      if (rng() > 0.94) {
        S.front.push({ x: x * TILE, y: Math.floor(rng() * 30) - 10, r: 6 + Math.floor(rng() * 10) });
      }
    }
  }

  /* ============================================================
     Atualização
     ============================================================ */
  function frame(now) {
    if (!S.running) { return; }
    if (!S.stage || !S.stage.isConnected) { Game.unmount(); return; }
    const dt = Math.min(0.05, (now - S.last) / 1000);
    S.last = now;
    if (S.state === 'playing' && !S.paused) {
      S.acc += dt;
      let guard = 0;
      while (S.acc >= DA.STEP && guard < 5) { update(DA.STEP); S.acc -= DA.STEP; guard++; }
      if (S.acc > 0.5) { S.acc = 0; }
    } else {
      S.acc = 0;
    }
    render(dt);
    S.raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    const p = S.player, L = S.level;
    if (S.intro > 0) { S.intro -= dt; }
    if (S.hintT > 0) { S.hintT -= dt; }
    if (S.fadeDir) {
      S.fade += S.fadeDir * dt * 3;
      if (S.fade <= 0) { S.fade = 0; S.fadeDir = 0; }
      if (S.fade >= 1) { S.fade = 1; S.fadeDir = 0; }
    }
    if (S.shake > 0) { S.shake = Math.max(0, S.shake - dt * 26); }
    S.time += dt;
    if (S.appleTimer > 0) {
      S.appleTimer -= dt;
      if (S.appleTimer <= 0) { S.appleTimer = 0; DA.Audio.sfx('powerEnd'); }
    }
    if (S.pearTimer > 0) {
      S.pearTimer -= dt;
      if (S.pearTimer <= 0) { S.pearTimer = 0; DA.Audio.sfx('powerEnd'); }
    }
    if (S.invuln > 0) { S.invuln -= dt; }

    if (p.dead) { updateDead(dt); }
    else if (p.dying > 0) { updateDeath(dt); }
    else { updatePlayer(dt); }

    updateObjects(dt);
    updateParticles(dt);
    updateTexts(dt);
    updateCamera(dt);

    /* queda em abismo */
    if (!p.dead && p.dying <= 0 && p.y > L.pixelH + 20) { kill(); }
  }

  function updatePlayer(dt) {
    const p = S.player, L = S.level;
    const inp = DA.Input;
    const edges = inp.consume();
    const wasWater = p.inWater;
    const chest = { x: p.x + p.w / 2, y: p.y + p.h * 0.4, w: p.w * 0.5, h: p.h * 0.4 };
    p.inWater = isWaterAt(p.x + p.w / 2, p.y + p.h * 0.6) || isWaterAt(p.x + p.w / 2, p.y + 4);

    const speedMul = S.appleTimer > 0 ? PH.apple : 1;
    const maxSpeed = p.inWater ? PH.waterSpeed * (S.appleTimer > 0 ? 1.25 : 1) : PH.runSpeed * speedMul;
    const dirInput = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    if (p.inWater) {
      if (!wasWater) {
        DA.Audio.sfx('splash');
        spawnParticles(p.x + p.w / 2, p.y + p.h, 10, 'splash', { vy: -70, spreadX: 60, grav: 300, life: 0.5 });
      }
      p.vy += PH.waterG * dt;
      p.vy = Math.min(p.vy, PH.waterMaxFall);
      if (inp.dive) { p.vy += 160 * dt; }
      /* Com a cabeça fora da água o pulo é um pulo de verdade: permite sair de poças e lagos. */
      if (inp.jump) {
        if (!isWaterAt(p.x + p.w / 2, p.y + 2)) { doJump(0.95); p.buffered = 0; }
        else { p.vy = PH.swimUp; }
      }
      p.vx = DA.approach(p.vx, dirInput * maxSpeed, PH.swimAccel * dt);
      if (!dirInput) { p.vx = DA.approach(p.vx, 0, PH.waterDrag * dt); }
      if (p.vy < -20 && Math.random() < 0.25) {
        spawnParticles(p.x + p.w / 2, p.y, 1, 'bubble', { vy: -30, grav: -40, life: 0.7, spreadX: 6 });
      }
      if (Math.random() < 0.02) { DA.Audio.sfx('bubble'); }
      /* correntes de água */
      const cx = Math.floor((p.x + p.w / 2) / TILE), cy = Math.floor((p.y + p.h / 2) / TILE);
      const code = tileAt(cx, cy);
      if (code === DA.CODES.CURRENT_R) { p.vx += 190 * dt; }
      if (code === DA.CODES.CURRENT_L) { p.vx -= 190 * dt; }
      p.state = inp.dive ? 'dive' : (Math.abs(p.vx) > 12 ? 'swim' : 'swimIdle');
    } else {
      if (wasWater) {
        DA.Audio.sfx('splash');
        spawnParticles(p.x + p.w / 2, p.y + p.h, 8, 'splash', { vy: -80, spreadX: 70, grav: 320, life: 0.45 });
      }
      const accel = p.onGround ? PH.accel : PH.airAccel;
      if (dirInput) {
        p.vx = DA.approach(p.vx, dirInput * maxSpeed, accel * dt);
        p.face = dirInput;
      } else if (p.onGround) {
        p.vx = DA.approach(p.vx, 0, PH.groundFric * dt);
      }
      /* gravidade com pulo variável */
      let g = PH.g;
      if (p.vy < 0 && inp.jump) { g *= PH.holdG; }
      p.vy += g * dt;
      p.vy = Math.min(p.vy, PH.maxFall);
    }

    /* pulo com coyote time e buffer, pera dá impulso extra e pulo aéreo */
    if (edges.jump) { p.buffered = PH.buffer; }
    p.buffered = Math.max(0, p.buffered - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    if (p.buffered > 0) {
      if (p.onGround || p.coyote > 0) {
        doJump(1); p.buffered = 0; p.coyote = 0;
      } else if (S.pearTimer > 0 && S.airJumps < 1) {
        doJump(1); p.buffered = 0; S.airJumps++;
      }
    }
    if (p.onGround) { S.airJumps = 0; }
    if (!p.inWater && !p.onGround && p.vy > 0 && Math.random() < 0.02 && S.appleTimer > 0) {
      spawnParticles(p.x + p.w / 2, p.y + p.h, 1, 'spark', { vy: 0, grav: 0, life: 0.3, spreadX: 8 });
    }
    if (!p.inWater && p.onGround && Math.abs(p.vx) > 70 && S.appleTimer > 0 && Math.random() < 0.35) {
      spawnParticles(p.x + p.w / 2 - p.face * 4, p.y + p.h, 1, 'dust', { vy: -20, grav: 120, life: 0.35, spreadX: 20 });
    }

    /* ---------- colisões ---------- */
    const wasOnGround = p.onGround;
    moveEntity(p, dt, false);
    if (!wasOnGround && p.onGround && !p.inWater) {
      DA.Audio.sfx('land');
      spawnParticles(p.x + p.w / 2, p.y + p.h, 5, 'dust', { vy: -30, grav: 220, life: 0.35, spreadX: 40 });
      if (p.vy > 200) { S.shake = Math.min(3, p.vy / 120); }
    }

    /* espinhos na grade */
    if (S.invuln <= 0 && rectTouchesTiles({ x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 3 }, function (gx, gy) {
      return tileAt(gx, gy) === DA.CODES.SPIKE;
    })) { hurt(1, 0); }

    /* ---------- estado e animação ---------- */
    if (p.inWater) { p.state = p.state; }
    else if (p.vy < -10) { p.state = 'jump'; }
    else if (p.vy > 30) { p.state = 'fall'; }
    else if (Math.abs(p.vx) > 78) { p.state = 'run'; }
    else if (Math.abs(p.vx) > 8) { p.state = 'walk'; }
    else { p.state = 'idle'; }
    p.anim += dt * (p.state === 'run' ? 1.7 : p.state === 'walk' ? 1.1 : 0.6);

    /* bandeira: fim de fase */
    const goal = { x: L.goal.x, y: L.goal.y - TILE, w: TILE, h: TILE * 2 };
    if (!p.dead && DA.aabb(p, goal)) { completeLevel(); }
  }

  function doJump(power) {
    const p = S.player;
    let v = PH.jumpV * power;
    if (S.pearTimer > 0) { v *= PH.pear; }
    p.vy = v;
    p.onGround = false; p.coyote = 0;
    DA.Audio.sfx(S.pearTimer > 0 ? 'jumpBig' : 'jump');
    spawnParticles(p.x + p.w / 2, p.y + p.h, 4, 'dust', { vy: -20, grav: 200, life: 0.3, spreadX: 30 });
    if (S.pearTimer > 0) { spawnParticles(p.x + p.w / 2, p.y + p.h, 3, 'green', { vy: -40, grav: 120, life: 0.4, spreadX: 24 }); }
  }

  /* Move a entidade resolvendo as colisões eixo por eixo. */
  function moveEntity(e, dt, ignorePlatforms) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx * dt), Math.abs(e.vy * dt)) / 8));
    const sx = e.vx * dt / steps, sy = e.vy * dt / steps;
    e.onGround = false;
    for (let i = 0; i < steps; i++) {
      /* eixo X */
      e.x += sx;
      resolveAxis(e, 'x');
      /* eixo Y */
      const prevBottom = e.y + e.h;
      e.y += sy;
      if (sy >= 0) {
        if (resolveDown(e, prevBottom, ignorePlatforms)) { e.onGround = true; }
      } else {
        resolveUp(e);
      }
    }
    if (e.onGround) { e.coyote = PH.coyote; }
  }
  function resolveAxis(e, axis) {
    if (axis === 'x') {
      const y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + e.h - 1) / TILE);
      const gx = e.vx > 0 ? Math.floor((e.x + e.w - 1) / TILE) : Math.floor(e.x / TILE);
      for (let gy = y0; gy <= y1; gy++) {
        if (isSolid(gx, gy)) {
          if (e.vx > 0) { e.x = gx * TILE - e.w; } else if (e.vx < 0) { e.x = (gx + 1) * TILE; }
          e.vx = 0;
          return;
        }
      }
    }
  }
  function resolveDown(e, prevBottom, ignorePlatforms) {
    const x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
    const gy = Math.floor((e.y + e.h - 1) / TILE);
    for (let gx = x0; gx <= x1; gx++) {
      if (isSolid(gx, gy)) {
        e.y = gy * TILE - e.h;
        e.vy = 0;
        return true;
      }
    }
    if (ignorePlatforms) { return false; }
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (o.type !== 'platform' || o.gone) { continue; }
      if (e.x + e.w <= o.x + 1 || e.x >= o.x + o.w - 1) { continue; }
      if (e.vy >= 0 && prevBottom <= o.y + 4 && e.y + e.h >= o.y && e.y + e.h <= o.y + o.h + 6) {
        e.y = o.y - e.h;
        e.vy = 0;
        if (e === S.player) { onPlatformLand(o); }
        return true;
      }
    }
    return false;
  }
  function resolveUp(e) {
    const x0 = Math.floor(e.x / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
    const gy = Math.floor(e.y / TILE);
    for (let gx = x0; gx <= x1; gx++) {
      if (isSolid(gx, gy)) {
        e.y = (gy + 1) * TILE;
        e.vy = 0;
        return;
      }
    }
  }
  function onPlatformLand(o) {
    if (o.crumble && o.timer < 0) { o.timer = CRUMBLE_DELAY; }
    if (o.moving) { /* carrega o jogador junto */ }
  }

  /* ---------- objetos ---------- */
  function updateObjects(dt) {
    const p = S.player;
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (o.type === 'platform') {
        if (o.gone) {
          if (o.respawn > 0) { o.respawn -= dt; if (o.respawn <= 0) { o.gone = false; o.timer = -1; } }
          continue;
        }
        if (o.moving) {
          o.t += dt * (o.speed / Math.max(1, o.range));
          const off = Math.sin(o.t * Math.PI) * o.range;
          if (o.axis === 'x') { o.x = o.base.x + off; } else { o.y = o.base.y - off; }
          /* plataforma móvel carrega quem está em cima */
          if (p && !p.dead && p.dying <= 0 && Math.abs((p.y + p.h) - o.y) < 3 && p.x + p.w > o.x && p.x < o.x + o.w && p.onGround) {
            if (o.axis === 'x') { p.x += (Math.sin(o.t * Math.PI + 0.3) - Math.sin(o.t * Math.PI)) * 0; }
          }
        }
        if (o.crumble && o.timer >= 0) {
          o.timer -= dt;
          o.shake = 1;
          if (Math.random() < 0.4) { spawnParticles(o.x + Math.random() * o.w, o.y + 6, 1, 'dust', { vy: 20, grav: 220, life: 0.4 }); }
          if (o.timer <= 0) {
            o.gone = true; o.respawn = 3.2; o.shake = 0;
            DA.Audio.sfx('rock');
            spawnParticles(o.x + o.w / 2, o.y + 4, 8, 'dust', { vy: 10, grav: 300, life: 0.6, spreadX: o.w / 2 });
          }
        }
      } else if (o.type === 'box') {
        if (o.bump > 0) { o.bump -= dt * 3; if (o.bump < 0) { o.bump = 0; } }
        if (o.secret && !o.reveal) {
          /* caixa secreta: aparece só quando atingida por baixo */
          if (p && !p.dead && p.vy < 0 && DA.aabb(p, { x: o.x + 1, y: o.y + 12, w: o.w - 2, h: 8 })) {
            o.reveal = 1; o.bump = 1;
            DA.Audio.sfx('box');
            spawnParticles(o.x + o.w / 2, o.y + o.h, 10, 'spark', { vy: -40, grav: 200, life: 0.5, spreadX: 40 });
            p.vy = 40;
          }
        } else if (!o.open) {
          if (p && !p.dead && p.dying <= 0 && p.vy < 0 && DA.aabb(p, { x: o.x + 1, y: o.y + 12, w: o.w - 2, h: 8 })) {
            openBox(o);
          }
        }
      } else if (o.type === 'fruit') {
        if (o.taken) { continue; }
        o.vy = Math.min(300, o.vy + 640 * dt);
        const before = o.y;
        o.y += o.vy * dt;
        const gy = Math.floor((o.y + 9) / TILE);
        const gx = Math.floor((o.x + 4) / TILE);
        if (isSolid(gx, gy) || (S.objects.some(function (q) { return q.type === 'platform' && !q.gone && Math.abs(q.y - (o.y + 9)) < 6 && o.x + 8 > q.x && o.x < q.x + q.w; }))) {
          o.y = gy * TILE - 9;
          if (o.vy > 60) { o.vy = -o.vy * 0.32; } else { o.vy = 0; }
          if (Math.abs(o.vy) < 20) { o.vy = 0; }
        }
        if (p && !p.dead && DA.aabb(p, { x: o.x, y: o.y, w: 8, h: 9 })) {
          o.taken = true;
          collectFruit(o.kind);
        }
      } else if (o.type === 'hazard') {
        updateHazard(o, dt);
      } else if (o.type === 'croc') {
        updateCroc(o, dt);
      }
    }
  }
  function openBox(o) {
    o.open = true; o.bump = 1;
    const kind = nextFruitKind();
    S.objects.push({ type: 'fruit', kind: kind, x: o.x + 4, y: o.y - 12, vy: -190, taken: false });
    DA.Audio.sfx('box');
    spawnParticles(o.x + o.w / 2, o.y, 10, 'spark', { vy: -60, grav: 240, life: 0.5, spreadX: 40 });
    DA.Audio.sfx(kind === 'apple' ? 'apple' : 'pear');
    addText(o.x + 4, o.y - 18, kind === 'apple' ? 'MACA!' : 'PERA!', kind === 'apple' ? '#FF9E9E' : '#D8F09A');
    S.levelScore += 50;
  }
  /* Distribuição aleatória controlada: sem longas sequências do mesmo tipo. */
  function nextFruitKind() {
    let kind = Math.random() < APPLE_CHANCE ? 'apple' : 'pear';
    if (kind === S.lastFruit) { S.sameRun++; } else { S.sameRun = 0; }
    if (S.sameRun >= 2) { kind = kind === 'apple' ? 'pear' : 'apple'; S.sameRun = 0; }
    S.lastFruit = kind;
    return kind;
  }
  function collectFruit(kind) {
    DA.Audio.sfx(kind === 'apple' ? 'apple' : 'pear');
    DA.Audio.sfx('power');
    S.fruits++; S.levelScore += 100;
    addText(S.player.x, S.player.y - 10, '+100', '#FFE9A8');
    if (kind === 'apple') {
      S.appleTimer = POWER_TIME;
      spawnParticles(S.player.x + 5, S.player.y + 6, 12, 'spark', { vy: -50, grav: 160, life: 0.6, spreadX: 60 });
    } else {
      S.pearTimer = POWER_TIME;
      S.airJumps = 0;
      spawnParticles(S.player.x + 5, S.player.y + 6, 14, 'green', { vy: -60, grav: 140, life: 0.7, spreadX: 60 });
    }
  }

  /* ---------- armadilhas ---------- */
  function updateHazard(o, dt) {
    const p = S.player;
    o.t += dt;
    const px = o.x + 8, py = o.y + 8;
    if (o.kind === 'popSpikes') {
      const cycle = o.t % 2.6;
      o.state = cycle < 1.5 ? 0 : cycle < 1.9 ? 1 : 2;   // aviso -> ativo -> recolhendo
      o.active = o.state === 1;
      if (o.active && S.invuln <= 0 && !p.dead && p.dying <= 0 && DA.aabb(p, { x: o.x + 1, y: o.y + 6, w: 14, h: 10 })) { hurt(1, p.x < px ? -1 : 1); }
    } else if (o.kind === 'plant') {
      const cycle = o.t % 3.2;
      o.active = cycle > 1.4 && cycle < 2.5;
      if (o.active && S.invuln <= 0 && !p.dead && p.dying <= 0 && DA.aabb(p, { x: o.x + 1, y: o.y + 2, w: 14, h: 14 })) { hurt(1, p.x < px ? -1 : 1); }
    } else if (o.kind === 'rock') {
      if (o.state === 0) {
        if (Math.abs((p.x + p.w / 2) - px) < 22 && p.y > o.y) { o.state = 1; o.vy = 0; }
      } else {
        o.vy = Math.min(340, (o.vy || 0) + 900 * dt);
        o.y += o.vy * dt;
        const gy = Math.floor((o.y + 12) / TILE), gx = Math.floor(px / TILE);
        if (isSolid(gx, gy) || o.y > S.level.pixelH) {
          if (o.state === 1) {
            DA.Audio.sfx('rock');
            spawnParticles(px, o.y + 12, 8, 'dust', { vy: -40, grav: 300, life: 0.5, spreadX: 50 });
          }
          o.state = 3; o.y = S.level.pixelH + 40;
        } else if (S.invuln <= 0 && !p.dead && p.dying <= 0 && DA.aabb(p, { x: o.x, y: o.y, w: 14, h: 14 })) {
          hurt(1, p.x < px ? -1 : 1);
        }
      }
      if (o.state === 2) { o.state = 0; }
    } else if (o.kind === 'log') {
      if (o.state === 0) {
        if (Math.abs((p.x + p.w / 2) - px) < 90) { o.state = 1; o.dir = p.x < px ? -1 : 1; DA.Audio.sfx('log'); }
      } else {
        o.x += o.dir * 78 * dt;
        o.vy = Math.min(300, (o.vy || 0) + 800 * dt);
        o.y += o.vy * dt;
        const gx = Math.floor((o.x + 9) / TILE), gy = Math.floor((o.y + 14) / TILE);
        if (isSolid(gx, gy)) { o.y = gy * TILE - 14; o.vy = 0; } else { o.vy = (o.vy || 0) + 0; }
        if (S.invuln <= 0 && !p.dead && p.dying <= 0 && DA.aabb(p, { x: o.x, y: o.y + 2, w: 18, h: 12 })) { hurt(1, o.dir); }
        if (o.x < -40 || o.x > S.level.pixelW + 40 || o.y > S.level.pixelH + 40) { o.state = 4; }
      }
    }
  }

  /* ---------- jacarés ---------- */
  function updateCroc(o, dt) {
    const p = S.player;
    if (o.state === 'ko') {
      o.t += dt;
      o.koTimer -= dt;
      if (o.koTimer <= 0) {
        o.state = 'fall'; o.vy = 0;
        spawnParticles(o.x + 14, o.y + 8, 12, 'spark', { vy: -60, grav: 260, life: 0.7, spreadX: 50 });
      }
      return;
    }
    if (o.state === 'fall') {
      o.vy = Math.min(340, o.vy + 700 * dt);
      o.y += o.vy * dt;
      if (o.y > S.level.pixelH + 60) { o.state = 'gone'; }
      return;
    }
    if (o.state === 'gone') { return; }
    /* perseguição dentro de uma distância configurável */
    const dist = Math.abs((p.x + p.w / 2) - (o.x + 14));
    const chaseRange = 92;
    if (o.chase && dist < chaseRange && !p.dead && p.dying <= 0 && Math.abs(p.y - o.y) < 26) {
      if (o.state !== 'chase') { o.state = 'chase'; o.t = 0; }
    } else if (o.state === 'chase' && dist > chaseRange + 40) {
      o.state = 'walk';
    }
    if (o.state === 'alert') {
      o.t += dt;
      if (o.t > 0.5) { o.state = 'chase'; o.t = 0; }
    }
    let dir = o.dir;
    if (o.state === 'chase') { dir = (p.x + p.w / 2) < (o.x + 14) ? -1 : 1; }
    const speed = o.state === 'chase' ? 70 : 34;
    o.vx = dir * speed;
    o.dir = dir;
    o.x += o.vx * dt;
    /* limites de patrulha */
    if (o.state !== 'chase') {
      if (o.x < o.patrol[0]) { o.x = o.patrol[0]; o.dir = 1; }
      if (o.x + 28 > o.patrol[1]) { o.x = o.patrol[1] - 28; o.dir = -1; }
    }
    /* gravidade simples + apoio no solo */
    o.vy = Math.min(320, (o.vy || 0) + 1000 * dt);
    o.y += o.vy * dt;
    const gy = Math.floor((o.y + 16) / TILE);
    let grounded = false;
    for (let gx = Math.floor(o.x / TILE); gx <= Math.floor((o.x + 27) / TILE); gx++) {
      if (isSolid(gx, gy)) { o.y = gy * TILE - 16; o.vy = 0; grounded = true; break; }
    }
    if (!grounded && o.y > S.level.pixelH + 40) { o.state = 'gone'; return; }
    o.t += dt;
    if (o.state === 'walk' && o.t > 3.2) { o.state = 'idle'; o.t = 0; }
    if (o.state === 'idle' && o.t > 1.1) { o.state = 'walk'; o.t = 0; }

    /* colisão com o pato: ataque por cima derrota; lado ou baixo causam dano */
    if (p.dead || p.dying > 0) { return; }
    const body = { x: o.x + 2, y: o.y + 2, w: 24, h: 14 };
    if (!DA.aabb(p, body)) { return; }
    const pBottom = p.y + p.h;
    const falling = p.vy > 40;
    const aboveHead = pBottom - p.vy * dt <= o.y + 8;
    if (falling && aboveHead) {
      o.state = 'ko'; o.koTimer = 0.6; o.t = 0;
      p.vy = PH.bounce;
      p.state = 'stomp'; p.stateT = 0.2;
      S.levelScore += 200;
      S.shake = 3;
      addText(o.x + 6, o.y - 8, '+200', '#FFE9A8');
      DA.Audio.sfx('stomp');
      spawnParticles(o.x + 14, o.y + 6, 12, 'spark', { vy: -70, grav: 240, life: 0.6, spreadX: 60 });
    } else if (S.invuln <= 0) {
      hurt(1, (p.x + p.w / 2) < (o.x + 14) ? -1 : 1);
    }
  }

  /* ---------- dano, derrota e fase concluída ---------- */
  function hurt(amount, dir) {
    const p = S.player;
    if (p.dead || p.dying > 0 || S.invuln > 0) { return; }
    S.lives -= amount;
    S.invuln = 1.5;
    DA.Audio.sfx('hurt');
    S.shake = 4;
    p.vx = (dir || (p.face * -1)) * 130;
    p.vy = -190;
    p.state = 'hurt'; p.stateT = 0.3;
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 8, 'spark', { vy: -40, grav: 220, life: 0.5, spreadX: 70 });
    if (S.lives <= 0) { kill(); }
  }
  function kill() {
    const p = S.player;
    if (p.dead || p.dying > 0) { return; }
    DA.Audio.sfx('death');
    S.lives = Math.max(0, S.lives - 1);
    p.dying = 0.75;      // congelado com olhos arregalados
    p.vx = 0; p.vy = 0;
    p.state = 'dead';
  }
  function updateDeath(dt) {
    const p = S.player;
    p.dying -= dt;
    if (p.dying <= 0) { p.dead = true; p.vy = -120; }
  }
  function updateDead(dt) {
    const p = S.player;
    p.vy = Math.min(340, p.vy + 900 * dt);
    p.y += p.vy * dt;
    /* A pose fica congelada, o pato cai para fora da tela e só então o jogo decide. */
    if (p.y > S.level.pixelH + 60) {
      if (S.lives > 0) { respawn(); } else { showScreen('gameover'); }
    }
  }
  function respawn() {
    const spec = DA.LEVEL_SPECS[S.levelIndex];
    const keep = { score: S.levelScore, fruits: S.fruits };
    startLevel(S.levelIndex);
    S.levelScore = keep.score; S.fruits = keep.fruits;
    S.lives = 3;
    S.fade = 1; S.fadeDir = -1;
  }
  function completeLevel() {
    if (S.state !== 'playing') { return; }
    const p = S.player;
    p.cheer = 1;
    DA.Audio.sfx('complete');
    DA.Audio.stopMusic();
    S.levelScore += 300 + Math.max(0, Math.round(180 - S.time) * 10);
    S.sessionScore += S.levelScore;
    save.data.best[S.levelIndex] = Math.max(save.data.best[S.levelIndex] || 0, S.levelScore);
    if (S.levelIndex + 1 >= save.data.unlocked) { save.data.unlocked = Math.min(DA.TOTAL_LEVELS - 1, S.levelIndex + 1); }
    save.write();
    spawnParticles(p.x + 5, p.y + 4, 24, 'spark', { vy: -90, grav: 220, life: 1, spreadX: 90 });
    S.fadeDir = 1;
    S.state = 'completing';
    setTimeout(function () {
      if (S.running && S.state === 'completing') { showScreen('complete'); }
    }, 300);
  }

  /* ---------- partículas e câmera ---------- */
  function updateParticles(dt) {
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const q = S.particles[i];
      q.t += dt;
      if (q.t >= q.life) { S.particles.splice(i, 1); continue; }
      q.vy += q.grav * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.kind === 'bubble' && q.y < S.level.pixelH * 0) { }
    }
  }
  function updateTexts(dt) {
    for (let i = S.texts.length - 1; i >= 0; i--) {
      const t = S.texts[i];
      t.t += dt; t.y -= 18 * dt;
      if (t.t >= t.life) { S.texts.splice(i, 1); }
    }
  }
  function updateCamera(dt) {
    const p = S.player, L = S.level;
    const targetX = p.x + p.w / 2 - DA.W / 2 + p.face * 18;
    const targetY = p.y + p.h / 2 - DA.H * 0.55;
    S.cam.x += (targetX - S.cam.x) * Math.min(1, dt * 6);
    S.cam.y += (targetY - S.cam.y) * Math.min(1, dt * 5);
    S.cam.x = DA.clamp(S.cam.x, 0, Math.max(0, L.pixelW - DA.W));
    S.cam.y = DA.clamp(S.cam.y, -20, Math.max(0, L.pixelH - DA.H + 20));
  }

  /* ============================================================
     Renderização
     ============================================================ */
  function render(dt) {
    const g = S.ctx;
    if (!g) { return; }
    g.save();
    g.imageSmoothingEnabled = false;
    if (!S.level) {
      drawTitleBackdrop(g, dt);
      g.restore();
      return;
    }
    const camX = Math.round(S.cam.x), camY = Math.round(S.cam.y);
    const shakeX = S.shake > 0 ? Math.round((Math.random() - 0.5) * S.shake) : 0;
    const shakeY = S.shake > 0 ? Math.round((Math.random() - 0.5) * S.shake) : 0;
    drawBackdrop(g, camX, camY);
    g.save();
    g.translate(-camX + shakeX, -camY + shakeY);
    drawTiles(g);
    drawDecorations(g);
    drawObjects(g);
    drawPlayer(g);
    drawFront(g, camX);
    drawParticles(g);
    drawTexts(g);
    g.restore();
    drawHud(g);
    if (S.intro > 0) { drawIntro(g); }
    if (S.hintT > 0 && S.intro <= 0) { drawHint(g); }
    if (S.fade > 0) { g.globalAlpha = S.fade; g.fillStyle = '#080B14'; g.fillRect(0, 0, DA.W, DA.H); g.globalAlpha = 1; }
    g.restore();
  }
  function drawTitleBackdrop(g, dt) {
    const world = worldFor(1);
    S.titleScroll = (S.titleScroll || 0) + dt * 12;
    drawLayer(g, world.backdrop.far, S.titleScroll * 0.15, -8, 1024);
    drawLayer(g, world.backdrop.mid, S.titleScroll * 0.35, 26, 1024);
    drawLayer(g, world.backdrop.near, S.titleScroll * 0.6, 60, 1024);
    /* chão decorativo com tiles do mundo 1 */
    for (let x = 0; x < DA.W; x += TILE) {
      const v = Math.abs(Math.floor((x + S.titleScroll) / TILE)) % 4;
      g.drawImage(world.tiles.top[(v % 4)], x, DA.H - TILE * 2);
      g.drawImage(world.tiles.mid[v % 4], x, DA.H - TILE);
    }
  }
  function drawLayer(g, canvas, offset, y, width) {
    const off = ((offset % width) + width) % width;
    for (let x = -off; x < DA.W; x += width) { g.drawImage(canvas, Math.round(x), y); }
  }
  function drawBackdrop(g, camX, camY) {
    const world = S.world;
    g.fillStyle = world.theme.sky[0];
    g.fillRect(0, 0, DA.W, DA.H);
    drawLayer(g, world.backdrop.far, camX * 0.12, -Math.round(camY * 0.06) - 6, 1024);
    drawLayer(g, world.backdrop.mid, camX * 0.32, -Math.round(camY * 0.14) + 22, 1024);
    drawLayer(g, world.backdrop.near, camX * 0.55, -Math.round(camY * 0.24) + 54, 1024);
  }
  function drawTiles(g) {
    const L = S.level, T = S.world.theme, tiles = S.world.tiles;
    const x0 = Math.max(0, Math.floor(S.cam.x / TILE) - 1), x1 = Math.min(L.w - 1, Math.ceil((S.cam.x + DA.W) / TILE));
    const y0 = Math.max(0, Math.floor(S.cam.y / TILE) - 1), y1 = Math.min(L.h - 1, Math.ceil((S.cam.y + DA.H) / TILE));
    const wave = Math.floor(S.time / 0.26) % 3;
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const c = L.grid[gy][gx];
        if (!c) { continue; }
        const dx = gx * TILE, dy = gy * TILE;
        const v = (gx * 7 + gy * 13) % 4;
        if (DA.isSolidCode(c)) {
          let above = tileAt(gx, gy - 1);
          if (above === 0) { g.drawImage(tiles.top[v % tiles.top.length], dx, dy); }
          else {
            let openAir = false;
            for (let k = 1; k <= 3; k++) { if (tileAt(gx, gy - k) === 0) { openAir = true; break; } }
            g.drawImage(openAir ? tiles.mid[v % tiles.mid.length] : tiles.deep[v % tiles.deep.length], dx, dy);
          }
        } else if (DA.isWaterCode(c)) {
          const surface = !DA.isWaterCode(tileAt(gx, gy - 1));
          if (surface) { g.drawImage(tiles.water[wave][0], dx, dy); }
          else if (c === DA.CODES.DEEP) { g.drawImage(tiles.waterDeep[v % 2], dx, dy); }
          else {
            g.globalAlpha = 0.86;
            g.drawImage(tiles.waterDeep[(v + wave) % 2], dx, dy);
            g.globalAlpha = 1;
          }
        } else if (c === DA.CODES.SPIKE) {
          g.drawImage(tiles.spike, dx, dy);
        } else if (c === DA.CODES.CURRENT_R) {
          g.drawImage(tiles.currentR, dx, dy);
        } else if (c === DA.CODES.CURRENT_L) {
          g.drawImage(tiles.currentL, dx, dy);
        }
      }
    }
  }
  function drawDecorations(g) {
    const t = S.time;
    for (let i = 0; i < S.deco.length; i++) {
      const d = S.deco[i];
      if (d.x + d.art.width < S.cam.x - 20 || d.x > S.cam.x + DA.W + 20) { continue; }
      /* vegetação reage à passagem do pato */
      const near = Math.abs((d.x + d.art.width / 2) - (S.player.x + 6)) < 26;
      const sway = Math.round(Math.sin(t * (near ? 6 : 1.6) + d.sway) * (near ? 2 : 1));
      g.drawImage(d.art, Math.round(d.x + sway), Math.round(d.y - d.art.height));
    }
  }
  function drawFront(g, camX) {
    g.globalAlpha = 0.55;
    g.fillStyle = S.world.theme.mid2;
    for (let i = 0; i < S.front.length; i++) {
      const f = S.front[i];
      const sx = f.x + (camX - S.cam.x) * 0.06;
      if (sx < -30 || sx > DA.W + 30) { continue; }
      const yy = f.y + Math.round(Math.sin(S.time * 0.9 + f.x) * 2);
      Art.circ(g, Math.round(sx), yy, f.r, S.world.theme.mid2);
    }
    g.globalAlpha = 1;
  }
  function drawObjects(g) {
    const items = Art.items;
    /* bandeira de fim de fase: objetivo claramente identificado */
    g.drawImage(items.flag, Math.round(S.level.goal.x), Math.round(S.level.goal.y - items.flag.height));
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (o.type === 'platform') {
        if (o.gone) { continue; }
        const wood = o.wood;
        const art = wood ? S.world.tiles.slabWood[(o.x / TILE | 0) % 2] : S.world.tiles.slab[(o.x / TILE | 0) % 2];
        const shake = o.shake ? Math.round(Math.sin(S.time * 40) * 1) : 0;
        for (let x = 0; x < o.w; x += TILE) {
          g.drawImage(art, Math.round(o.x + x + shake), Math.round(o.y));
        }
        if (o.moving) {
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.fillRect(Math.round(o.x), Math.round(o.y) - 1, o.w, 1);
        }
      } else if (o.type === 'box') {
        if (o.secret && !o.reveal) { continue; }
        const art = o.open ? items.usedBox : (o.secret ? items.revealedBox : items.box[Math.floor(S.time * 3) % 4]);
        const bump = Math.round(o.bump * 3);
        const set = art.R || art;
        g.drawImage(set, Math.round(o.x), Math.round(o.y - bump));
      } else if (o.type === 'fruit') {
        if (o.taken) { continue; }
        const art = o.kind === 'apple' ? items.apple : items.pear;
        g.drawImage(art.R, Math.round(o.x), Math.round(o.y));
      } else if (o.type === 'hazard') {
        drawHazard(g, o);
      } else if (o.type === 'croc') {
        drawCroc(g, o);
      }
    }
  }
  function drawHazard(g, o) {
    const items = Art.items;
    if (o.kind === 'popSpikes') {
      const phase = o.state;
      const h = phase === 1 ? 10 : phase === 2 ? 5 : 0;
      if (phase === 0) {
        g.globalAlpha = 0.6;
        g.fillStyle = '#6E7480';
        g.fillRect(o.x, o.y + 14, 16, 2);
        g.globalAlpha = 1;
      }
      if (h > 0) {
        for (let i = 0; i < 3; i++) {
          const bx = o.x + i * 5 + 1;
          for (let k = 0; k < h; k++) {
            const w = Math.max(1, 5 - Math.floor(k / 2));
            g.fillStyle = k > h - 3 ? '#FFFFFF' : '#C8D0DC';
            g.fillRect(bx + Math.floor((5 - w) / 2), o.y + 16 - k, w, 1);
          }
        }
      }
    } else if (o.kind === 'plant') {
      const open = o.active;
      g.fillStyle = '#2E6B34';
      g.fillRect(o.x + 6, o.y + 6, 4, 10);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? '#3E8A44' : '#57A85A';
        g.fillRect(o.x + 2 + i * 2, o.y + (open ? 2 : 8), 3, 6);
      }
      g.fillStyle = '#E66278';
      g.fillRect(o.x + 6, o.y + (open ? 10 : 5), 3, 3);
    } else if (o.kind === 'rock') {
      if (o.state === 3) { return; }
      Art.circ(g, o.x + 7, o.y + 8, 7, S.world.theme.stone);
      Art.circ(g, o.x + 5, o.y + 6, 3, '#A8AEBA');
      if (o.state === 0) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(o.x + 4, o.y - 2, 6, 2); }
    } else if (o.kind === 'log') {
      if (o.state === 4) { return; }
      g.drawImage(S.world.tiles.slabWood[0], o.x, o.y + 4);
      g.fillStyle = S.world.theme.wood2;
      g.fillRect(o.x + 2, o.y + 4, 16, 9);
      g.fillStyle = S.world.theme.wood;
      g.fillRect(o.x + 2, o.y + 6, 16, 5);
      g.fillStyle = '#4A3418';
      g.fillRect(o.x + 4, o.y + 8, 12, 1);
    }
  }
  /* Devolve o conjunto (direita/esquerda) do quadro atual do jacaré. */
  function crocSet(o) {
    const c = Art.croc;
    if (o.state === 'ko') { return c.ko[0]; }
    if (o.state === 'fall') { return c.fall[0]; }
    if (o.state === 'alert') { return c.alert[0]; }
    if (o.state === 'idle') { return c.idle[Math.floor(S.time * 1.4) % 2]; }
    return c.walk[Math.floor(S.time * 7 + (o.x / 30)) % 4];
  }
  function drawCroc(g, o) {
    if (o.state === 'gone') { return; }
    const set = crocSet(o);
    const img = o.dir < 0 ? set.L : set.R;
    g.drawImage(img, Math.round(o.x), Math.round(o.y - 2));
  }
  function drawPlayer(g) {
    const p = S.player;
    const duck = Art.duck;
    /* piscar durante a invulnerabilidade */
    if (S.invuln > 0 && Math.floor(S.time * 14) % 2 === 0) { return; }
    let set;
    const leafOn = S.pearTimer > 0;
    if (p.dead || p.dying > 0) { set = duck.dead[0]; }
    else if (p.state === 'hurt') { set = duck.hurt[0]; }
    else if (p.cheer) { set = duck.cheer[Math.floor(S.time * 6) % 2]; }
    else if (p.inWater) { set = p.state === 'dive' ? duck.dive[0] : duck.swim[Math.floor(S.time * 4) % 3]; }
    else if (p.state === 'jump') { set = duck.jump[Math.floor(S.time * 8) % 2]; }
    else if (p.state === 'fall') { set = duck.fall[Math.floor(S.time * 6) % 2]; }
    else if (p.state === 'stomp') { set = duck.stomp[0]; }
    else if (p.state === 'run') { set = duck.run[Math.floor(p.anim * 4) % 4]; }
    else if (p.state === 'walk') { set = duck.walk[Math.floor(p.anim * 4) % 4]; }
    else { set = duck.idle[Math.floor(p.anim * 2) % 2]; }
    const img = p.face < 0 ? set.L : set.R;
    const bob = (p.state === 'idle' && !p.inWater) ? (Math.floor(S.time * 3) % 2) : 0;
    g.drawImage(img, Math.round(p.x - 5), Math.round(p.y - 6 + bob));
    /* folha verde do poder da pera, sempre visível sobre a cabeça */
    if (leafOn) {
      const leaf = duck.leaf[Math.floor(S.time * 6) % 4];
      const limg = p.face < 0 ? leaf.L : leaf.R;
      g.drawImage(limg, Math.round(p.x - 5), Math.round(p.y - 6 + bob));
    }
    /* aura pixelada indicando velocidade */
    if (S.appleTimer > 0 && Math.floor(S.time * 10) % 3 === 0) {
      g.globalAlpha = 0.5;
      g.fillStyle = '#FFF0A0';
      g.fillRect(Math.round(p.x - p.face * 6), Math.round(p.y + 2), 2, 2);
      g.fillRect(Math.round(p.x - p.face * 9), Math.round(p.y + 7), 2, 1);
      g.globalAlpha = 1;
    }
  }
  function drawParticles(g) {
    const art = Art.particles;
    for (let i = 0; i < S.particles.length; i++) {
      const q = S.particles[i];
      const img = art[q.kind] || art.dust;
      g.globalAlpha = 1 - q.t / q.life;
      g.drawImage(img, Math.round(q.x), Math.round(q.y));
      g.globalAlpha = 1;
    }
  }
  function drawTexts(g) {
    for (let i = 0; i < S.texts.length; i++) {
      const t = S.texts[i];
      g.globalAlpha = 1 - t.t / t.life;
      Art.text(g, t.str, Math.round(t.x - Art.textWidth(t.str, 1) / 2), Math.round(t.y), 1, t.color);
      g.globalAlpha = 1;
    }
  }

  /* ---------- HUD ---------- */
  function drawHeart(g, x, y, color) {
    g.fillStyle = color;
    g.fillRect(x + 1, y, 2, 1); g.fillRect(x + 4, y, 2, 1);
    g.fillRect(x, y + 1, 7, 3);
    g.fillRect(x + 1, y + 4, 5, 1);
    g.fillRect(x + 2, y + 5, 3, 1);
    g.fillRect(x + 3, y + 6, 1, 1);
  }
  function drawHud(g) {
    if (!S.level) { return; }
    const p = S.player;
    g.fillStyle = 'rgba(6,10,20,.55)';
    g.fillRect(0, 0, DA.W, 20);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(0, 20, DA.W, 1);
    for (let i = 0; i < 3; i++) {
      drawHeart(g, 5 + i * 10, 3, i < S.lives ? '#FF6B7A' : 'rgba(255,255,255,.22)');
    }
    /* progresso da fase */
    const prog = DA.clamp((p.x / Math.max(1, S.level.pixelW - TILE)) * 100, 0, 100);
    g.fillStyle = 'rgba(255,255,255,.2)';
    g.fillRect(96, 6, 96, 5);
    g.fillStyle = '#7BE0A0';
    g.fillRect(96, 6, Math.round(96 * prog / 100), 5);
    Art.textCenter(g, levelName(S.levelIndex), 144, 13, 1, 'rgba(255,255,255,.75)');
    /* pontos e frutas */
    Art.text(g, 'PONTOS ' + S.levelScore, DA.W - 4 - Art.textWidth('PONTOS ' + S.levelScore, 1), 4, 1, '#FFFFFF');
    g.drawImage(Art.items.apple.R, DA.W - 16, 12);
    Art.text(g, 'X' + S.fruits, DA.W - 24 - Art.textWidth('X' + S.fruits, 1), 12, 1, '#FFD84A');
    /* poderes ativos */
    let y = 30;
    if (S.appleTimer > 0) {
      g.drawImage(Art.items.apple.R, 5, y);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(15, y + 1, 40, 3);
      g.fillStyle = '#FF9E9E'; g.fillRect(15, y + 1, Math.round(40 * (S.appleTimer / POWER_TIME)), 3);
      y += 12;
    }
    if (S.pearTimer > 0) {
      g.drawImage(Art.items.pear.R, 5, y);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(15, y + 1, 40, 3);
      g.fillStyle = '#C9E07A'; g.fillRect(15, y + 1, Math.round(40 * (S.pearTimer / POWER_TIME)), 3);
    }
  }
  function drawIntro(g) {
    const a = Math.min(1, S.intro * 1.4);
    g.globalAlpha = a;
    g.fillStyle = 'rgba(6,10,20,.7)';
    g.fillRect(0, 66, DA.W, 44);
    Art.textCenter(g, 'MUNDO ' + DA.LEVEL_SPECS[S.levelIndex].world + ' · ' + S.world.theme.name, DA.W / 2, 74, 1, '#8FD3F4');
    Art.textCenter(g, levelName(S.levelIndex), DA.W / 2, 86, 2, '#FFFFFF');
    g.globalAlpha = 1;
  }
  function drawHint(g) {
    const a = Math.min(1, S.hintT);
    g.globalAlpha = a * 0.9;
    Art.textCenter(g, S.level.spec.hint || '', DA.W / 2, DA.H - 14, 1, '#FFFFFF');
    g.globalAlpha = 1;
  }

  DA.Game._state = S;
})(window.DA);
