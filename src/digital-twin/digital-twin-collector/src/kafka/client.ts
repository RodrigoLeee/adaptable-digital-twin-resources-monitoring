import { Kafka, logLevel } from 'kafkajs';

let kafka: Kafka | null = null;

export function getKafka(): Kafka {
  if (kafka) return kafka;
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:19092')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'digital-twin-collector',
    brokers,
    logLevel: logLevel.NOTHING,
  });
  return kafka;
}

export const WORKLOAD_TOPIC = process.env.WORKLOAD_TOPIC || 'workload.events';
export const RECOMMENDATIONS_TOPIC = process.env.RECOMMENDATIONS_TOPIC || 'dt.recommendations';
