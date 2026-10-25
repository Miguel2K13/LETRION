/* =============================================================
   DUCK ADVENTURE — núcleo
   Utilitários, entrada (teclado + toque) e áudio (WebAudio).
   Sem dependências externas; todos os módulos vivem em window.DA.
   ============================================================= */
window.DA = window.DA || {};
(function (DA) {
  'use strict';

  /* ---------- constantes ---------- */
  DA.W = 320;              // resolução interna (pixel art)
  DA.H = 180;
  DA.TILE = 16;
  DA.STEP = 1 / 60;        // passo fixo de simulação (não depende da tela)

  /* ---------- matemática ---------- */
  DA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  DA.lerp = function (a, b, t) { return a + (b - a) * t; };
  DA.approach = function (v, target, delta) {
    return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
  };
  DA.sign = function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; };
  DA.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };
  DA.pointIn = function (px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  };
  /* Gerador determinístico: garante o mesmo cenário em toda tentativa. */
  DA.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  DA.pick = function (rng, list) { return list[Math.floor(rng() * list.length) % list.length]; };

  /* ---------- entrada ---------- */
  DA.Input = {
    left: false, right: false, jump: false, dive: false,
    jumpPressed: false, divePressed: false,
    enabled: false,
    _onKey: null,

    reset: function () {
      this.left = this.right = this.jump = this.dive = false;
      this.jumpPressed = this.divePressed = false;
    },
    /* Os botões de toque chamam set() ao pressionar e soltar. */
    set: function (name, down) {
      if (!this.enabled) { return; }
      if (name === 'jump') {
        if (down && !this.jump) { this.jumpPressed = true; }
        this.jump = down;
      } else if (name === 'dive') {
        if (down && !this.dive) { this.divePressed = true; }
        this.dive = down;
      } else if (name in this) {
        this[name] = down;
      }
    },
    /* Consome os comandos de borda (usados para pulo, mergulho e pausa). */
    consume: function () {
      const out = { jump: this.jumpPressed, dive: this.divePressed };
      this.jumpPressed = false;
      this.divePressed = false;
      return out;
    },

    attach: function () {
      const self = this;
      this.enabled = true;
      this._onKey = function (e, down) {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { self.set('left', down); }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { self.set('right', down); }
        else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { self.set('jump', down); }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') { self.set('dive', down); }
        else { return; }
        e.preventDefault();
      };
      window.addEventListener('keydown', function (e) { self._onKey(e, true); }, { passive: false });
      window.addEventListener('keyup', function (e) { self._onKey(e, false); }, { passive: false });
    },
    detach: function () {
      this.enabled = false;
      this.reset();
      this._onKey = null;
    }
  };

  /* ---------- áudio procedural ---------- */
  DA.Audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    muted: false, volume: 0.7,
    _track: null, _step: 0, _next: 0, _timer: null,

    init: function () {
      if (this.ctx) { return this.ctx; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { return null; }
      try {
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.85;
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.master);
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    resume: function () {
      const ctx = this.init();
      if (ctx && ctx.state === 'suspended') { ctx.resume().catch(function () { }); }
    },
    applySettings: function (muted, volume) {
      this.muted = !!muted;
      if (typeof volume === 'number') { this.volume = DA.clamp(volume, 0, 1); }
      if (this.master) { this.master.gain.value = this.muted ? 0 : this.volume; }
    },
    stopAll: function () {
      this.stopMusic();
      if (this.ctx && this.ctx.state === 'running') { this.ctx.suspend().catch(function () { }); }
    },

    _freq: function (midi) { return 440 * Math.pow(2, (midi - 69) / 12); },

    tone: function (freq, dur, type, vol, slide, to) {
      const ctx = this.init();
      if (!ctx || this.muted) { return; }
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slide) { osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur); }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol == null ? 0.18 : vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(to || this.sfxGain);
      osc.start(t); osc.stop(t + dur + 0.02);
    },
    noise: function (dur, vol, freq, sweep) {
      const ctx = this.init();
      if (!ctx || this.muted) { return; }
      const t = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq || 900, t);
      if (sweep) { filter.frequency.linearRampToValueAtTime(Math.max(80, (freq || 900) + sweep), t + dur); }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol == null ? 0.2 : vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
      src.start(t); src.stop(t + dur);
    },

    sfx: function (name) {
      switch (name) {
        case 'jump': this.tone(360, 0.16, 'square', 0.16, 320); break;
        case 'jumpBig': this.tone(300, 0.22, 'square', 0.18, 520); break;
        case 'land': this.noise(0.09, 0.12, 500, -300); break;
        case 'box': this.tone(660, 0.09, 'triangle', 0.2, 240); this.noise(0.06, 0.1, 1800); break;
        case 'apple': this.tone(700, 0.09, 'square', 0.16, 0); this.tone(980, 0.14, 'square', 0.14, 120); break;
        case 'pear': [660, 880, 1180].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.15), i * 70)); break;
        case 'power': this.tone(520, 0.3, 'triangle', 0.14, 420); break;
        case 'powerEnd': this.tone(520, 0.25, 'triangle', 0.12, -280); break;
        case 'splash': this.noise(0.28, 0.22, 1400, -1100); break;
        case 'swim': this.noise(0.12, 0.09, 700, -300); break;
        case 'bubble': this.tone(880, 0.06, 'sine', 0.09, 260); break;
        case 'stomp': this.noise(0.14, 0.2, 700, -450); this.tone(180, 0.12, 'square', 0.16, -70); break;
        case 'hurt': this.tone(300, 0.3, 'sawtooth', 0.16, -190); break;
        case 'death': [523, 440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'square', 0.15), i * 130)); break;
        case 'complete': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.26, 'triangle', 0.16), i * 120)); break;
        case 'click': this.tone(600, 0.05, 'square', 0.12, 160); break;
        case 'rock': this.noise(0.22, 0.18, 420, -260); break;
        case 'log': this.noise(0.3, 0.14, 300, 200); break;
      }
    },

    /* Sequenciador simples: melodia + baixo por mundo. */
    playMusic: function (track) {
      const ctx = this.init();
      if (!ctx || !track) { return; }
      if (this._track === track) { return; }
      this.stopMusic();
      this.resume();
      this._track = track;
      this._step = 0;
      this._next = ctx.currentTime + 0.08;
      const self = this;
      this._timer = setInterval(function () { self._schedule(); }, 90);
    },
    _schedule: function () {
      const ctx = this.ctx, track = this._track;
      if (!ctx || !track || !this._timer) { return; }
      const spb = 60 / (track.bpm || 108) / 2;   // colcheias
      while (this._next < ctx.currentTime + 0.35) {
        const i = this._step % Math.max(1, track.lead.length);
        const lead = track.lead[i], bass = track.bass[i % track.bass.length];
        if (lead > 0) { this._note(lead, spb * 0.9, 'square', 0.12); }
        if (bass > 0) { this._note(bass, spb * 1.7, 'triangle', 0.18); }
        if (i % 4 === 0) { this._perc(); }
        this._step++;
        this._next += spb;
      }
    },
    _note: function (midi, dur, type, vol) {
      const ctx = this.ctx;
      if (!ctx || this.muted) { return; }
      const t = this._next;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(this._freq(midi), t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(this.musicGain);
      osc.start(t); osc.stop(t + dur + 0.03);
    },
    _perc: function () {
      const ctx = this.ctx;
      if (!ctx || this.muted) { return; }
      const t = this._next;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain); gain.connect(this.musicGain);
      osc.start(t); osc.stop(t + 0.12);
    },
    stopMusic: function () {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      this._track = null;
    }
  };
})(window.DA);
