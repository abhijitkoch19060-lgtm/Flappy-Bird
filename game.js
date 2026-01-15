// Flappy Bird: Ancient Flight - Main Game Logic
// Author: [Your Name]
// All assets are placeholders. Replace with your own images and sounds as needed.

// --- Game Constants ---
const ASPECT_RATIO = 16 / 9;
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const BIRD_RADIUS = 32;
const BIRD_DEFAULT_COLOR = '#22cc44';
const BIRD_DEFAULT_EYE_SIZE = 20;
const GRAVITY = 0.5;
const FLAP_STRENGTH = -9.5;
const PILLAR_WIDTH = 96;
const PILLAR_GAP = 260; // Wider for easier gameplay
const PILLAR_INTERVAL = 1800; // ms
const PILLAR_SPEED = 3.5;
const MAX_SCORE = 999;

// --- State Variables ---
let canvas, ctx;
let width, height, scale;
let gameState = 'MENU'; // MENU, SETTINGS, COUNTDOWN, PLAYING, GAMEOVER, DEMO
let bird, pillars, clouds, score, highScore, pillarTimer, demoAI;
let settings = {
  birdColor: BIRD_DEFAULT_COLOR,
  eyeSize: BIRD_DEFAULT_EYE_SIZE,
  volume: 1,
  muted: false
};
let audio = {};
let animationFrameId;
let lastFrameTime = 0;
let countdownValue = 3;

// --- DOM Elements ---
const menuOverlay = document.getElementById('menu-overlay');
const settingsOverlay = document.getElementById('settings-overlay');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScore = document.getElementById('final-score');
const scoreDisplay = document.getElementById('score-display');

// --- Utility Functions ---
function resizeCanvas() {
  // Maintain 16:9 aspect ratio, fit to window
  const container = document.querySelector('.game-container');
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  let w = ww, h = ww / ASPECT_RATIO;
  if (h > wh) {
    h = wh;
    w = h * ASPECT_RATIO;
  }
  container.style.width = w + 'px';
  container.style.height = h + 'px';
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  scale = w / GAME_WIDTH;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  width = GAME_WIDTH;
  height = GAME_HEIGHT;
}
window.addEventListener('resize', resizeCanvas);

// --- Asset Loading ---
function loadAudio() {
  audio.score = document.getElementById('audio-score');
  audio.hit = document.getElementById('audio-hit');
  audio.music = document.getElementById('audio-music');
  setVolume(settings.volume);
  setMute(settings.muted);
}
function playSound(name) {
  if (settings.muted) return;
  if (audio[name]) {
    audio[name].currentTime = 0;
    audio[name].play();
  }
}
function setVolume(vol) {
  for (let key in audio) {
    audio[key].volume = vol;
  }
}
function setMute(mute) {
  for (let key in audio) {
    audio[key].muted = mute;
  }
}

// --- Game Entities ---
function createBird() {
  return {
    x: width * 0.25,
    y: height * 0.5,
    vy: 0,
    radius: BIRD_RADIUS,
    color: settings.birdColor,
    eyeSize: settings.eyeSize,
    alive: true,
    bounce: 0
  };
}
function createPillarPair() {
  // Randomize gap position
  const minY = 120;
  const maxY = height - 120 - PILLAR_GAP;
  const gapY = Math.floor(Math.random() * (maxY - minY)) + minY;
  return [
    { x: width + PILLAR_WIDTH, y: 0, w: PILLAR_WIDTH, h: gapY, passed: false, type: 'top' },
    { x: width + PILLAR_WIDTH, y: gapY + PILLAR_GAP, w: PILLAR_WIDTH, h: height - (gapY + PILLAR_GAP), passed: false, type: 'bottom' }
  ];
}
function createCloud() {
  // Clouds move slowly in the background
  const y = Math.random() * (height * 0.4);
  const size = 80 + Math.random() * 80;
  return {
    x: width + size,
    y: y,
    size: size,
    speed: 0.5 + Math.random() * 0.7
  };
}

// --- Game Initialization ---
function initGame() {
  bird = createBird();
  pillars = [];
  clouds = [];
  score = 0;
  pillarTimer = 0;
  demoAI = { enabled: false };
  for (let i = 0; i < 4; i++) clouds.push(createCloud());
  scoreDisplay.textContent = '0';
}

function startDemo() {
  gameState = 'DEMO';
  initGame();
  demoAI.enabled = true;
  loop(performance.now());
}

function startCountdown() {
  gameState = 'COUNTDOWN';
  countdownValue = 3;
  countdownOverlay.classList.remove('hidden');
  countdownNumber.textContent = countdownValue;
  setTimeout(countdownTick, 1000);
}

