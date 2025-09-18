const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const sessionScoreEl = document.getElementById('session-score');
const totalPointsEl = document.getElementById('total-points');
const statusMessageEl = document.getElementById('status-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const colorListEl = document.getElementById('color-list');

const TILE_SIZE = 20;
const TILE_COUNT = canvas.width / TILE_SIZE;
const GAME_SPEED = 120;
const POINTS_PER_FOOD = 10;

const STORAGE_KEYS = {
  totalPoints: 'snakeTotalPoints',
  unlockedColors: 'snakeUnlockedColors',
  selectedColor: 'snakeSelectedColor',
};

const colorOptions = [
  {
    id: 'classic',
    name: 'Classic Green',
    color: '#4CAF50',
    cost: 0,
    description: 'The timeless look every snake starts with.',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    color: '#FF7043',
    cost: 40,
    description: 'Warm hues inspired by late-evening runs.',
  },
  {
    id: 'arctic',
    name: 'Arctic Blue',
    color: '#29B6F6',
    cost: 60,
    description: 'A cool tone for smooth, icy slides.',
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    color: '#AB47BC',
    cost: 90,
    description: 'Rule the grid with a regal palette.',
  },
  {
    id: 'neon',
    name: 'Neon Mint',
    color: '#2DE2D3',
    cost: 120,
    description: 'Electric glow for late-night high scores.',
  },
];

let snake = [];
let food = { x: 10, y: 10 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let sessionScore = 0;
let totalPoints = 0;
let unlockedColors = ['classic'];
let selectedColorId = 'classic';
let intervalId = null;
let isPaused = false;
let isGameOver = false;

function loadPersistentData() {
  const storedPoints = Number(localStorage.getItem(STORAGE_KEYS.totalPoints));
  totalPoints = Number.isFinite(storedPoints) ? storedPoints : 0;

  try {
    const storedColors = localStorage.getItem(STORAGE_KEYS.unlockedColors);
    if (storedColors) {
      const parsed = JSON.parse(storedColors);
      if (Array.isArray(parsed) && parsed.length) {
        unlockedColors = parsed.filter((id) =>
          colorOptions.some((option) => option.id === id)
        );
      }
    }
  } catch (error) {
    unlockedColors = ['classic'];
  }

  if (!unlockedColors.includes('classic')) {
    unlockedColors.push('classic');
  }

  const storedSelected = localStorage.getItem(STORAGE_KEYS.selectedColor);
  if (storedSelected && unlockedColors.includes(storedSelected)) {
    selectedColorId = storedSelected;
  }
}

function savePersistentData() {
  localStorage.setItem(STORAGE_KEYS.totalPoints, String(totalPoints));
  localStorage.setItem(
    STORAGE_KEYS.unlockedColors,
    JSON.stringify(Array.from(new Set(unlockedColors)))
  );
  localStorage.setItem(STORAGE_KEYS.selectedColor, selectedColorId);
}

function resetGame() {
  clearInterval(intervalId);
  intervalId = null;
  isPaused = false;
  isGameOver = false;
  pauseBtn.textContent = 'Pause';

  sessionScore = 0;
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  const startX = Math.floor(TILE_COUNT / 2);
  const startY = Math.floor(TILE_COUNT / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  placeFood();
  updateScores();
  drawBoard();
  updateStatus('Game reset. Press Start to play.');
}

function startGame() {
  if (isGameOver) {
    resetGame();
  }

  if (intervalId) {
    if (isPaused) {
      isPaused = false;
      pauseBtn.textContent = 'Pause';
      updateStatus('Game running.');
    }
    return;
  }

  isPaused = false;
  pauseBtn.textContent = 'Pause';
  intervalId = setInterval(gameTick, GAME_SPEED);
  updateStatus('Game running.');
}

function togglePause() {
  if (isGameOver) {
    return;
  }

  if (!intervalId) {
    startGame();
    return;
  }

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  updateStatus(isPaused ? 'Game paused.' : 'Game running.');
}

function gameTick() {
  if (isPaused) {
    return;
  }

  direction = nextDirection;
  const newHead = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (isOutOfBounds(newHead) || isCollision(newHead)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    sessionScore += POINTS_PER_FOOD;
    totalPoints += POINTS_PER_FOOD;
    savePersistentData();
    updateScores();
    renderShop();
    placeFood();
  } else {
    snake.pop();
  }

  drawBoard();
}

function endGame() {
  clearInterval(intervalId);
  intervalId = null;
  isGameOver = true;
  isPaused = false;
  pauseBtn.textContent = 'Pause';
  updateStatus(`Game over! You scored ${sessionScore} points this round.`);
}

function isOutOfBounds(position) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= TILE_COUNT ||
    position.y >= TILE_COUNT
  );
}

function isCollision(position) {
  return snake.some((segment) => segment.x === position.x && segment.y === position.y);
}

function placeFood() {
  let newPosition;

  do {
    newPosition = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT),
    };
  } while (snake.some((segment) => segment.x === newPosition.x && segment.y === newPosition.y));

  food = newPosition;
}

