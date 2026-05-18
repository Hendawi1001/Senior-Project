import normStats from './cardiac_norm_stats.json';

const WEIGHTS_1 = [
  [0.18, -0.12, 0.10],
  [0.14, -0.10, 0.12],
  [0.11, 0.04, -0.09],
  [0.12, 0.02, -0.05],
  [0.19, -0.06, 0.06],
  [0.09, 0.05, 0.02],
  [-0.10, 0.22, -0.11],
  [0.04, 0.18, -0.07],
  [0.16, -0.08, 0.08],
  [0.13, -0.03, 0.11],
  [-0.05, 0.20, 0.13],
  [0.08, 0.01, -0.02],
  [0.07, -0.07, 0.19],
  [0.13, 0.14, -0.04],
  [0.05, 0.09, 0.16],
  [0.02, -0.06, 0.15]
];

const BIAS_1 = [
  0.02, 0.01, -0.01, 0.0, 0.03, -0.02, 0.01, 0.02,
  0.0, 0.01, -0.01, 0.0, 0.02, 0.01, 0.0, -0.02
];

const WEIGHTS_2 = [
  [0.12, -0.08, 0.05, 0.06, 0.10, -0.02, 0.09, 0.05, -0.04, 0.07, -0.03, 0.08, -0.01, 0.06, 0.02, 0.04],
  [0.11, 0.10, -0.07, 0.08, -0.05, 0.14, -0.06, 0.09, 0.02, 0.12, 0.01, -0.03, 0.05, 0.04, 0.00, 0.06],
  [-0.04, 0.06, 0.02, 0.10, 0.08, -0.05, 0.13, 0.01, 0.09, -0.03, 0.07, 0.02, 0.04, 0.11, -0.02, 0.05],
  [0.07, 0.02, 0.04, 0.03, 0.12, 0.00, 0.08, -0.03, 0.11, 0.05, 0.09, -0.02, 0.07, 0.01, 0.06, 0.00],
  [0.10, 0.05, -0.03, 0.08, 0.06, 0.09, 0.01, 0.11, 0.04, 0.02, 0.07, 0.03, 0.05, 0.12, -0.01, 0.02],
  [-0.02, 0.09, 0.06, 0.04, 0.11, 0.03, 0.08, 0.05, 0.01, 0.10, -0.01, 0.07, 0.06, 0.00, 0.04, 0.12],
  [0.08, 0.03, 0.11, 0.02, 0.05, 0.07, 0.14, 0.01, 0.09, -0.04, 0.08, 0.02, 0.10, 0.06, 0.00, 0.03],
  [0.09, 0.01, 0.10, 0.04, 0.03, 0.02, 0.06, 0.12, -0.02, 0.05, 0.07, 0.08, 0.00, 0.09, 0.03, 0.11]
];

const BIAS_2 = [0.02, 0.01, 0.04, 0.0, 0.03, 0.02, 0.01, 0.05];

const WEIGHTS_OUT = [0.09, 0.12, 0.08, 0.05, -0.02, 0.11, 0.06, 0.10];
const BIAS_OUT = 0.04;

function dot(input, weights) {
  return input.reduce((sum, value, index) => sum + value * weights[index], 0);
}

class CardiacRiskNN {
  static normalizeFeature(value, mean, std) {
    if (typeof value !== 'number' || std === 0) return 0;
    return (value - mean) / std;
  }

  static normalizeInputs(bpm, spo2, age) {
    return [
      this.normalizeFeature(bpm, normStats.mean.bpm, normStats.std.bpm),
      this.normalizeFeature(spo2, normStats.mean.spo2, normStats.std.spo2),
      this.normalizeFeature(age, normStats.mean.age, normStats.std.age)
    ];
  }

  static relu(values) {
    return values.map(value => Math.max(0, value));
  }

  static sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  static linear(input, weights, bias) {
    return weights.map((neuronWeights, index) => dot(input, neuronWeights) + bias[index]);
  }

  static predict(bpm, spo2, age) {
    const normalized = this.normalizeInputs(bpm, spo2, age);
    const hidden1 = this.relu(this.linear(normalized, WEIGHTS_1, BIAS_1));
    const hidden2 = this.relu(this.linear(hidden1, WEIGHTS_2, BIAS_2));
    const rawOutput = dot(hidden2, WEIGHTS_OUT) + BIAS_OUT;
    return Math.round(this.sigmoid(rawOutput) * 1000) / 1000;
  }
}

export default CardiacRiskNN;
