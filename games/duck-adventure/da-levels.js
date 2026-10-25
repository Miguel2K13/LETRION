/* =============================================================
   DUCK ADVENTURE — fases e progressão
   Cinco mundos, duas fases cada, descritas de forma declarativa:
   o construtor transforma a descrição em grade de colisão + objetos.
   ============================================================= */
(function (DA) {
  'use strict';

  /* Códigos da grade de colisão. */
  const SOLID = 1, PLATFORM = 5, WATER = 3, DEEP = 8, SPIKE = 4, WOOD = 6, ICE = 7;

  /* ---------- trilhas sonoras por mundo ---------- */
  const MUSIC = {
    1: { bpm: 112, lead: [72, 0, 76, 79, 0, 76, 72, 0, 74, 0, 77, 81, 0, 79, 76, 0], bass: [48, 0, 0, 0, 55, 0, 0, 0, 50, 0, 0, 0, 55, 0, 0, 0] },
    2: { bpm: 96, lead: [69, 0, 72, 76, 0, 72, 69, 0, 67, 0, 71, 74, 0, 71, 67, 0], bass: [45, 0, 0, 0, 52, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0] },
    3: { bpm: 84, lead: [62, 0, 0, 65, 0, 0, 69, 0, 0, 67, 0, 0, 62, 0, 0, 0], bass: [38, 0, 0, 0, 0, 0, 41, 0, 36, 0, 0, 0, 0, 0, 43, 0] },
    4: { bpm: 124, lead: [67, 71, 74, 79, 0, 74, 71, 67, 69, 72, 76, 81, 0, 76, 72, 69], bass: [43, 0, 50, 0, 48, 0, 55, 0, 43, 0, 50, 0, 45, 0, 52, 0] },
    5: { bpm: 104, lead: [64, 0, 67, 71, 0, 67, 64, 0, 62, 0, 66, 69, 0, 71, 67, 0], bass: [40, 0, 0, 0, 47, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0] }
  };

  /* ---------- descrição das fases ---------- */
  const H = 16;
  const LEVELS = [
    /* ---------- MUNDO 1 — FLORESTA VERDE ---------- */
    {
      theme: 1, world: 1, name: 'BOSQUE CLARO', w: 124, ground: 13,
      ground_spans: [[0, 28], [32, 22], [58, 20], [82, 42]],
      platforms: [
        { x: 12, y: 10, len: 4, kind: 'grass' }, { x: 20, y: 8, len: 3, kind: 'grass' },
        { x: 36, y: 10, len: 3, kind: 'grass' }, { x: 46, y: 9, len: 4, kind: 'grass' },
        { x: 64, y: 10, len: 3, kind: 'wood' }, { x: 72, y: 9, len: 3, kind: 'grass' },
        { x: 92, y: 10, len: 4, kind: 'grass' }, { x: 104, y: 9, len: 3, kind: 'grass' }
      ],
      water: [{ x: 30, y: 14, w: 4, h: 2 }, { x: 56, y: 14, w: 4, h: 2 }],
      boxes: [{ x: 10, y: 9 }, { x: 19, y: 7, secret: true }, { x: 40, y: 9 }, { x: 49, y: 8 }, { x: 70, y: 8 }, { x: 95, y: 9 }],
      fruits: [{ type: 'pear', x: 20, y: 6 }],
      hazards: [{ type: 'spikes', x: 43, y: 12 }, { type: 'popSpikes', x: 88, y: 12 }, { type: 'plant', x: 66, y: 12 }],
      crocs: [{ x: 24, y: 12, patrol: [20, 28] }, { x: 76, y: 12, patrol: [62, 80] }],
      start: { x: 2, y: 11 }, goal: { x: 120, y: 12 },
      hint: 'ANDAR · PULAR · ACERTAR A CAIXA POR BAIXO'
    },
    {
      theme: 1, world: 1, name: 'TRILHA DO LAGO', w: 138, ground: 13,
      ground_spans: [[0, 18], [24, 14], [44, 10], [60, 16], [82, 12], [100, 38]],
      platforms: [
        { x: 18, y: 10, len: 3, kind: 'grass' }, { x: 21, y: 8, len: 3, kind: 'grass' },
        { x: 38, y: 10, len: 4, kind: 'wood' }, { x: 54, y: 9, len: 3, kind: 'grass' },
        { x: 76, y: 8, len: 4, kind: 'grass' }, { x: 94, y: 9, len: 3, kind: 'grass' },
        { x: 106, y: 10, len: 4, kind: 'grass' }, { x: 118, y: 8, len: 3, kind: 'grass' }
      ],
      water: [{ x: 24, y: 14, w: 20, h: 2 }, { x: 60, y: 14, w: 22, h: 2 }, { x: 94, y: 14, w: 6, h: 2 }],
      boxes: [{ x: 8, y: 9 }, { x: 42, y: 9 }, { x: 62, y: 11 }, { x: 79, y: 7 }, { x: 109, y: 9 }, { x: 121, y: 7, secret: true }],
      fruits: [{ type: 'apple', x: 38, y: 7 }],
      hazards: [{ type: 'spikes', x: 52, y: 12 }, { type: 'plant', x: 88, y: 12 }, { type: 'popSpikes', x: 112, y: 12 }],
      crocs: [{ x: 30, y: 12, patrol: [24, 38], chase: 1 }, { x: 68, y: 12, patrol: [62, 76] }, { x: 110, y: 12, patrol: [100, 118], chase: 1 }],
      start: { x: 2, y: 11 }, goal: { x: 134, y: 12 },
      hint: 'NADAR · MERGULHAR · ATERRISSAR NA CABECA DO JACARE'
    },
    /* ---------- MUNDO 2 — PANTANO PIXELADO ---------- */
    {
      theme: 2, world: 2, name: 'AGUAS LENTAS', w: 132, ground: 13,
      ground_spans: [[0, 12], [20, 8], [34, 10], [52, 8], [66, 12], [86, 10], [104, 28]],
      platforms: [
        { x: 12, y: 11, len: 3, kind: 'wood' }, { x: 16, y: 9, len: 3, kind: 'wood' },
        { x: 28, y: 10, len: 3, kind: 'wood' }, { x: 44, y: 9, len: 4, kind: 'wood' },
        { x: 60, y: 10, len: 3, kind: 'grass' }, { x: 78, y: 9, len: 4, kind: 'wood' },
        { x: 96, y: 10, len: 3, kind: 'grass' }, { x: 112, y: 9, len: 3, kind: 'wood' }
      ],
      water: [{ x: 12, y: 14, w: 8, h: 2 }, { x: 28, y: 14, w: 6, h: 2 }, { x: 44, y: 14, w: 8, h: 2 }, { x: 62, y: 14, w: 4, h: 2 }, { x: 78, y: 13, w: 8, h: 3 }, { x: 96, y: 13, w: 8, h: 3 }],
      currents: [{ x: 78, y: 13, w: 8, h: 3, dir: 'right' }, { x: 96, y: 13, w: 8, h: 3, dir: 'left' }],
      boxes: [{ x: 6, y: 9 }, { x: 22, y: 9 }, { x: 36, y: 9, secret: true }, { x: 46, y: 7 }, { x: 68, y: 10 }, { x: 89, y: 9 }, { x: 116, y: 8 }],
      fruits: [{ type: 'pear', x: 28, y: 8 }, { type: 'apple', x: 96, y: 8 }],
      hazards: [{ type: 'spikes', x: 24, y: 12 }, { type: 'plant', x: 56, y: 12 }, { type: 'popSpikes', x: 70, y: 12 }, { type: 'plant', x: 108, y: 12 }],
      crocs: [{ x: 16, y: 12, patrol: [12, 20] }, { x: 40, y: 12, patrol: [34, 44], chase: 1 }, { x: 84, y: 12, patrol: [74, 92], chase: 1 }, { x: 110, y: 12, patrol: [104, 122] }],
      start: { x: 2, y: 11 }, goal: { x: 128, y: 12 },
      hint: 'CORRENTES EMPURRAM · USE A PERA PARA SALTAR MAIS ALTO'
    },
    {
      theme: 2, world: 2, name: 'PONTE QUEBRADA', w: 140, ground: 13,
      ground_spans: [[0, 14], [30, 8], [46, 6], [60, 8], [78, 8], [96, 10], [112, 28]],
      platforms: [
        { x: 14, y: 11, len: 4, kind: 'crumbling' }, { x: 20, y: 10, len: 4, kind: 'crumbling' },
        { x: 26, y: 9, len: 4, kind: 'wood' }, { x: 38, y: 10, len: 3, kind: 'movingH', range: 4, speed: 22 },
        { x: 52, y: 9, len: 3, kind: 'wood' }, { x: 68, y: 10, len: 4, kind: 'crumbling' },
        { x: 86, y: 9, len: 3, kind: 'movingV', range: 3, speed: 18 }, { x: 104, y: 10, len: 3, kind: 'grass' },
        { x: 124, y: 9, len: 3, kind: 'movingH', range: 5, speed: 26 }
      ],
      water: [{ x: 14, y: 14, w: 30, h: 2 }, { x: 60, y: 14, w: 18, h: 2 }, { x: 96, y: 14, w: 16, h: 2 }],
      currents: [{ x: 60, y: 14, w: 18, h: 2, dir: 'left' }],
      boxes: [{ x: 8, y: 9 }, { x: 32, y: 9 }, { x: 50, y: 8 }, { x: 64, y: 10, secret: true }, { x: 82, y: 10 }, { x: 102, y: 8 }, { x: 130, y: 8 }],
      fruits: [{ type: 'apple', x: 32, y: 7 }, { type: 'pear', x: 104, y: 7 }],
      hazards: [{ type: 'spikes', x: 42, y: 12 }, { type: 'rock', x: 74, y: 4 }, { type: 'plant', x: 100, y: 12 }, { type: 'rock', x: 120, y: 3 }],
      crocs: [{ x: 34, y: 12, patrol: [30, 38], chase: 1 }, { x: 52, y: 12, patrol: [46, 52] }, { x: 64, y: 12, patrol: [60, 68], chase: 1 }, { x: 84, y: 12, patrol: [78, 86], chase: 1 }, { x: 120, y: 12, patrol: [112, 132] }],
      start: { x: 2, y: 11 }, goal: { x: 136, y: 12 },
      hint: 'PLATAFORMAS QUE DESMORONAM · PEDRAS QUE CAEM'
    },
    /* ---------- MUNDO 3 — CAVERNAS SUBTERRÂNEAS ---------- */
    {
      theme: 3, world: 3, name: 'GALERIA DE CRISTAIS', w: 132, ground: 13,
      ground_spans: [[0, 24], [30, 16], [52, 12], [70, 14], [90, 42]],
      platforms: [
        { x: 24, y: 11, len: 3, kind: 'grass' }, { x: 46, y: 10, len: 3, kind: 'wood' },
        { x: 64, y: 10, len: 3, kind: 'grass' }, { x: 84, y: 11, len: 3, kind: 'grass' },
        { x: 100, y: 9, len: 4, kind: 'wood' }, { x: 112, y: 10, len: 3, kind: 'grass' }
      ],
      blocks: [{ x: 0, y: 0, w: 4, h: 10 }, { x: 128, y: 0, w: 4, h: 13 }, { x: 56, y: 0, w: 6, h: 8 }, { x: 62, y: 0, w: 2, h: 6 }],
      water: [{ x: 30, y: 14, w: 16, h: 2 }, { x: 52, y: 14, w: 12, h: 2 }],
      boxes: [{ x: 10, y: 10 }, { x: 26, y: 9 }, { x: 48, y: 8, secret: true }, { x: 66, y: 9 }, { x: 96, y: 9 }, { x: 118, y: 8 }],
      fruits: [{ type: 'pear', x: 46, y: 7 }, { type: 'apple', x: 112, y: 7 }],
      hazards: [{ type: 'spikes', x: 36, y: 12 }, { type: 'spikes', x: 38, y: 12 }, { type: 'popSpikes', x: 74, y: 12 }, { type: 'rock', x: 58, y: 6 }, { type: 'rock', x: 104, y: 5 }, { type: 'plant', x: 94, y: 12 }],
      crocs: [{ x: 20, y: 12, patrol: [14, 24] }, { x: 62, y: 12, patrol: [56, 68], chase: 1 }, { x: 86, y: 12, patrol: [80, 90], chase: 1 }, { x: 116, y: 12, patrol: [108, 126] }],
      start: { x: 5, y: 11 }, goal: { x: 126, y: 12 },
      hint: 'NAO TOQUE NOS ESPINHOS · CUIDADO COM AS PEDRAS'
    },
    {
      theme: 3, world: 3, name: 'LAGO SUBTERRANEO', w: 138, ground: 13,
      ground_spans: [[0, 16], [40, 10], [66, 8], [92, 10], [116, 22]],
      platforms: [
        { x: 16, y: 11, len: 3, kind: 'grass' }, { x: 22, y: 10, len: 3, kind: 'grass' },
        { x: 34, y: 11, len: 4, kind: 'wood' }, { x: 50, y: 10, len: 4, kind: 'wood' },
        { x: 58, y: 9, len: 3, kind: 'movingV', range: 3, speed: 16 },
        { x: 74, y: 10, len: 3, kind: 'grass' }, { x: 82, y: 9, len: 3, kind: 'wood' },
        { x: 102, y: 10, len: 4, kind: 'crumbling' }, { x: 110, y: 9, len: 3, kind: 'grass' }
      ],
      blocks: [{ x: 0, y: 0, w: 3, h: 12 }, { x: 135, y: 0, w: 3, h: 13 }],
      water: [{ x: 16, y: 13, w: 24, h: 3 }, { x: 50, y: 14, w: 16, h: 2 }, { x: 76, y: 13, w: 16, h: 3 }, { x: 102, y: 14, w: 14, h: 2 }],
      currents: [{ x: 16, y: 13, w: 24, h: 3, dir: 'right' }, { x: 102, y: 14, w: 14, h: 2, dir: 'right' }],
      boxes: [{ x: 8, y: 10 }, { x: 30, y: 9 }, { x: 44, y: 8 }, { x: 70, y: 9, secret: true }, { x: 88, y: 8 }, { x: 120, y: 9 }, { x: 128, y: 8 }],
      fruits: [{ type: 'pear', x: 58, y: 7 }],
      hazards: [{ type: 'spikes', x: 44, y: 12 }, { type: 'popSpikes', x: 78, y: 12 }, { type: 'plant', x: 96, y: 12 }, { type: 'rock', x: 92, y: 5 }, { type: 'spikes', x: 122, y: 12 }],
      crocs: [{ x: 22, y: 11, patrol: [16, 34], chase: 1 }, { x: 54, y: 12, patrol: [40, 50], chase: 1 }, { x: 78, y: 11, patrol: [66, 74], chase: 1 }, { x: 112, y: 12, patrol: [104, 116], chase: 1 }, { x: 126, y: 12, patrol: [118, 134], chase: 1 }],
      start: { x: 2, y: 11 }, goal: { x: 134, y: 12 },
      hint: 'MERGULHE · VOLTE A SUBIR · ATERRISSE NA CABECA'
    },
    /* ---------- MUNDO 4 — MONTANHAS SELVAGENS ---------- */
    {
      theme: 4, world: 4, name: 'PICOS DO VENTO', w: 140, ground: 14,
      ground_spans: [[0, 14], [30, 8], [52, 8], [74, 8], [98, 8], [118, 22]],
      platforms: [
        { x: 14, y: 11, len: 4, kind: 'grass' }, { x: 22, y: 9, len: 3, kind: 'movingH', range: 4, speed: 24 },
        { x: 38, y: 11, len: 4, kind: 'wood' }, { x: 44, y: 9, len: 3, kind: 'grass' },
        { x: 60, y: 11, len: 4, kind: 'wood' }, { x: 66, y: 9, len: 3, kind: 'movingV', range: 4, speed: 20 },
        { x: 82, y: 11, len: 4, kind: 'wood' }, { x: 88, y: 9, len: 4, kind: 'grass' },
        { x: 106, y: 11, len: 3, kind: 'crumbling' }, { x: 112, y: 10, len: 3, kind: 'wood' },
        { x: 126, y: 9, len: 4, kind: 'grass' }
      ],
      blocks: [{ x: 0, y: 0, w: 3, h: 6 }, { x: 137, y: 0, w: 3, h: 14 }],
      water: [{ x: 14, y: 15, w: 16, h: 1 }, { x: 52, y: 15, w: 22, h: 1 }, { x: 98, y: 15, w: 20, h: 1 }],
      boxes: [{ x: 8, y: 10 }, { x: 34, y: 10 }, { x: 46, y: 8, secret: true }, { x: 62, y: 10 }, { x: 90, y: 8 }, { x: 108, y: 9 }, { x: 130, y: 8 }],
      fruits: [{ type: 'apple', x: 22, y: 7 }, { type: 'pear', x: 126, y: 7 }],
      hazards: [{ type: 'log', x: 40, y: 10 }, { type: 'spikes', x: 58, y: 13 }, { type: 'rock', x: 80, y: 4 }, { type: 'log', x: 104, y: 9 }, { type: 'popSpikes', x: 122, y: 13 }],
      crocs: [{ x: 20, y: 13, patrol: [14, 30], chase: 1 }, { x: 66, y: 13, patrol: [52, 60] }, { x: 100, y: 13, patrol: [98, 118], chase: 1 }, { x: 128, y: 13, patrol: [118, 136], chase: 1 }],
      start: { x: 2, y: 12 }, goal: { x: 135, y: 13 },
      hint: 'TRONCOS QUE ROLAM · ABISMOS · CAMINHOS ALTERNATIVOS'
    },
    {
      theme: 4, world: 4, name: 'PONTE DO ABISMO', w: 148, ground: 14,
      ground_spans: [[0, 12], [36, 6], [60, 6], [84, 6], [108, 6], [130, 18]],
      platforms: [
        { x: 12, y: 12, len: 4, kind: 'wood' }, { x: 18, y: 11, len: 4, kind: 'wood' },
        { x: 24, y: 10, len: 3, kind: 'movingH', range: 6, speed: 30 },
        { x: 42, y: 11, len: 4, kind: 'crumbling' }, { x: 48, y: 10, len: 3, kind: 'wood' },
        { x: 54, y: 9, len: 3, kind: 'movingV', range: 4, speed: 22 },
        { x: 66, y: 11, len: 4, kind: 'wood' }, { x: 72, y: 10, len: 3, kind: 'wood' }, { x: 78, y: 9, len: 3, kind: 'crumbling' },
        { x: 90, y: 11, len: 4, kind: 'movingH', range: 8, speed: 34 },
        { x: 114, y: 11, len: 4, kind: 'wood' }, { x: 120, y: 10, len: 3, kind: 'crumbling' }, { x: 126, y: 9, len: 4, kind: 'grass' },
        { x: 138, y: 10, len: 4, kind: 'wood' }
      ],
      blocks: [{ x: 145, y: 0, w: 3, h: 14 }],
      water: [{ x: 12, y: 15, w: 24, h: 1 }, { x: 60, y: 15, w: 24, h: 1 }, { x: 108, y: 15, w: 22, h: 1 }],
      boxes: [{ x: 6, y: 11 }, { x: 38, y: 10 }, { x: 62, y: 10, secret: true }, { x: 86, y: 10 }, { x: 100, y: 9 }, { x: 132, y: 10 }, { x: 140, y: 9 }],
      fruits: [{ type: 'apple', x: 54, y: 7 }, { type: 'pear', x: 126, y: 7 }],
      hazards: [{ type: 'rock', x: 30, y: 5 }, { type: 'log', x: 44, y: 10 }, { type: 'rock', x: 70, y: 4 }, { type: 'rock', x: 96, y: 5 }, { type: 'log', x: 112, y: 10 }, { type: 'spikes', x: 136, y: 13 }],
      crocs: [{ x: 16, y: 13, patrol: [12, 22], chase: 1 }, { x: 40, y: 13, patrol: [36, 42] }, { x: 66, y: 13, patrol: [60, 66], chase: 1 }, { x: 90, y: 13, patrol: [84, 90], chase: 1 }, { x: 112, y: 13, patrol: [108, 114], chase: 1 }, { x: 140, y: 13, patrol: [130, 146], chase: 1 }],
      start: { x: 2, y: 12 }, goal: { x: 143, y: 13 },
      hint: 'PLATAFORMAS MOVEIS SOBRE O ABISMO'
    },
    /* ---------- MUNDO 5 — PÂNTANO DOS JACARÉS ---------- */
    {
      theme: 5, world: 5, name: 'NINHO DOS JACARES', w: 144, ground: 13,
      ground_spans: [[0, 20], [28, 10], [44, 12], [64, 8], [80, 14], [102, 10], [120, 24]],
      platforms: [
        { x: 20, y: 11, len: 3, kind: 'wood' }, { x: 38, y: 10, len: 3, kind: 'movingH', range: 4, speed: 26 },
        { x: 56, y: 11, len: 4, kind: 'crumbling' }, { x: 72, y: 10, len: 3, kind: 'wood' },
        { x: 94, y: 10, len: 3, kind: 'movingV', range: 4, speed: 22 }, { x: 112, y: 10, len: 4, kind: 'wood' },
        { x: 130, y: 9, len: 3, kind: 'grass' }
      ],
      blocks: [{ x: 141, y: 0, w: 3, h: 13 }],
      water: [{ x: 20, y: 14, w: 8, h: 2 }, { x: 38, y: 14, w: 6, h: 2 }, { x: 56, y: 13, w: 8, h: 3 }, { x: 72, y: 14, w: 8, h: 2 }, { x: 94, y: 13, w: 8, h: 3 }, { x: 112, y: 14, w: 8, h: 2 }],
      currents: [{ x: 56, y: 13, w: 8, h: 3, dir: 'left' }, { x: 94, y: 13, w: 8, h: 3, dir: 'right' }],
      boxes: [{ x: 8, y: 10 }, { x: 34, y: 10 }, { x: 48, y: 10 }, { x: 68, y: 9, secret: true }, { x: 84, y: 10 }, { x: 106, y: 9 }, { x: 126, y: 8 }],
      fruits: [{ type: 'apple', x: 38, y: 8 }, { type: 'pear', x: 94, y: 8 }],
      hazards: [{ type: 'plant', x: 16, y: 12 }, { type: 'popSpikes', x: 32, y: 12 }, { type: 'spikes', x: 50, y: 12 }, { type: 'plant', x: 66, y: 12 }, { type: 'rock', x: 88, y: 5 }, { type: 'log', x: 108, y: 9 }, { type: 'popSpikes', x: 124, y: 12 }, { type: 'spikes', x: 134, y: 12 }],
      crocs: [{ x: 14, y: 12, patrol: [8, 20], chase: 1 }, { x: 32, y: 12, patrol: [28, 38], chase: 1 }, { x: 48, y: 12, patrol: [44, 56], chase: 1 }, { x: 68, y: 12, patrol: [64, 72], chase: 1 }, { x: 88, y: 12, patrol: [80, 94], chase: 1 }, { x: 106, y: 12, patrol: [102, 112], chase: 1 }, { x: 128, y: 12, patrol: [120, 138], chase: 1 }],
      start: { x: 2, y: 11 }, goal: { x: 139, y: 12 },
      hint: 'MUITOS JACARES · USE OS PODERES DAS FRUTAS'
    },
    {
      theme: 5, world: 5, name: 'FASE FINAL — REI DO PANTANO', w: 152, ground: 13,
      ground_spans: [[0, 16], [26, 8], [42, 8], [58, 6], [72, 10], [90, 8], [106, 10], [124, 28]],
      platforms: [
        { x: 16, y: 11, len: 4, kind: 'wood' }, { x: 22, y: 10, len: 3, kind: 'movingH', range: 6, speed: 30 },
        { x: 34, y: 11, len: 4, kind: 'crumbling' }, { x: 50, y: 10, len: 4, kind: 'wood' },
        { x: 56, y: 9, len: 3, kind: 'movingV', range: 5, speed: 26 },
        { x: 64, y: 10, len: 4, kind: 'crumbling' }, { x: 82, y: 11, len: 4, kind: 'wood' },
        { x: 88, y: 9, len: 3, kind: 'movingV', range: 5, speed: 28 },
        { x: 98, y: 10, len: 4, kind: 'crumbling' }, { x: 116, y: 10, len: 4, kind: 'wood' },
        { x: 132, y: 9, len: 4, kind: 'movingH', range: 8, speed: 34 }, { x: 142, y: 10, len: 4, kind: 'grass' }
      ],
      blocks: [{ x: 149, y: 0, w: 3, h: 13 }],
      water: [{ x: 16, y: 14, w: 10, h: 2 }, { x: 34, y: 14, w: 8, h: 2 }, { x: 50, y: 13, w: 8, h: 3 }, { x: 64, y: 14, w: 8, h: 2 }, { x: 82, y: 13, w: 8, h: 3 }, { x: 98, y: 14, w: 8, h: 2 }, { x: 116, y: 13, w: 8, h: 3 }],
      currents: [{ x: 50, y: 13, w: 8, h: 3, dir: 'right' }, { x: 82, y: 13, w: 8, h: 3, dir: 'left' }, { x: 116, y: 13, w: 8, h: 3, dir: 'right' }],
      boxes: [{ x: 6, y: 10 }, { x: 28, y: 10 }, { x: 44, y: 10 }, { x: 60, y: 9, secret: true }, { x: 76, y: 10 }, { x: 94, y: 10 }, { x: 110, y: 9 }, { x: 128, y: 8 }],
      fruits: [{ type: 'apple', x: 22, y: 8 }, { type: 'pear', x: 56, y: 7 }, { type: 'apple', x: 132, y: 7 }],
      hazards: [{ type: 'spikes', x: 20, y: 12 }, { type: 'plant', x: 30, y: 12 }, { type: 'popSpikes', x: 46, y: 12 }, { type: 'spikes', x: 60, y: 12 }, { type: 'log', x: 74, y: 9 }, { type: 'rock', x: 86, y: 4 }, { type: 'plant', x: 92, y: 12 }, { type: 'spikes', x: 108, y: 12 }, { type: 'popSpikes', x: 126, y: 12 }, { type: 'plant', x: 138, y: 12 }],
      crocs: [{ x: 12, y: 12, patrol: [6, 16], chase: 1 }, { x: 28, y: 12, patrol: [26, 34], chase: 1 }, { x: 44, y: 12, patrol: [42, 50], chase: 1 }, { x: 60, y: 12, patrol: [58, 64], chase: 1 }, { x: 74, y: 12, patrol: [72, 82], chase: 1 }, { x: 92, y: 12, patrol: [90, 98], chase: 1 }, { x: 108, y: 12, patrol: [106, 116], chase: 1 }, { x: 128, y: 12, patrol: [124, 140], chase: 1 }, { x: 144, y: 12, patrol: [140, 150], chase: 1 }],
      start: { x: 2, y: 11 }, goal: { x: 147, y: 12 },
      hint: 'FASE FINAL · TODOS OS PERIGOS DO PANTANO'
    }
  ];

  /* ---------- construtor ---------- */
  function makeGrid(w, h) {
    const g = [];
    for (let y = 0; y < h; y++) { g.push(new Array(w).fill(0)); }
    return g;
  }
  function setRect(grid, x, y, w, h, code) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const gy = y + j, gx = x + i;
        if (grid[gy] && gx >= 0 && gx < grid[gy].length) { grid[gy][gx] = code; }
      }
    }
  }

  /* Transforma a descrição declarativa em grade + lista de objetos. */
  DA.buildLevel = function (spec) {
    const w = spec.w, h = H;
    const grid = makeGrid(w, h);
    const objects = [];
    const groundRow = spec.ground;

    (spec.ground_spans || []).forEach(function (s) {
      setRect(grid, s[0], groundRow, s[1], h - groundRow, SOLID);
      /* paredinha de terra irregular para o terreno parecer natural */
      const rng = DA.rng(s[0] * 131 + s[1]);
      for (let i = 0; i < s[1]; i++) {
        if (rng() > 0.75) { grid[groundRow][s[0] + i] = SOLID; }
        if (rng() > 0.86 && groundRow - 1 > 0) { grid[groundRow - 1][s[0] + i] = SOLID; }
      }
    });
    (spec.blocks || []).forEach(function (b) { setRect(grid, b.x, b.y, b.w, b.h, SOLID); });
    (spec.water || []).forEach(function (s) { setRect(grid, s.x, s.y, s.w, s.h, WATER); });
    (spec.water || []).forEach(function (s) {
      /* duas últimas linhas de um lago ficam mais fundas (visual) */
      if (s.h >= 3) { setRect(grid, s.x, s.y + s.h - 1, s.w, 1, DEEP); }
    });
    (spec.currents || []).forEach(function (c) {
      for (let j = 0; j < c.h; j++) {
        for (let i = 0; i < c.w; i++) {
          if (grid[c.y + j] && grid[c.y + j][c.x + i]) { grid[c.y + j][c.x + i] = c.dir === 'left' ? 11 : 10; }
        }
      }
      objects.push({ type: 'current', x: c.x * DA.TILE, y: c.y * DA.TILE, w: c.w * DA.TILE, h: c.h * DA.TILE, dir: c.dir });
    });
    (spec.platforms || []).forEach(function (p) {
      const isWood = p.kind === 'wood';
      if (p.kind === 'movingH' || p.kind === 'movingV') {
        objects.push({
          type: 'platform', moving: true, axis: p.kind === 'movingH' ? 'x' : 'y',
          x: p.x * DA.TILE, y: p.y * DA.TILE, w: p.len * DA.TILE, h: 8,
          base: { x: p.x * DA.TILE, y: p.y * DA.TILE },
          range: (p.range || 3) * DA.TILE, speed: p.speed || 24, t: 0, wood: isWood
        });
      } else if (p.kind === 'crumbling') {
        objects.push({ type: 'platform', crumble: true, x: p.x * DA.TILE, y: p.y * DA.TILE, w: p.len * DA.TILE, h: 8, wood: isWood, timer: -1, gone: false, shake: 0 });
      } else {
        objects.push({ type: 'platform', oneWay: true, x: p.x * DA.TILE, y: p.y * DA.TILE, w: p.len * DA.TILE, h: 8, wood: isWood });
      }
    });
    (spec.boxes || []).forEach(function (b) {
      objects.push({ type: 'box', x: b.x * DA.TILE, y: b.y * DA.TILE, open: false, secret: !!b.secret, bump: 0, reveal: 0 });
    });
    (spec.fruits || []).forEach(function (f) {
      objects.push({ type: 'fruit', kind: f.type, x: f.x * DA.TILE + 4, y: f.y * DA.TILE, vy: 0 });
    });
    (spec.hazards || []).forEach(function (hz) {
      objects.push({ type: 'hazard', kind: hz.type, x: hz.x * DA.TILE, y: hz.y * DA.TILE, t: (hz.x % 7) / 7 });
    });
    (spec.crocs || []).forEach(function (c) {
      objects.push({
        type: 'croc', x: c.x * DA.TILE, y: c.y * DA.TILE + 4,
        patrol: [(c.patrol ? c.patrol[0] : c.x - 3) * DA.TILE, (c.patrol ? c.patrol[1] : c.x + 3) * DA.TILE],
        chase: !!c.chase, dir: 1, state: 'walk', t: 0, vy: 0, dead: false, koTimer: 0
      });
    });
    /* espinhos fixos entram na grade (colisão simples por célula) */
    (spec.hazards || []).filter(function (h2) { return h2.type === 'spikes'; }).forEach(function (hz) {
      setRect(grid, hz.x, hz.y, 1, 1, SPIKE);
    });
    return {
      spec: spec, w: w, h: h, theme: spec.theme, music: MUSIC[spec.theme],
      grid: grid, objects: objects,
      start: { x: spec.start.x * DA.TILE, y: spec.start.y * DA.TILE },
      goal: { x: spec.goal.x * DA.TILE, y: spec.goal.y * DA.TILE },
      pixelW: w * DA.TILE, pixelH: h * DA.TILE,
      decoSeed: (spec.world * 1000 + spec.name.length * 17)
    };
  };

  DA.WORLDS = [
    { id: 1, name: 'FLORESTA VERDE', levels: [0, 1] },
    { id: 2, name: 'PANTANO PIXELADO', levels: [2, 3] },
    { id: 3, name: 'CAVERNAS SUBTERRANEAS', levels: [4, 5] },
    { id: 4, name: 'MONTANHAS SELVAGENS', levels: [6, 7] },
    { id: 5, name: 'PANTANO DOS JACARES', levels: [8, 9] }
  ];
  DA.LEVEL_SPECS = LEVELS;
  DA.TOTAL_LEVELS = LEVELS.length;
  DA.CODES = { SOLID: SOLID, PLATFORM: PLATFORM, WATER: WATER, DEEP: DEEP, SPIKE: SPIKE, WOOD: WOOD, ICE: ICE, CURRENT_R: 10, CURRENT_L: 11 };
  DA.isWaterCode = function (c) { return c === WATER || c === DEEP || c === 10 || c === 11; };
  DA.isSolidCode = function (c) { return c === SOLID || c === WOOD; };
})(window.DA);
