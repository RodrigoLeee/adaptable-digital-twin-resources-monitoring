"""
Gera os 7 workloads para simulação no OpenDC — topologia m7i.xlarge.
Código original de 01/04/2025 (Google Colab), adaptado para rodar localmente.

Executar de dentro de src/opendc-simulation/:
  python scripts/generate_workloads.py

Saída: workload_traces/generated_workloads/{01_min … 07_max_experimental_useful}/
  tasks.parquet · fragments.parquet · summary.json
"""

import json
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
OUT_ROOT     = PROJECT_ROOT / "workload_traces" / "generated_workloads"
OUT_ROOT.mkdir(parents=True, exist_ok=True)

# ── Config base workload ──────────────────────────────────────────────────────
N_TASKS     = 500
RANDOM_SEED = 42

# ── Limites da topologia m7i.xlarge ──────────────────────────────────────────
HOST_MAX_CPU_COUNT    = 4
HOST_MAX_MEM_CAPACITY = 16384   # MiB
HOST_MAX_CPU_CAPACITY = None
HOST_MAX_CPU_USAGE    = None

# ── Schemas Parquet (críticos para o OpenDC) ──────────────────────────────────
TASK_SCHEMA = pa.schema([
    pa.field("id",              pa.int32(),   nullable=False),
    pa.field("submission_time", pa.int64(),   nullable=False),
    pa.field("duration",        pa.int64(),   nullable=False),
    pa.field("cpu_count",       pa.int32(),   nullable=False),
    pa.field("cpu_capacity",    pa.float64(), nullable=False),
    pa.field("mem_capacity",    pa.int64(),   nullable=False),
    pa.field("deferrable",      pa.bool_(),   nullable=True),
    pa.field("deadline",        pa.int64(),   nullable=True),
])

FRAGMENT_SCHEMA = pa.schema([
    pa.field("id",        pa.int32(),   nullable=False),
    pa.field("duration",  pa.int64(),   nullable=False),
    pa.field("cpu_usage", pa.float64(), nullable=False),
])

# ── 7 níveis de carga ─────────────────────────────────────────────────────────
LEVELS = [
    {"name": "01_min",                    "fraction": 0.02, "time_factor": 3.00,
     "duration_factor": 0.50, "cpu_factor": 0.50, "mem_factor": 0.50, "usage_factor": 0.50},
    {"name": "02_very_low",               "fraction": 0.05, "time_factor": 2.20,
     "duration_factor": 0.70, "cpu_factor": 0.70, "mem_factor": 0.70, "usage_factor": 0.70},
    {"name": "03_low",                    "fraction": 0.10, "time_factor": 1.60,
     "duration_factor": 0.85, "cpu_factor": 0.85, "mem_factor": 0.85, "usage_factor": 0.85},
    {"name": "04_medium",                 "fraction": 0.20, "time_factor": 1.00,
     "duration_factor": 1.00, "cpu_factor": 1.00, "mem_factor": 1.00, "usage_factor": 1.00},
    {"name": "05_high",                   "fraction": 0.35, "time_factor": 0.75,
     "duration_factor": 1.10, "cpu_factor": 1.10, "mem_factor": 1.10, "usage_factor": 1.10},
    {"name": "06_very_high",              "fraction": 0.50, "time_factor": 0.60,
     "duration_factor": 1.20, "cpu_factor": 1.20, "mem_factor": 1.20, "usage_factor": 1.20},
    {"name": "07_max_experimental_useful","fraction": 0.70, "time_factor": 0.45,
     "duration_factor": 1.30, "cpu_factor": 1.25, "mem_factor": 1.25, "usage_factor": 1.25},
]

# ── Passo 1: Gerar base workload (500 tasks, seed=42) ────────────────────────

