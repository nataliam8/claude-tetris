'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// La paleta de colores vive en cada skin (SKINS[...].colors, sección "Skins")

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (centro vacío)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'tetris-theme';
let gridColor = '#22222e';
let ghostAlpha = 0.2;

function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  themeToggle.setAttribute('aria-checked', String(light));
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim() || gridColor;
  ghostAlpha = light ? 0.35 : 0.2;
  // El bucle está cancelado en pausa/game over: redibujar manualmente
  if (current && next) {
    draw();
    drawNext();
  }
}

function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

// ---- Skins ----
// Cada skin define su paleta (mismo índice 1..8 que PIECES; 8 = tuerca),
// un color de cuadrícula opcional (null = el del tema) y cómo dibujar un bloque.
// drawBlock(context, px, py, size, color) recibe la esquina en píxeles; el alfa
// (fantasma) ya viene aplicado en context.globalAlpha.
const SKIN_KEY = 'tetris-skin';
const skinSelect = document.getElementById('skin-select');

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
    return;
  }
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const SKINS = {
  retro: {
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - azul pálido
      '#ffb74d', // L - orange
      '#b0bec5', // N - tuerca (gris metálico)
    ],
    grid: null,
    drawBlock(c, px, py, size, color) {
      c.fillStyle = color;
      c.fillRect(px + 1, py + 1, size - 2, size - 2);
      c.fillStyle = 'rgba(255,255,255,0.12)'; // highlight
      c.fillRect(px + 1, py + 1, size - 2, 4);
    },
  },
  neon: {
    colors: [
      null,
      '#00f0ff', // I
      '#fff200', // O
      '#d64bff', // T
      '#39ff14', // S
      '#ff2a55', // Z
      '#2f7bff', // J
      '#ff8c00', // L
      '#c8d2dc', // N - tuerca (gris metálico)
    ],
    grid: 'rgba(0, 240, 255, 0.08)',
    drawBlock(c, px, py, size, color) {
      const a = c.globalAlpha;
      c.shadowColor = color;
      c.shadowBlur = size * 0.45;
      c.fillStyle = color;
      c.globalAlpha = a * 0.3;
      c.fillRect(px + 3, py + 3, size - 6, size - 6);
      c.globalAlpha = a;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(px + 3, py + 3, size - 6, size - 6);
      c.shadowBlur = 0; // también lo hace restore() en drawBlock; explícito por si se llama directo
    },
  },
  pastel: {
    colors: [
      null,
      '#a8e6ef', // I
      '#fff0a8', // O
      '#d9bdf5', // T
      '#bce6c8', // S
      '#f7b5c0', // Z
      '#b8d0f8', // J
      '#ffd3a8', // L
      '#d3dbe0', // N - tuerca (gris metálico)
    ],
    grid: null,
    drawBlock(c, px, py, size, color) {
      const r = size * 0.25;
      roundRectPath(c, px + 1.5, py + 1.5, size - 3, size - 3, r);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.15)';
      c.lineWidth = 1;
      c.stroke();
      roundRectPath(c, px + 5, py + 4, size - 10, size * 0.22, size * 0.11);
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fill();
    },
  },
  pixel: {
    colors: [
      null,
      '#38c8f0', // I
      '#f8d038', // O
      '#a858f0', // T
      '#58d858', // S
      '#f05050', // Z
      '#5878f8', // J
      '#f89838', // L
      '#a0a8b0', // N - tuerca (gris metálico)
    ],
    grid: null,
    drawBlock(c, px, py, size, color) {
      const p = size / 6; // subcuadrícula de 6×6 "píxeles"
      c.fillStyle = color;
      c.fillRect(px, py, size, size);
      // luz arriba-izquierda
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(px, py, size - p, p);
      c.fillRect(px, py + p, p, size - 2 * p);
      // sombra abajo-derecha
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(px + p, py + size - p, size - p, p);
      c.fillRect(px + size - p, py, p, size - p);
      // brillo y textura interior
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(px + p, py + p, p, p);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(px + 3 * p, py + 2 * p, p, p);
      c.fillRect(px + 2 * p, py + 4 * p, p, p);
      c.fillRect(px + 4 * p, py + 3 * p, p, p);
    },
  },
};

let currentSkin = 'retro';

function applySkin(name) {
  currentSkin = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : 'retro';
  document.documentElement.dataset.skin = currentSkin;
  skinSelect.value = currentSkin;
  // El bucle está cancelado en pausa/game over: redibujar manualmente
  if (current && next) {
    draw();
    drawNext();
  }
}

function loadSkin() {
  try { return localStorage.getItem(SKIN_KEY) || 'retro'; }
  catch { return 'retro'; }
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  try { localStorage.setItem(SKIN_KEY, currentSkin); } catch {}
  skinSelect.blur(); // evita que flechas/Space cambien la skin
});

// Si el selector sigue enfocado (se abrió sin cambiar), las teclas del juego
// no deben cambiar la skin: se cancela su efecto en el select y el evento
// sigue burbujeando hasta el keydown del juego.
const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
skinSelect.addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) {
    e.preventDefault();
    skinSelect.blur();
  }
});
// ---- Fin Skins ----

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// Delega en la skin activa (sección "Skins")
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin];
  context.save();
  context.globalAlpha = alpha ?? 1;
  skin.drawBlock(context, x * size, y * size, size, skin.colors[colorIndex]);
  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = SKINS[currentSkin].grid || gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, ghostAlpha);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  applyTheme(theme);
  themeToggle.blur(); // evita que Space (caída) active el switch
});

applyTheme(loadTheme());
applySkin(loadSkin());

init();
