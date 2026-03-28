const WS_URL = 'ws://localhost:4001';
const MAX_POINTS = 20;
const ANGLE_MIN = 0;
const ANGLE_MAX = 180;

const connectionStatusEl = document.getElementById('connectionStatus');
const angleValueEl = document.getElementById('angleValue');
const angleProgressEl = document.getElementById('angleProgress');
const lastUpdatedEl = document.getElementById('lastUpdated');
const chartCanvas = document.getElementById('angleChart');
const chartCtx = chartCanvas.getContext('2d');
const fingerRootEl = document.getElementById('fingerRoot');
const startBtnEl = document.getElementById('startBtn');
const stopBtnEl = document.getElementById('stopBtn');
const commandStatusEl = document.getElementById('commandStatus');

const angleHistory = [];

let targetFingerAngle = 0;
let animatedFingerAngle = 0;
let ws;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setConnectionStatus(isConnected) {
  connectionStatusEl.textContent = isConnected ? 'Connected' : 'Disconnected';
  connectionStatusEl.classList.toggle('connected', isConnected);
  connectionStatusEl.classList.toggle('disconnected', !isConnected);

  startBtnEl.disabled = !isConnected;
  stopBtnEl.disabled = !isConnected;
}

function setCommandStatus(message) {
  commandStatusEl.textContent = `Command status: ${message}`;
}

function updateNumericAndProgress(angle) {
  const safeAngle = clamp(Number(angle) || 0, ANGLE_MIN, ANGLE_MAX);
  angleValueEl.textContent = `${safeAngle.toFixed(1)}°`;

  const progressPct = (safeAngle / ANGLE_MAX) * 100;
  angleProgressEl.style.width = `${progressPct}%`;
  angleProgressEl.setAttribute('aria-valuenow', String(Math.round(safeAngle)));
}

function renderFinger(angle) {
  fingerRootEl.style.setProperty('--finger-rot', `${angle.toFixed(2)}deg`);
}

function animateFinger() {
  const diff = targetFingerAngle - animatedFingerAngle;

  if (Math.abs(diff) > 0.05) {
    animatedFingerAngle += diff * 0.18;
    renderFinger(animatedFingerAngle);
  } else {
    animatedFingerAngle = targetFingerAngle;
    renderFinger(animatedFingerAngle);
  }

  requestAnimationFrame(animateFinger);
}

function drawChart() {
  const width = chartCanvas.width;
  const height = chartCanvas.height;

  chartCtx.clearRect(0, 0, width, height);

  const padding = { top: 18, right: 16, bottom: 26, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  chartCtx.strokeStyle = '#cbd5e1';
  chartCtx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight * i) / 4;
    chartCtx.beginPath();
    chartCtx.moveTo(padding.left, y);
    chartCtx.lineTo(width - padding.right, y);
    chartCtx.stroke();

    const valueLabel = ANGLE_MAX - (ANGLE_MAX * i) / 4;
    chartCtx.fillStyle = '#64748b';
    chartCtx.font = '12px Inter, sans-serif';
    chartCtx.fillText(`${valueLabel}`, 6, y + 4);
  }

  if (angleHistory.length < 2) {
    return;
  }

  chartCtx.strokeStyle = '#2563eb';
  chartCtx.lineWidth = 2.5;
  chartCtx.beginPath();

  angleHistory.forEach((value, index) => {
    const x =
      padding.left +
      (chartWidth * index) /
        Math.max(angleHistory.length - 1, 1);
    const normalized =
      (clamp(value, ANGLE_MIN, ANGLE_MAX) - ANGLE_MIN) /
      (ANGLE_MAX - ANGLE_MIN);
    const y = padding.top + chartHeight - normalized * chartHeight;

    if (index === 0) {
      chartCtx.moveTo(x, y);
    } else {
      chartCtx.lineTo(x, y);
    }
  });

  chartCtx.stroke();

  chartCtx.fillStyle = '#1d4ed8';
  angleHistory.forEach((value, index) => {
    const x =
      padding.left +
      (chartWidth * index) /
        Math.max(angleHistory.length - 1, 1);
    const normalized =
      (clamp(value, ANGLE_MIN, ANGLE_MAX) - ANGLE_MIN) /
      (ANGLE_MAX - ANGLE_MIN);
    const y = padding.top + chartHeight - normalized * chartHeight;
    chartCtx.beginPath();
    chartCtx.arc(x, y, 3, 0, Math.PI * 2);
    chartCtx.fill();
  });
}

function pushAngle(angle) {
  const safeAngle = clamp(Number(angle) || 0, ANGLE_MIN, ANGLE_MAX);
  angleHistory.push(safeAngle);

  if (angleHistory.length > MAX_POINTS) {
    angleHistory.shift();
  }

  targetFingerAngle = safeAngle;
  updateNumericAndProgress(safeAngle);
  drawChart();
  lastUpdatedEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
}

function handleMessage(raw) {
  try {
    const message = JSON.parse(raw);

    if (message.type === 'sensor-update' && message.data) {
      const { angle } = message.data;
      if (typeof angle === 'number' || typeof angle === 'string') {
        pushAngle(angle);
      }
      return;
    }

    if (message.type === 'command-ack' && message.data?.command) {
      setCommandStatus(`${message.data.command} sent`);
      return;
    }

    if (message.type === 'command-error' && message.data?.message) {
      setCommandStatus(`Error - ${message.data.message}`);
    }
  } catch (error) {
    console.error('Invalid WS message:', error);
  }
}

function sendCommand(command) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setCommandStatus('Not connected');
    return;
  }

  ws.send(JSON.stringify({
    type: 'control-command',
    command,
  }));

  setCommandStatus(`Sending ${command}...`);
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    setConnectionStatus(true);
  });

  ws.addEventListener('message', (event) => {
    handleMessage(event.data);
  });

  ws.addEventListener('close', () => {
    setConnectionStatus(false);
    setTimeout(connectWebSocket, 2000);
  });

  ws.addEventListener('error', () => {
    setConnectionStatus(false);
  });
}

startBtnEl.addEventListener('click', () => {
  sendCommand('START');
});

stopBtnEl.addEventListener('click', () => {
  sendCommand('STOP');
});

setConnectionStatus(false);
setCommandStatus('--');
renderFinger(0);
drawChart();
animateFinger();
connectWebSocket();
