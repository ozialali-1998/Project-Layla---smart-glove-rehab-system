const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

function parseJsonLine(rawLine) {
  const line = rawLine.trim();
  if (!line) {
    return null;
  }

  const parsed = JSON.parse(line);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Incoming payload must be a JSON object');
  }

  return {
    timestamp: new Date().toISOString(),
    ...parsed,
  };
}

function startSerialListener({
  path,
  baudRate,
  reconnectDelayMs = 2000,
  onData,
  onStatusChange,
  onError,
}) {
  let port;
  let parser;
  let reconnectTimer;
  let isConnected = false;

  function updateStatus(nextStatus) {
    if (nextStatus === isConnected) {
      return;
    }

    isConnected = nextStatus;
    if (typeof onStatusChange === 'function') {
      onStatusChange(isConnected);
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  }

  function cleanupCurrentPort() {
    if (parser) {
      parser.removeAllListeners();
      parser = null;
    }

    if (port) {
      port.removeAllListeners();
      if (port.isOpen) {
        port.close();
      }
      port = null;
    }
  }

  function handleError(error) {
    if (typeof onError === 'function') {
      onError(error);
    } else {
      console.error('[SERIAL] Error:', error.message);
    }
  }

  function connect() {
    cleanupCurrentPort();

    try {
      port = new SerialPort({ path, baudRate, autoOpen: true });
    } catch (error) {
      updateStatus(false);
      handleError(error);
      scheduleReconnect();
      return;
    }

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log(`[SERIAL] Connected to ${path} @ ${baudRate}`);
      updateStatus(true);
    });

    port.on('close', () => {
      console.warn('[SERIAL] Arduino disconnected. Retrying...');
      updateStatus(false);
      scheduleReconnect();
    });

    port.on('error', (error) => {
      updateStatus(false);
      handleError(error);
      scheduleReconnect();
    });

    parser.on('data', (line) => {
      try {
        const payload = parseJsonLine(line);
        if (payload && typeof onData === 'function') {
          onData(payload);
        }
      } catch (error) {
        handleError(new Error(`Invalid JSON from serial: ${error.message}`));
      }
    });
  }

  function sendCommand(command) {
    if (!port || !port.isOpen) {
      throw new Error('Serial port is not connected');
    }

    port.write(`${command}\n`, (error) => {
      if (error) {
        handleError(new Error(`Failed to write command: ${error.message}`));
      }
    });
  }

  connect();

  return {
    stop() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      cleanupCurrentPort();
      updateStatus(false);
    },
    sendCommand,
    isConnected() {
      return isConnected;
    },
  };
}

module.exports = { startSerialListener, parseJsonLine };
