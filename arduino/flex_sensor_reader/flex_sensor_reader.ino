/*
  Smart Glove Flex Sensor Reader
  - Reads flex sensor from analog pin A0
  - Smooths values using moving average over last 5 samples
  - Maps analog value to angle (0-180)
  - Sends JSON over serial every 100 ms
*/

const uint8_t FLEX_PIN = A0;
const uint8_t WINDOW_SIZE = 5;
const unsigned long SEND_INTERVAL_MS = 100;

int readings[WINDOW_SIZE] = {0};
uint8_t readIndex = 0;
long total = 0;
unsigned long lastSendMs = 0;

void setup() {
  Serial.begin(9600);

  // Prime smoothing buffer with initial reading.
  int initial = analogRead(FLEX_PIN);
  for (uint8_t i = 0; i < WINDOW_SIZE; i++) {
    readings[i] = initial;
    total += initial;
  }
}

void loop() {
  unsigned long now = millis();
  if (now - lastSendMs < SEND_INTERVAL_MS) {
    return;
  }
  lastSendMs = now;

  int raw = analogRead(FLEX_PIN);

  // Moving average: remove oldest, add newest.
  total -= readings[readIndex];
  readings[readIndex] = raw;
  total += raw;
  readIndex = (readIndex + 1) % WINDOW_SIZE;

  int averageRaw = total / WINDOW_SIZE;
  int angle = map(averageRaw, 0, 1023, 0, 180);
  angle = constrain(angle, 0, 180);

  Serial.print("{ \"angle\": ");
  Serial.print(angle);
  Serial.println(" }");
}
