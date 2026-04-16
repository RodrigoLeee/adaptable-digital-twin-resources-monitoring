import fs from 'fs';
import path from 'path';
import { ModelBundle } from '../types';

let bundle: ModelBundle | null = null;

export function loadModelBundle(): ModelBundle {
  if (bundle) return bundle;

  const bundlePath = process.env.MODEL_BUNDLE_PATH ?? './model_bundle';
  const resolve = (file: string) => path.resolve(bundlePath, file);

  const read = (file: string) => JSON.parse(fs.readFileSync(resolve(file), 'utf-8'));

  bundle = {
    predictor: read('predictor.json'),
    positioner: read('positioner.json'),
    scaler: read('scaler.json'),
    scenarioDb: read('scenario_db.json'),
    rules: read('rules.json'),
    metadata: read('model_metadata.json'),
  };

  console.log(`[${new Date().toISOString()}] Model bundle loaded (version ${bundle.metadata.model_version})`);
  return bundle;
}
