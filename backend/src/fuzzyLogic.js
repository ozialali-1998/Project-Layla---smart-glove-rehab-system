function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function triangular(x, a, b, c) {
  if (x <= a || x >= c) {
    return 0;
  }

  if (x === b) {
    return 1;
  }

  if (x < b) {
    return (x - a) / (b - a);
  }

  return (c - x) / (c - b);
}

function shoulderLeft(x, start, end) {
  if (x <= start) {
    return 1;
  }

  if (x >= end) {
    return 0;
  }

  return (end - x) / (end - start);
}

function shoulderRight(x, start, end) {
  if (x <= start) {
    return 0;
  }

  if (x >= end) {
    return 1;
  }

  return (x - start) / (end - start);
}

function computeActuatorPower(angleInput) {
  const angle = clamp(Number(angleInput) || 0, 0, 180);

  const low = shoulderLeft(angle, 30, 90);
  const medium = triangular(angle, 50, 90, 130);
  const high = shoulderRight(angle, 90, 150);

  const lowPower = 60;
  const mediumPower = 145;
  const highPower = 230;

  const numerator = low * lowPower + medium * mediumPower + high * highPower;
  const denominator = low + medium + high;

  const crisp = denominator === 0 ? 0 : numerator / denominator;
  return Math.round(clamp(crisp, 0, 255));
}

module.exports = {
  computeActuatorPower,
};
