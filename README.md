# Smart Glove Rehab System (Fullstack IoT Web Project)

This project is a modular fullstack IoT dashboard for a smart rehabilitation glove.

- **Backend:** Node.js + Express
- **Realtime communication:** WebSocket (`ws`)
- **Hardware integration:** Arduino data from serial port (`serialport`)
- **Frontend:** HTML + CSS + Vanilla JavaScript

## Project Structure

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── serialService.js
│       ├── server.js
│       └── websocketService.js
└── frontend/
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

## Features

- Express API server for health check and latest sensor snapshot.
- Dedicated WebSocket server for real-time sensor updates.
- Serial listener for Arduino output with JSON parsing and auto-reconnect when disconnected.
- Dashboard UI to display:
  - Real-time flex angle numeric value
  - Progress bar (0-180)
  - Line chart for the last 20 data points
  - Animated finger simulation that rotates with the incoming angle
- Auto-reconnect logic on WebSocket disconnect.

## Arduino Data Format

The backend expects **JSON per line** from Arduino:

```json
{"angle":97}
```

## How to Run

### 1) Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm start
```

By default, the backend runs on:

- HTTP API: `http://localhost:4000`
- WebSocket: `ws://localhost:4001`

### 2) Configure serial connection

Edit `backend/.env`:

```env
PORT=4000
WS_PORT=4001
SERIAL_PORT=/dev/ttyUSB0
BAUD_RATE=9600
SERIAL_RECONNECT_DELAY_MS=2000
```

Set `SERIAL_PORT` to your Arduino serial device:

- Linux examples: `/dev/ttyUSB0`, `/dev/ttyACM0`
- macOS example: `/dev/cu.usbmodemXXXX`
- Windows example: `COM3`

### 3) Frontend setup

Open `frontend/index.html` in your browser.

For better local development, serve it with a static server:

```bash
cd frontend
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## API Endpoints

- `GET /health` → health status (includes serial connection state)
- `GET /api/sensors/latest` → latest sensor data snapshot

## Notes

- Ensure the Arduino is connected and sending line-delimited sensor data.
- If no sensor data has been received yet, UI values show `--`.

## Arduino Sketch (Flex Sensor on A0)

An Arduino sketch is included at:

- `arduino/flex_sensor_reader/flex_sensor_reader.ino`

It:

- reads flex values from `A0`
- smooths signal using a moving average of last 5 samples
- converts the smoothed analog value to an angle in the range `0-180`
- prints JSON every `100ms` in this format:

```json
{ "angle": 97 }
```

## Control Commands (Frontend -> Backend -> Arduino)

The dashboard includes **START** and **STOP** buttons.

- Frontend sends WebSocket message:

```json
{ "type": "control-command", "command": "START" }
```

or

```json
{ "type": "control-command", "command": "STOP" }
```

- Backend validates command and forwards plain serial line to Arduino:
  - `START`
  - `STOP`

## Fuzzy Logic Mapping (Angle -> Actuator Power)

A simple fuzzy logic utility is included in `backend/src/fuzzyLogic.js`.

- Input: `angle` in range `0-180`
- Output: `power` in range `0-255`
- Linguistic rules:
  - low angle -> low power
  - medium angle -> medium power
  - high angle -> high power

The backend also exposes:

- `GET /api/actuator/power?angle=90`

If `angle` query is omitted, it uses the latest streamed angle.
