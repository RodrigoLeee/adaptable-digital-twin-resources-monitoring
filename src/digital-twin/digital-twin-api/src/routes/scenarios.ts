import { Router, Request, Response } from 'express';
import { loadModelBundle } from '../model/loader';

const router = Router();

router.get('/scenarios', (_req: Request, res: Response) => {
  const bundle = loadModelBundle();
  res.json({
    count: bundle.scenarioDb.length,
    topology: bundle.metadata.topology,
    scenarios: bundle.scenarioDb.map(s => ({
      scenario: s.scenario,
      n_tasks: s.n_tasks,
      energy_total_kwh: s.energy_total_kwh,
      wait_mean_s: s.wait_mean_s,
      estimated_cost_usd: s.estimated_cost_usd,
      completion_rate_pct: s.completion_rate_pct,
    })),
  });
});

export default router;
