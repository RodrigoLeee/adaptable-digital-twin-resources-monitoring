"""
workload_generator.py — Gera um stream de workload representativo da topologia
m7i.xlarge para o gêmeo digital.

Usa os 7 cenários simulados (scenario_db.json) como perfis-base e percorre-os ao
longo do tempo com jitter, produzindo eventos por janela cujo `state` é compatível
com o `DatacenterState` esperado pela API. O cluster permanece em `hosts_active`
fixo (100, sobre-provisionado) para que o otimizador recomende o right-sizing.
"""
from __future__ import annotations

import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

HERE = Path(__file__).resolve().parent
DEFAULT_PROFILES = (
    HERE.parent / "digital-twin-api" / "model_bundle" / "scenario_db.json"
)


def load_profiles(path: str | os.PathLike | None = None) -> list[dict[str, Any]]:
    p = Path(path) if path else DEFAULT_PROFILES
    data = json.loads(Path(p).read_text(encoding="utf-8"))
    # ordena por carga para um passeio suave entre perfis
    return sorted(data, key=lambda s: s["n_tasks"])


def _jitter(value: float, pct: float, rng: random.Random) -> float:
    return value * (1.0 + rng.uniform(-pct, pct))


class WorkloadGenerator:
    """Produz eventos de workload, percorrendo os perfis em onda (sobe e desce)."""

    def __init__(
        self,
        profiles: list[dict[str, Any]] | None = None,
        *,
        hosts_active: int = 100,
        client_id: str = "demo",
        window_s: int = 60,
        jitter_pct: float = 0.15,
        sla: dict[str, float] | None = None,
        seed: int | None = None,
    ) -> None:
        self.profiles = profiles or load_profiles()
        self.hosts_active = hosts_active
        self.client_id = client_id
        self.window_s = window_s
        self.jitter_pct = jitter_pct
        self.sla = sla or {
            "max_energy_kwh": 0.015,
            "max_wait_s": 0.55,
            "max_cost_usd": 0.008,
            "max_cpu_pct": 85.0,
        }
        self._rng = random.Random(seed)
        self._i = 0
        self._dir = 1  # direção do passeio entre perfis

    def _next_profile(self) -> dict[str, Any]:
        prof = self.profiles[self._i]
        # passeio em onda: 0 → N-1 → 0 ...
        if self._i == len(self.profiles) - 1:
            self._dir = -1
        elif self._i == 0:
            self._dir = 1
        self._i += self._dir
        return prof

    def next_event(self) -> dict[str, Any]:
        prof = self._next_profile()
        j = self.jitter_pct
        n_tasks = max(1, round(_jitter(prof["n_tasks"], j, self._rng)))
        exec_mean_s = max(0.0, _jitter(prof["exec_mean_s"], j, self._rng))
        sim_duration_h = max(1e-6, _jitter(prof["sim_duration_h"], j, self._rng))
        wait_mean_s = max(0.0, _jitter(prof["wait_mean_s"], j, self._rng))
        energy_kwh = max(0.0, _jitter(prof["energy_total_kwh"], j, self._rng))

        return {
            "client_id": self.client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "window_s": self.window_s,
            "source_profile": prof["scenario"],
            "state": {
                "n_tasks_active": n_tasks,
                "exec_mean_s": round(exec_mean_s, 6),
                "sim_duration_h": round(sim_duration_h, 8),
                "energy_consumed_kwh": round(energy_kwh, 8),
                "wait_mean_s": round(wait_mean_s, 6),
                "hosts_active": self.hosts_active,
            },
            "sla": self.sla,
        }

    def stream(self) -> Iterator[dict[str, Any]]:
        while True:
            yield self.next_event()


if __name__ == "__main__":
    gen = WorkloadGenerator(seed=42)
    for _ in range(8):
        print(json.dumps(gen.next_event(), ensure_ascii=False))
