#!/bin/bash
# Executa as simulações OpenDC para os 7 workloads.
# Deve ser rodado de dentro de src/opendc-simulation/.
#
# Pré-requisitos:
#   1. Copiar OpenDCExperimentRunner aqui:
#      cp -r ../../Recuperar/opendc-demos-main/OpenDCExperimentRunner ./
#   2. Ter rodado: python scripts/generate_workloads.py
#
# Uso:
#   bash scripts/run_simulations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER="$SIM_DIR/OpenDCExperimentRunner/bin/OpenDCExperimentRunner"
EXPERIMENT="$SIM_DIR/experiments/m7ixlarge_workloads.json"

echo "=== OpenDC — Simulação m7i.xlarge (7 workloads) ==="
echo "  Diretório: $SIM_DIR"
echo "  Runner:    $RUNNER"
echo "  Experimento: $EXPERIMENT"
echo ""

# Verificações
if [ ! -f "$RUNNER" ]; then
    echo "ERRO: OpenDCExperimentRunner não encontrado."
    echo "  Copie-o de: Recuperar/opendc-demos-main/OpenDCExperimentRunner/"
    echo "  Comando: cp -r ../../Recuperar/opendc-demos-main/OpenDCExperimentRunner $SIM_DIR/"
    exit 1
fi

if [ ! -f "$EXPERIMENT" ]; then
    echo "ERRO: Arquivo de experimento não encontrado: $EXPERIMENT"
    exit 1
fi

# Verificar se os workloads foram gerados
WL_DIR="$SIM_DIR/workload_traces/generated_workloads"
if [ ! -d "$WL_DIR/01_min" ]; then
    echo "ERRO: Workloads não gerados. Execute primeiro:"
    echo "  python scripts/generate_workloads.py"
    exit 1
fi

chmod +x "$RUNNER"
cd "$SIM_DIR"

echo "Iniciando simulação..."
echo "  Saída → output/m7ixlarge_generated_workloads_experiment/raw-output/{0-6}/seed=0/"
echo ""

"$RUNNER" --experiment-path "experiments/m7ixlarge_workloads.json"

echo ""
echo "=== Simulação concluída ==="
echo "Próximo passo: python scripts/collect_data.py"
