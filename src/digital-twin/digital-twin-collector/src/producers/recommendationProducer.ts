import { Producer } from 'kafkajs';
import { getKafka, RECOMMENDATIONS_TOPIC } from '../kafka/client';
import { Recommendation } from '../types';
import logger from '../logger';

let producer: Producer | null = null;

export async function initRecommendationProducer(): Promise<void> {
  if (producer) return;
  producer = getKafka().producer();
  await producer.connect();
  logger.info(`Recommendation producer connected (topic ${RECOMMENDATIONS_TOPIC})`);
}

/**
 * Publishes a structured recommendation (JSON) to the dt.recommendations topic —
 * the digital twin's output for dashboards, APIs and other consumers.
 */
export async function publishRecommendation(
  clientId: string,
  recommendation: Recommendation,
): Promise<void> {
  if (!producer) await initRecommendationProducer();
  await producer!.send({
    topic: RECOMMENDATIONS_TOPIC,
    messages: [{ key: clientId, value: JSON.stringify(recommendation) }],
  });
}

export async function disconnectRecommendationProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
