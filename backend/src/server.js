const express = require('express');
const cors = require('cors');

const { config } = require('./config');
const { createWebSocketService } = require('./websocketService');
const { startSerialListener } = require('./serialService');
const { computeActuatorPower } = require('./fuzzyLogic');

const app = express();
app.use(cors());
app.use(express.json());

let latestSensorData = {
  timestamp: null,
};

let serialConnected = false;
let serialController;

const ALLOWED_COMMANDS = new Set(['START', 'STOP']);

const { broadcast, send } = createWebSocketService(config.wsPort, {
  onMessage: (socket, rawMessage) => {
    try {
      const message = JSON.parse(rawMessage);
      if (message.type !== 'control-command') {
        return;
      }

      const command = String(message.command || '').toUpperCase().trim();
      if (!ALLOWED_COMMANDS.has(command)) {
        send(socket, {
          type: 'command-error',
          data: { message: 'Invalid command. Use START or STOP.' },
        });
        return;
      }

      serialController.sendCommand(command);
      broadcast({
        type: 'command-ack',
        data: {
          command,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      send(socket, {
        type: 'command-error',
        data: { message: error.message },
      });
    }
  },
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    serialConnected,
  });
});

app.get('/api/sensors/latest', (_req, res) => {
  res.json(latestSensorData);
});

app.get('/api/actuator/power', (req, res) => {
  const angle = Number(req.query.angle);
  const referenceAngle = Number.isNaN(angle) ? Number(latestSensorData.angle || 0) : angle;
  const power = computeActuatorPower(referenceAngle);

  res.json({
    angle: referenceAngle,
    power,
  });
});

app.listen(config.httpPort, () => {
  console.log(`[HTTP] Server running on http://localhost:${config.httpPort}`);
  console.log(`[WS] WebSocket running on ws://localhost:${config.wsPort}`);
});

serialController = startSerialListener({
  path: config.serialPort,
  baudRate: config.baudRate,
  reconnectDelayMs: config.reconnectDelayMs,
  onData: (payload) => {
    const angle = Number(payload.angle || 0);
    const actuatorPower = computeActuatorPower(angle);

    latestSensorData = {
      ...payload,
      actuatorPower,
    };

    broadcast({ type: 'sensor-update', data: latestSensorData });
  },
  onStatusChange: (isConnected) => {
    serialConnected = isConnected;
    broadcast({
      type: 'serial-status',
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
      },
    });
  },
  onError: (error) => {
    console.error('[SERIAL] Error:', error.message);
    broadcast({
      type: 'serial-error',
      data: {
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  },
});
