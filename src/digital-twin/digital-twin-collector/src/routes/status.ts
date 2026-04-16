import { Router, Request, Response } from 'express';
import { getStore } from '../store/lastState';
import { checkApiReachable } from '../sender/apiSender';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const store = getStore();
  const apiReachable = await checkApiReachable();

  res.json({
    collector_status: 'ok',
    api_reachable: apiReachable,
    last_collection: store.lastCollection,
    last_recommendation_status: store.lastRecommendation?.status ?? null,
    collections_total: store.collectionsTotal,
    client_profile: store.lastClientProfile,
  });
});

export default router;
