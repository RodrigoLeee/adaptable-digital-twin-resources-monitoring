import cron from 'node-cron';
import { getLastKnownState, getLastKnownProfile } from '../store/lastState';
import { sendToApi, saveResult } from '../sender/apiSender';
import { setLastRecommendation } from '../store/lastState';
import { broadcastRecommendation } from '../sse';
import logger from '../logger';

let scheduledTask: cron.ScheduledTask | null = null;

export function startScheduledCollector(): void {
  const intervalSeconds = parseInt(process.env.COLLECT_INTERVAL_SECONDS || '60', 10);

  if (isNaN(intervalSeconds) || intervalSeconds <= 0) {
    logger.warn('COLLECT_INTERVAL_SECONDS is invalid, scheduled collector disabled');
    return;
  }

  const cronExpression = `*/${intervalSeconds} * * * * *`;
  logger.info(`Scheduled collector starting with interval ${intervalSeconds}s (${cronExpression})`);

  scheduledTask = cron.schedule(cronExpression, async () => {
    const state = getLastKnownState();
    const profile = getLastKnownProfile();

    if (!state || !profile) {
      logger.debug('Scheduled collector: no state available yet, skipping');
      return;
    }

    try {
      const payload = { state, sla: defaultSla(), client_profile: profile };
      const recommendation = await sendToApi(payload);
      setLastRecommendation(recommendation);
      await saveResult(profile.client_id, recommendation);
      broadcastRecommendation(recommendation);
      logger.info('Scheduled collection complete', {
        client_id: profile.client_id,
        status: recommendation.status,
      });
    } catch (err) {
      logger.error('Scheduled collection failed', { error: (err as Error).message });
    }
  });
}

export function stopScheduledCollector(): void {
  scheduledTask?.stop();
  scheduledTask = null;
}

function defaultSla() {
  return {
    max_energy_kwh: Infinity,
    max_wait_s: Infinity,
    max_cost_usd: Infinity,
  };
}