function drawBoard() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const snakeColor = getSelectedColor();
  const headColor = adjustColor(snakeColor, 30);

  snake.forEach((segment, index) => {
    const x = segment.x * TILE_SIZE;
    const y = segment.y * TILE_SIZE;
    ctx.fillStyle = index === 0 ? headColor : snakeColor;
    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  });

  drawFood();
}

function drawFood() {
  const centerX = food.x * TILE_SIZE + TILE_SIZE / 2;
  const centerY = food.y * TILE_SIZE + TILE_SIZE / 2;
  const radius = TILE_SIZE / 2.5;

  ctx.fillStyle = '#ff5252';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb74d';
  ctx.beginPath();
  ctx.arc(centerX - TILE_SIZE / 6, centerY - TILE_SIZE / 6, radius / 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function updateScores() {
  sessionScoreEl.textContent = sessionScore.toLocaleString();
  totalPointsEl.textContent = totalPoints.toLocaleString();
}

function updateStatus(message) {
  statusMessageEl.textContent = message;
}

function renderShop() {
  colorListEl.innerHTML = '';

  colorOptions.forEach((option) => {
    const listItem = document.createElement('li');
    listItem.className = 'color-card';
    listItem.style.setProperty('--swatch-color', option.color);

    if (selectedColorId === option.id) {
      listItem.classList.add('selected');
    }
    if (!unlockedColors.includes(option.id)) {
      listItem.classList.add('locked');
    }

    const swatch = document.createElement('div');
    swatch.className = 'swatch';

    const textWrapper = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = option.name;
    const description = document.createElement('p');
    description.textContent = option.description;

    const isUnlocked = unlockedColors.includes(option.id);
    const status = document.createElement('p');
    status.className = `status ${isUnlocked ? 'unlocked' : 'locked'}`;
    status.textContent = isUnlocked ? 'Unlocked' : `Cost: ${option.cost} pts`;

    textWrapper.appendChild(title);
    textWrapper.appendChild(description);
    textWrapper.appendChild(status);

    const actionButton = document.createElement('button');

    if (isUnlocked) {
      actionButton.textContent =
        selectedColorId === option.id ? 'Selected' : 'Select';
      actionButton.classList.add('select');
      actionButton.disabled = selectedColorId === option.id;
      actionButton.addEventListener('click', () => {
        selectColor(option.id);
      });
    } else {
      actionButton.textContent = `Buy • ${option.cost} pts`;
      actionButton.disabled = totalPoints < option.cost;
      actionButton.addEventListener('click', () => {
        purchaseColor(option);
      });
    }

    listItem.appendChild(swatch);
    listItem.appendChild(textWrapper);
    listItem.appendChild(actionButton);
    colorListEl.appendChild(listItem);
  });
}

function selectColor(colorId) {
  if (!unlockedColors.includes(colorId)) {
    return;
  }

  selectedColorId = colorId;
  savePersistentData();
  renderShop();
  drawBoard();
  const { name } = colorOptions.find((option) => option.id === colorId) || {
    name: 'new color',
  };
  updateStatus(`${name} equipped!`);
}

function purchaseColor(option) {
  if (unlockedColors.includes(option.id)) {
    selectColor(option.id);
    return;
  }

  if (totalPoints < option.cost) {
    updateStatus('Not enough points yet. Keep collecting food!');
    return;
  }

  totalPoints -= option.cost;
  unlockedColors.push(option.id);
  selectedColorId = option.id;
  savePersistentData();
  updateScores();
  renderShop();
  drawBoard();
  updateStatus(`You bought ${option.name}!`);
}

function getSelectedColor() {
  const option = colorOptions.find((item) => item.id === selectedColorId);
  return option ? option.color : '#4CAF50';
}

function adjustColor(hex, amount) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const num = parseInt(normalized, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const directionMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  const newDirection = directionMap[key];
  if (!newDirection) {
    return;
  }

  if (!intervalId && !isGameOver) {
    startGame();
  } else if (isGameOver) {
    startGame();
  }

  const isOpposite =
    newDirection.x === -direction.x && newDirection.y === -direction.y;
  const isOppositeNext =
    newDirection.x === -nextDirection.x && newDirection.y === -nextDirection.y;

  if (isOpposite || isOppositeNext) {
    return;
  }

  nextDirection = newDirection;
}

function init() {
  loadPersistentData();
  renderShop();
  resetGame();

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  resetBtn.addEventListener('click', () => resetGame());
  document.addEventListener('keydown', handleKeydown);
}

init();