def generate_base(seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    np.random.seed(seed)
    n = N_TASKS
    ids = np.arange(n, dtype=np.int32)

    submission_time = np.cumsum(
        np.random.exponential(scale=10, size=n)
    ).astype(np.int64)

    duration    = np.random.randint(50, 500, size=n).astype(np.int64)
    cpu_count   = np.random.choice([1, 2, 4], size=n).astype(np.int32)
    cpu_capacity = np.random.uniform(0.3, 1.0, size=n).astype(np.float64)
    mem_capacity = np.random.choice(
        [512, 1024, 2048, 4096, 8192], size=n
    ).astype(np.int64)
    deferrable  = np.random.choice([True, False], size=n)
    deadline    = submission_time + duration + np.random.randint(50, 200, size=n)

    tasks_df = pd.DataFrame({
        "id":              ids,
        "submission_time": submission_time,
        "duration":        duration,
        "cpu_count":       cpu_count,
        "cpu_capacity":    cpu_capacity,
        "mem_capacity":    mem_capacity,
        "deferrable":      deferrable,
        "deadline":        deadline,
    })

    # Fragments: 1–3 por task, duração dividida via Dirichlet
    frag_rows = []
    for task_id, dur in zip(ids, duration):
        n_frag = np.random.randint(1, 4)
        split  = np.random.dirichlet(np.ones(n_frag)) * dur
        split  = np.round(split).astype(int)
        split[0] += dur - split.sum()
        for d in split:
            frag_rows.append({
                "id":        int(task_id),
                "duration":  int(max(1, d)),
                "cpu_usage": float(np.random.uniform(0.3, 1.0)),
            })

    fragments_df = pd.DataFrame(frag_rows)
    return tasks_df, fragments_df

# ── Funções auxiliares ────────────────────────────────────────────────────────

def sample_tasks(df: pd.DataFrame, fraction: float, seed: int) -> pd.DataFrame:
    n = max(1, int(len(df) * fraction))
    return (df.sample(n=n, random_state=seed, replace=False)
              .sort_values(["submission_time", "id"])
              .reset_index(drop=True))


def transform_submission_time(df: pd.DataFrame, time_factor: float) -> pd.DataFrame:
    out = df.copy()
    t0  = int(out["submission_time"].min())
    out["submission_time"] = (
        ((out["submission_time"] - t0) * time_factor) + t0
    ).round().astype("int64")
    return out


def enforce_host_limits(out: pd.DataFrame) -> pd.DataFrame:
    out = out.copy()
    out["cpu_count"]    = out["cpu_count"].clip(lower=1, upper=HOST_MAX_CPU_COUNT).astype("int32")
    out["mem_capacity"] = out["mem_capacity"].clip(lower=1, upper=HOST_MAX_MEM_CAPACITY).astype("int64")
    if HOST_MAX_CPU_CAPACITY is not None:
        out["cpu_capacity"] = out["cpu_capacity"].clip(lower=0, upper=HOST_MAX_CPU_CAPACITY).astype("float64")
    return out


def validate_fit(tasks_df: pd.DataFrame):
    bad_cpu = tasks_df[tasks_df["cpu_count"] > HOST_MAX_CPU_COUNT]
    bad_mem = tasks_df[tasks_df["mem_capacity"] > HOST_MAX_MEM_CAPACITY]
    if not bad_cpu.empty or not bad_mem.empty:
        raise ValueError(
            f"Workload inválido: {len(bad_cpu)} tasks com cpu_count>{HOST_MAX_CPU_COUNT}, "
            f"{len(bad_mem)} tasks com mem_capacity>{HOST_MAX_MEM_CAPACITY}"
        )


def transform_tasks(df: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    out = df.copy()
    out = transform_submission_time(out, cfg["time_factor"])
    out["duration"]     = (out["duration"] * cfg["duration_factor"]).round().clip(lower=1).astype("int64")
    out["cpu_count"]    = (out["cpu_count"] * cfg["cpu_factor"]).round().clip(lower=1).astype("int32")
    out["cpu_capacity"] = (out["cpu_capacity"] * cfg["cpu_factor"]).astype("float64")
    out["mem_capacity"] = (out["mem_capacity"] * cfg["mem_factor"]).round().clip(lower=1).astype("int64")
    out = enforce_host_limits(out)

    has_deadline = out["deadline"].notna()
    if has_deadline.any():
        slack = (out.loc[has_deadline, "deadline"].astype("int64")
                 - out.loc[has_deadline, "submission_time"].astype("int64"))
        slack = (slack * max(cfg["duration_factor"], 1.0)).round().astype("int64")
        out.loc[has_deadline, "deadline"] = (
            out.loc[has_deadline, "submission_time"].astype("int64") + slack
        )

    out = out[["id", "submission_time", "duration", "cpu_count",
               "cpu_capacity", "mem_capacity", "deferrable", "deadline"]]
    out["id"]              = out["id"].astype("int32")
    out["submission_time"] = out["submission_time"].astype("int64")
    out["duration"]        = out["duration"].astype("int64")
    out["cpu_count"]       = out["cpu_count"].astype("int32")
    out["cpu_capacity"]    = out["cpu_capacity"].astype("float64")
    out["mem_capacity"]    = out["mem_capacity"].astype("int64")
    out["deferrable"]      = out["deferrable"].astype("boolean")
    out["deadline"]        = out["deadline"].astype("Int64")

    validate_fit(out)
    return out


def transform_fragments(frags: pd.DataFrame, valid_ids: pd.Series, cfg: dict) -> pd.DataFrame:
    out = frags[frags["id"].isin(valid_ids)].copy()
    out["duration"]  = (out["duration"] * cfg["duration_factor"]).round().clip(lower=1).astype("int64")
    out["cpu_usage"] = (out["cpu_usage"] * cfg["usage_factor"]).astype("float64")
    if HOST_MAX_CPU_USAGE is not None:
        out["cpu_usage"] = out["cpu_usage"].clip(lower=0, upper=HOST_MAX_CPU_USAGE).astype("float64")
    out = out[["id", "duration", "cpu_usage"]]
    out["id"]       = out["id"].astype("int32")
    out["duration"] = out["duration"].astype("int64")
    return out


def build_summary(tasks_df: pd.DataFrame, frags_df: pd.DataFrame, cfg: dict) -> dict:
    return {
        "workload_name":    cfg["name"],
        "parameters":       cfg,
        "host_limits":      {
            "max_cpu_count":    HOST_MAX_CPU_COUNT,
            "max_mem_capacity": HOST_MAX_MEM_CAPACITY,
            "max_cpu_capacity": HOST_MAX_CPU_CAPACITY,
            "max_cpu_usage":    HOST_MAX_CPU_USAGE,
        },
        "n_tasks":              int(len(tasks_df)),
        "n_fragments":          int(len(frags_df)),
        "submission_time_min":  int(tasks_df["submission_time"].min()),
        "submission_time_max":  int(tasks_df["submission_time"].max()),
        "avg_duration":         float(tasks_df["duration"].mean()),
        "avg_cpu_count":        float(tasks_df["cpu_count"].mean()),   # lido pelo notebook
        "max_cpu_count":        int(tasks_df["cpu_count"].max()),
        "avg_cpu_capacity":     float(tasks_df["cpu_capacity"].mean()),
        "max_cpu_capacity":     float(tasks_df["cpu_capacity"].max()),
        "avg_mem_capacity":     float(tasks_df["mem_capacity"].mean()),
        "max_mem_capacity":     int(tasks_df["mem_capacity"].max()),
        "avg_fragment_cpu_usage": float(frags_df["cpu_usage"].mean()) if len(frags_df) > 0 else 0.0,
        "max_fragment_cpu_usage": float(frags_df["cpu_usage"].max()) if len(frags_df) > 0 else 0.0,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Gerando base workload (500 tasks, seed=42)...")
    tasks_base, frags_base = generate_base(RANDOM_SEED)
    print(f"  Base: {len(tasks_base)} tasks, {len(frags_base)} fragments\n")

    summaries = []
    for i, cfg in enumerate(LEVELS, start=1):
        seed    = RANDOM_SEED + i
        out_dir = OUT_ROOT / cfg["name"]
        out_dir.mkdir(parents=True, exist_ok=True)

        sel_tasks = sample_tasks(tasks_base, cfg["fraction"], seed=seed)
        sel_tasks = transform_tasks(sel_tasks, cfg)
        sel_frags = transform_fragments(frags_base, sel_tasks["id"], cfg)

        # Salvar parquets
        pq.write_table(
            pa.Table.from_pandas(sel_tasks, schema=TASK_SCHEMA, preserve_index=False),
            out_dir / "tasks.parquet", compression="snappy"
        )
        pq.write_table(
            pa.Table.from_pandas(sel_frags, schema=FRAGMENT_SCHEMA, preserve_index=False),
            out_dir / "fragments.parquet", compression="snappy"
        )

        summary = build_summary(sel_tasks, sel_frags, cfg)
        summaries.append(summary)
        (out_dir / "summary.json").write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        print(
            f"  {cfg['name']:<35} "
            f"n={summary['n_tasks']:>3} | "
            f"avg_dur={summary['avg_duration']:.1f}ms | "
            f"avg_cpu={summary['avg_cpu_count']:.3f} | "
            f"sub_max={summary['submission_time_max']}ms"
        )

    # Tabela resumo global
    avg_cores_all = [s["avg_cpu_count"] for s in summaries]
    print(f"\nAvg cores/task (global): {sum(avg_cores_all)/len(avg_cores_all):.4f}  (histórico: 2.05)")

    summary_df = pd.DataFrame(summaries)
    summary_df.to_csv(OUT_ROOT / "workloads_summary.csv", index=False)
    print(f"\n✅ Gerados {len(LEVELS)} workloads em: {OUT_ROOT.resolve()}")
    print("Próximo passo: bash scripts/run_simulations.sh")


if __name__ == "__main__":
    main()