function countdownTick() {
  countdownValue--;
  if (countdownValue > 0) {
    countdownNumber.textContent = countdownValue;
    setTimeout(countdownTick, 1000);
  } else {
    countdownOverlay.classList.add('hidden');
    startGame();
  }
}

function startGame() {
  gameState = 'PLAYING';
  initGame();
  loop(performance.now());
  if (!settings.muted) audio.music.play();
}

function gameOver() {
  gameState = 'GAMEOVER';
  bird.alive = false;
  finalScore.textContent = `Score: ${score}`;
  gameoverOverlay.classList.remove('hidden');
  if (!settings.muted) audio.music.pause();
}

function resetGame() {
  gameoverOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
  startDemo();
}

// --- Main Game Loop ---
function loop(now) {
  animationFrameId = requestAnimationFrame(loop);
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  update(delta);
  render();
}

function update(delta) {
  // Update clouds
  for (let c of clouds) {
    c.x -= c.speed;
    if (c.x + c.size < 0) {
      Object.assign(c, createCloud());
      c.x = width + c.size;
    }
  }
  // Demo AI
  if (gameState === 'DEMO') {
    updatePillars(delta);
    updateBirdAI();
    updateBirdPhysics();
    checkCollisions();
    updateScore();
    return;
  }
  if (gameState !== 'PLAYING') return;
  updatePillars(delta);
  updateBirdPhysics();
  checkCollisions();
  updateScore();
}

function updatePillars(delta) {
  pillarTimer += delta;
  if (pillarTimer > PILLAR_INTERVAL) {
    pillarTimer = 0;
    pillars.push(...createPillarPair());
  }
  for (let p of pillars) {
    p.x -= PILLAR_SPEED;
  }
  // Remove off-screen pillars
  while (pillars.length && pillars[0].x + PILLAR_WIDTH < 0) {
    pillars.shift();
  }
}

function updateBirdPhysics() {
  if (!bird.alive) {
    if (bird.bounce > 0) {
      bird.x -= 2.5;
      bird.bounce--;
    }
    return;
  }
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  // Clamp to screen
  if (bird.y + bird.radius > height) {
    bird.y = height - bird.radius;
    bird.vy = 0;
    gameOver();
    playSound('hit');
  }
  if (bird.y - bird.radius < 0) {
    bird.y = bird.radius;
    bird.vy = 0;
  }
}

function updateBirdAI() {
  // Simple AI: always aim for center of next gap
  let nextGap = null;
  for (let i = 0; i < pillars.length; i += 2) {
    if (pillars[i].x + PILLAR_WIDTH > bird.x) {
      nextGap = {
        x: pillars[i].x,
        y: pillars[i].h + PILLAR_GAP / 2
      };
      break;
    }
  }
  if (nextGap) {
    if (bird.y < nextGap.y - 10) {
      bird.vy += 0.2;
    } else if (bird.y > nextGap.y + 10) {
      bird.vy -= 0.2;
    }
  }
}

function checkCollisions() {
  if (!bird.alive) return;
  for (let p of pillars) {
    if (rectCircleColliding(bird, p)) {
      bird.bounce = 12;
      bird.alive = false;
      playSound('hit');
      setTimeout(gameOver, 350);
      break;
    }
  }
}

function updateScore() {
  for (let i = 0; i < pillars.length; i += 2) {
    let p = pillars[i];
    if (!p.passed && p.x + PILLAR_WIDTH < bird.x) {
      p.passed = true;
      score++;
      if (score > MAX_SCORE) score = MAX_SCORE;
      scoreDisplay.textContent = score;
      playSound('score');
    }
  }
}

