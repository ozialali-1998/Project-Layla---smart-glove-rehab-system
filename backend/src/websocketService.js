const WebSocket = require('ws');

function createWebSocketService(port, { onMessage } = {}) {
  const wss = new WebSocket.Server({ port });

  wss.on('connection', (socket) => {
    console.log('[WS] Client connected');

    socket.on('message', (message) => {
      if (typeof onMessage === 'function') {
        onMessage(socket, message.toString());
      }
    });

    socket.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  });

  function broadcast(payload) {
    const message = JSON.stringify(payload);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function send(socket, payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  return { wss, broadcast, send };
}

module.exports = { createWebSocketService };
