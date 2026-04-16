import { ScalerParams, Predictor, Predictions, Positioner } from '../types';

export function scaleInput(raw: number[], scaler: ScalerParams): number[] {
  return raw.map((v, i) => (v - scaler.mean_[i]) / scaler.scale_[i]);
}

export function polyval(coeffs: number[], x: number): number {
  return coeffs.reduce((acc: number, c: number) => acc * x + c, 0);
}

export function predict(nTasks: number, predictor: Predictor): Predictions {
  const results: Record<string, number> = {};
  for (const [target, info] of Object.entries(predictor)) {
    let val = polyval(info.coefficients, nTasks);
    val = Math.max(info.y_range[0] * 0.5, Math.min(info.y_range[1] * 2.0, val));
    results[target] = val;
  }
  return results as unknown as Predictions;
}

export interface KnnNeighbor {
  index: number;
  scenario: string;
  dist: number;
}

export function knnFind(xScaled: number[], positioner: Positioner): KnnNeighbor[] {
  return positioner.X_scaled
    .map((centroid, i) => ({
      index: i,
      scenario: positioner.scenarios[i],
      dist: Math.sqrt(centroid.reduce((s, v, j) => s + Math.pow(v - xScaled[j], 2), 0)),
    }))
    .sort((a, b) => a.dist - b.dist);
}