// --- Collision Detection ---
function rectCircleColliding(circle, rect) {
  // Circle: {x, y, radius}
  // Rect: {x, y, w, h}
  let distX = Math.abs(circle.x - rect.x - rect.w / 2);
  let distY = Math.abs(circle.y - rect.y - rect.h / 2);
  if (distX > (rect.w / 2 + circle.radius)) return false;
  if (distY > (rect.h / 2 + circle.radius)) return false;
  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;
  let dx = distX - rect.w / 2;
  let dy = distY - rect.h / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

// --- Rendering ---
function render() {
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawClouds();
  drawPillars();
  drawBird();
  // Optionally: draw debug info
}

function drawBackground() {
  // Blue sky gradient
  let grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(1, '#e0f7fa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawClouds() {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let c of clouds) {
    drawCloud(c.x, c.y, c.size);
  }
  ctx.restore();
}

function drawCloud(x, y, size) {
  // Simple cloud: three overlapping circles
  ctx.beginPath();
  ctx.arc(x, y + size * 0.2, size * 0.32, 0, 2 * Math.PI);
  ctx.arc(x + size * 0.25, y, size * 0.28, 0, 2 * Math.PI);
  ctx.arc(x + size * 0.5, y + size * 0.18, size * 0.22, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawPillars() {
  for (let p of pillars) {
    drawPillar(p);
  }
}

function drawPillar(p) {
  // Ancient pillar: fluted shaft, capital, base
  ctx.save();
  ctx.fillStyle = '#d3cfc7';
  ctx.strokeStyle = '#b0a99f';
  ctx.lineWidth = 4;
  // Shaft
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.fill();
  ctx.stroke();
  // Fluting (vertical lines)
  for (let i = 1; i < 5; i++) {
    let fx = p.x + (p.w / 5) * i;
    ctx.beginPath();
    ctx.moveTo(fx, p.y);
    ctx.lineTo(fx, p.y + p.h);
    ctx.strokeStyle = '#b0a99f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Capital (top) or base (bottom)
  ctx.fillStyle = '#e8e6e1';
  if (p.type === 'top') {
    ctx.fillRect(p.x - 8, p.y + p.h - 14, p.w + 16, 14);
  } else {
    ctx.fillRect(p.x - 8, p.y, p.w + 16, 14);
  }
  ctx.restore();
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  // Body
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, 2 * Math.PI);
  ctx.fillStyle = bird.color;
  ctx.shadowColor = '#222';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Wing
  ctx.beginPath();
  ctx.ellipse(-bird.radius * 0.3, bird.radius * 0.2, bird.radius * 0.5, bird.radius * 0.2, Math.PI / 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#a3e6b1';
  ctx.fill();
  // Eye
  ctx.beginPath();
  ctx.arc(bird.radius * 0.45, -bird.radius * 0.25, bird.eyeSize, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bird.radius * 0.45, -bird.radius * 0.25, bird.eyeSize * 0.45, 0, 2 * Math.PI);
  ctx.fillStyle = '#222';
  ctx.fill();
  // Beak
  ctx.beginPath();
  ctx.moveTo(bird.radius, 0);
  ctx.lineTo(bird.radius + 18, -8);
  ctx.lineTo(bird.radius + 18, 8);
  ctx.closePath();
  ctx.fillStyle = '#ffb300';
  ctx.fill();
  ctx.restore();
}

// --- Event Handlers ---
function onFlap() {
  if (gameState !== 'PLAYING') return;
  if (!bird.alive) return;
  bird.vy = FLAP_STRENGTH;
}

function onKeyDown(e) {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    onFlap();
  }
}

function onMouseDown(e) {
  if (gameState === 'PLAYING') onFlap();
}

function onTouchStart(e) {
  if (gameState === 'PLAYING') onFlap();
}

// --- Menu and Settings ---
document.getElementById('btn-new-game').onclick = () => {
  menuOverlay.classList.add('hidden');
  startCountdown();
};
document.getElementById('btn-settings').onclick = () => {
  menuOverlay.classList.add('hidden');
  settingsOverlay.classList.remove('hidden');
  // Sync UI with settings
  document.getElementById('eye-size-slider').value = settings.eyeSize;
  document.getElementById('color-picker').value = settings.birdColor;
  document.getElementById('volume-slider').value = settings.volume;
  document.getElementById('mute-toggle').checked = settings.muted;
};
document.getElementById('btn-quit').onclick = () => {
  // In web context, hide game or redirect
  window.location.href = 'https://your-homepage.com/';
};
document.getElementById('btn-settings-back').onclick = () => {
  settingsOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
};
document.getElementById('btn-restart').onclick = () => {
  gameoverOverlay.classList.add('hidden');
  startCountdown();
};
document.getElementById('btn-gameover-menu').onclick = () => {
  resetGame();
};

// Settings controls
document.getElementById('eye-size-slider').oninput = (e) => {
  settings.eyeSize = parseInt(e.target.value);
  bird.eyeSize = settings.eyeSize;
};
document.getElementById('color-picker').oninput = (e) => {
  settings.birdColor = e.target.value;
  bird.color = settings.birdColor;
};
document.getElementById('volume-slider').oninput = (e) => {
  settings.volume = parseFloat(e.target.value);
  setVolume(settings.volume);
};
document.getElementById('mute-toggle').onchange = (e) => {
  settings.muted = e.target.checked;
  setMute(settings.muted);
  if (settings.muted) audio.music.pause();
  else if (gameState === 'PLAYING') audio.music.play();
};

// --- Initialization ---
function setup() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  loadAudio();
  resizeCanvas();
  // Input events
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  // Start demo loop
  startDemo();
}
window.onload = setup;
