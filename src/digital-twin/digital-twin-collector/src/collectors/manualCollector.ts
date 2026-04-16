import { CollectManualBody, ApiPayload } from '../types';
import { normalizeManualState } from '../normalizer/stateNormalizer';
import { sendToApi, saveResult } from '../sender/apiSender';
import { setLastState, setLastRecommendation } from '../store/lastState';
import { broadcastRecommendation } from '../sse';
import logger from '../logger';

export async function processManualCollection(body: CollectManualBody) {
  const { state: rawState, sla, client_profile } = body;

  const state = normalizeManualState(rawState);

  const payload: ApiPayload = { state, sla, client_profile };
  logger.info('Sending manual state to API', { client_id: client_profile.client_id });

  const recommendation = await sendToApi(payload);

  setLastState(state, client_profile);
  setLastRecommendation(recommendation);

  await saveResult(client_profile.client_id, recommendation);
  broadcastRecommendation(recommendation);

  logger.info('Manual collection complete', {
    client_id: client_profile.client_id,
    status: recommendation.status,
  });

  return { ...recommendation, client_profile };
}
