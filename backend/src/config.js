require('dotenv').config();

const config = {
  httpPort: Number(process.env.PORT || 4000),
  wsPort: Number(process.env.WS_PORT || 4001),
  serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
  baudRate: Number(process.env.BAUD_RATE || 9600),
  reconnectDelayMs: Number(process.env.SERIAL_RECONNECT_DELAY_MS || 2000),
};

module.exports = { config };
