import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loadModelBundle } from '../model/loader';
import { recommend } from '../model/recommender';

const router = Router();

const StateSchema = z.object({
  n_tasks_active: z.number().nonnegative(),
  exec_mean_s: z.number().nonnegative(),
  sim_duration_h: z.number().nonnegative(),
  energy_consumed_kwh: z.number().nonnegative(),
  wait_mean_s: z.number().nonnegative(),
  hosts_active: z.number().nonnegative(),
});

const SLASchema = z.object({
  max_energy_kwh: z.number().nonnegative(),
  max_wait_s: z.number().nonnegative(),
  max_cost_usd: z.number().nonnegative(),
  max_cpu_pct: z.number().nonnegative().max(100).optional(),
});

const BodySchema = z.object({
  state: StateSchema,
  sla: SLASchema,
});

router.post('/recommend', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state, sla } = BodySchema.parse(req.body);
    const bundle = loadModelBundle();
    const result = recommend(state, sla, bundle);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
