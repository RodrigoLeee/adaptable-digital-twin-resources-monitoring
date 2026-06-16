"""
producer.py — Publica o stream de workload no tópico Kafka `workload.events`.

Fonte de dados em tempo real do gêmeo digital: em vez de datasets estáticos
gerados ao fim das simulações, emite continuamente eventos representativos da
topologia simulada (ver workload_generator.py).

Config via variáveis de ambiente (.env):
  KAFKA_BROKERS    (default localhost:19092)
  WORKLOAD_TOPIC   (default workload.events)
  INTERVAL_S       (default 2.0)   intervalo entre eventos
  CLIENT_ID        (default demo)
  WINDOW_S         (default 60)
  PROFILES_PATH    (default ../digital-twin-api/model_bundle/scenario_db.json)
  SEED             (opcional)
"""
from __future__ import annotations

import json
import os
import signal
import sys
import time

from dotenv import load_dotenv
from confluent_kafka import Producer

from workload_generator import WorkloadGenerator, load_profiles

load_dotenv()

BROKERS = os.getenv("KAFKA_BROKERS", "localhost:19092")
TOPIC = os.getenv("WORKLOAD_TOPIC", "workload.events")
INTERVAL_S = float(os.getenv("INTERVAL_S", "2.0"))
CLIENT_ID = os.getenv("CLIENT_ID", "demo")
WINDOW_S = int(os.getenv("WINDOW_S", "60"))
PROFILES_PATH = os.getenv("PROFILES_PATH") or None
SEED = int(os.getenv("SEED")) if os.getenv("SEED") else None

_running = True


def _stop(*_a):
    global _running
    _running = False


def _delivery(err, msg):
    if err is not None:
        print(f"[producer] delivery failed: {err}", file=sys.stderr)


def main() -> int:
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    producer = Producer({"bootstrap.servers": BROKERS, "client.id": f"dt-producer-{CLIENT_ID}"})
    gen = WorkloadGenerator(
        profiles=load_profiles(PROFILES_PATH),
        client_id=CLIENT_ID,
        window_s=WINDOW_S,
        seed=SEED,
    )

    print(f"[producer] brokers={BROKERS} topic={TOPIC} interval={INTERVAL_S}s -- Ctrl+C to stop")
    n = 0
    while _running:
        event = gen.next_event()
        producer.produce(
            TOPIC,
            key=CLIENT_ID,
            value=json.dumps(event, ensure_ascii=False).encode("utf-8"),
            on_delivery=_delivery,
        )
        producer.poll(0)
        n += 1
        st = event["state"]
        print(f"[producer] #{n} {event['source_profile']}: "
              f"tasks={st['n_tasks_active']} hosts={st['hosts_active']} "
              f"dur_h={st['sim_duration_h']}")
        time.sleep(INTERVAL_S)

    print("[producer] flushing...")
    producer.flush(10)
    print(f"[producer] stopped after {n} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
