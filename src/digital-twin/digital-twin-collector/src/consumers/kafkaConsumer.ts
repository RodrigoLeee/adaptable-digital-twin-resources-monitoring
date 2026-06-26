import { Consumer } from 'kafkajs';
import { getKafka, WORKLOAD_TOPIC } from '../kafka/client';
import { ApiPayload, ClientProfile, DatacenterState, SLA } from '../types';
import { sendToApi, saveResult } from '../sender/apiSender';
import { setLastState, setLastRecommendation } from '../store/lastState';
import { broadcastRecommendation } from '../sse';
import { publishRecommendation, initRecommendationProducer } from '../producers/recommendationProducer';
import logger from '../logger';

interface WorkloadEvent {
  client_id?: string;
  timestamp?: string;
  window_s?: number;
  source_profile?: string;
  state: DatacenterState;
  sla: SLA;
  client_profile?: ClientProfile;
}

let consumer: Consumer | null = null;

function defaultProfile(clientId: string): ClientProfile {
  return { client_id: clientId, name: clientId, priority: 'cost' };
}

async function handleEvent(raw: string): Promise<void> {
  const event = JSON.parse(raw) as WorkloadEvent;
  if (!event?.state || !event?.sla) {
    logger.warn('Skipping malformed workload event (missing state/sla)');
    return;
  }

  const clientId = event.client_id || 'demo';
  const profile = event.client_profile || defaultProfile(clientId);
  const payload: ApiPayload = { state: event.state, sla: event.sla, client_profile: profile };

  // Update internal state, run the recommendation model (via API), emit output.
  setLastState(event.state, profile);
  const recommendation = await sendToApi(payload);
  setLastRecommendation(recommendation);

  broadcastRecommendation(recommendation);
  await publishRecommendation(clientId, recommendation);

  if (process.env.SAVE_RESULTS === 'true') {
    await saveResult(clientId, recommendation).catch((e) =>
      logger.warn(`Failed to persist result: ${e instanceof Error ? e.message : e}`),
    );
  }

  logger.info(
    `Event ${event.source_profile ?? ''} -> status=${recommendation.status} ` +
      `tasks=${event.state.n_tasks_active} hosts=${event.state.hosts_active}`,
  );
}

/**
 * Event-driven mode: continuously consume workload events from Kafka, run the
 * recommendation model for each, and emit recommendations to SSE + Kafka.
 */
export async function startKafkaConsumer(): Promise<void> {
  await initRecommendationProducer();
  consumer = getKafka().consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'digital-twin-collector',
  });
  await consumer.connect();
  await consumer.subscribe({ topic: WORKLOAD_TOPIC, fromBeginning: false });
  logger.info(`Kafka consumer subscribed to ${WORKLOAD_TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;
      try {
        await handleEvent(value);
      } catch (err) {
        logger.error(`Error handling workload event: ${err instanceof Error ? err.message : err}`);
      }
    },
  });
}

export async function stopKafkaConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}
