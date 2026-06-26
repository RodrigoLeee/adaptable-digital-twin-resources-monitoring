# Gêmeo Digital Adaptável ao Cliente para Monitoramento de Consumo de Recursos em Infraestrutura de Nuvem

## 1. Introdução

&emsp;Este documento registra o desenvolvimento de uma Iniciação Científica conduzida no Inteli — Instituto de Tecnologia e Liderança, sob orientação do Prof. Reginaldo Arakaki e coorientação da Prof.ª Fabiana Martins de Oliveira. O projeto investiga a concepção e implementação de um gêmeo digital adaptável para monitoramento de consumo de recursos em infraestrutura de nuvem, com foco nas dimensões de CPU, memória e energia.

### 1.1 Objetivo do Documento

&emsp;O objetivo deste documento é formalizar a estrutura conceitual, arquitetural e metodológica que orienta o repositório técnico do projeto. Para além da descrição de funcionalidades, este documento registra o processo de engenharia: a definição de requisitos, a modelagem arquitetural, a implementação incremental e os critérios de avaliação experimental.

&emsp;O percurso técnico desenvolvido compreende quatro etapas principais. Primeiro, a geração e execução de simulações no OpenDC, representando diferentes perfis operacionais de clientes. Segundo, a análise dos dados simulados com bibliotecas Python, cujos resultados e visualizações estão documentados em `analysis.md`. Terceiro, o treinamento de um modelo de recomendação sobre os dados analisados. Quarto, a integração desse modelo ao gêmeo digital, que detecta o estado da infraestrutura e entrega recomendações contextualizadas ao operador.

&emsp;Assim, este documento assegura rastreabilidade entre concepção, arquitetura e implementação, garantindo coerência técnica e reprodutibilidade ao longo do ciclo de desenvolvimento.

## 2. Entendimento do Projeto

&emsp;A premissa central deste projeto é que o valor de um sistema de monitoramento não reside apenas na coleta de métricas, mas na capacidade de interpretá-las à luz da arquitetura, das prioridades operacionais e do perfil de uso de cada organização. Ferramentas amplamente utilizadas — como AWS CloudWatch e Azure Monitor — operam com parâmetros genéricos, produzindo alertas descontextualizados que dificultam a identificação de ineficiências reais e aumentam o ruído operacional.

&emsp;Para endereçar esse problema, o projeto propõe um gêmeo digital cuja adaptabilidade é variável central do sistema: thresholds, regras de análise e modelos de custo refletem características específicas de cada cliente — como padrões de carga, sensibilidade a custos e prioridades de operação. O desenvolvimento é conduzido de forma iterativa, articulando especificação arquitetural, simulação, análise de dados e validação experimental.

### 2.1 Problema

&emsp;Organizações dependem cada vez mais de infraestrutura de nuvem para sustentar operações e serviços digitais. Entretanto, a gestão eficiente desses recursos permanece um desafio recorrente: desperdícios e superdimensionamentos podem ocorrer de maneira silenciosa, elevando custos e ampliando impactos associados ao consumo energético. Em paralelo, soluções de monitoramento amplamente utilizadas tendem a operar de modo genérico, produzindo alertas e indicadores com baixo grau de contextualização, o que dificulta distinguir sinais relevantes de eventos rotineiros e reduz a efetividade da resposta operacional.

&emsp;O problema central enfrentado por este projeto é a ausência de um mecanismo acessível e tecnicamente consistente que, além de medir consumo de CPU, memória e energia, consiga adaptar o monitoramento às características específicas de cada cliente. Essa adaptação envolve refletir diferenças de carga, prioridades estratégicas, complexidade arquitetural e políticas de operação, permitindo que o sistema reduza falsos positivos, aumente a precisão na identificação de ineficiências e forneça recomendações mais alinhadas ao contexto real de uso. Assim, o desafio não é apenas coletar dados, mas estruturar um gêmeo digital que incorpore perfis configuráveis e que possibilite avaliar, de forma contínua, como a arquitetura e os padrões de operação influenciam o consumo e as oportunidades de otimização.

## 3. Modelagem de Negócios Business Drivers

&emsp;A figura a seguir apresenta o diagrama de Business Drivers do projeto, mapeando as principais motivações de negócio que justificam o desenvolvimento do gêmeo digital adaptável. Os drivers identificados contextualizam o problema do monitoramento genérico frente às necessidades reais de organizações que operam infraestrutura de nuvem, evidenciando as forças que impulsionam a demanda por uma solução adaptável ao perfil do cliente.

<br/>
<div align="center">
  <sub>Figura 1 - Business Drivers </sub> <br>
  <img src="assets/business_drivers.png" width="100%" /> <br>
  <sup>Fonte: Material produzido pelos autores (2026)</sup> <br>
</div>
<br/>

## 4. Modelo de Negócios IDEF0

&emsp;A figura a seguir apresenta o modelo IDEF0 do sistema, descrevendo funcionalmente as atividades principais do gêmeo digital e as relações entre entradas, saídas, controles e mecanismos. O modelo estrutura o fluxo desde a coleta de dados de infraestrutura até a geração de recomendações, explicitando os elementos que controlam cada função e os recursos necessários para sua execução.

<br/>
<div align="center">
  <sub>Figura 2 - Modelo IDEF0 </sub> <br>
  <img src="assets/business_idef0.png" width="100%" /> <br>
  <sup>Fonte: Material produzido pelos autores (2026)</sup> <br>
</div>
<br/>

## 5. Requisitos do Projeto

### 5.1 Requisitos Não Funcionais

#### 5.1.1 Definição dos Requisitos Não Funcionais
- Confiabilidade (e 1 SLA)
- Disponbilidade (e 1 SLA)
- Segurança (e 1 SLA)
#### 5.1.2 Táticas Arquiteturais dos Requisitos Não Funcionais

## 6. Solução Integração

&emsp;A figura a seguir apresenta o diagrama de integração do sistema, ilustrando como as três camadas do gêmeo digital se comunicam. O collector é responsável por coletar e normalizar o estado da infraestrutura — métricas de CPU, memória e energia — e encaminhá-lo à API. A API carrega o modelo de recomendação treinado, processa o estado recebido e retorna recomendações contextualizadas ao perfil do cliente. O dashboard consome essas recomendações e as exibe ao operador em tempo real via SSE.

<br/>
<div align="center">
  <sub>Figura 3 - Solução de Integração </sub> <br>
  <img src="assets/solucao_integracao.png" width="100%" /> <br>
  <sup>Fonte: Material produzido pelos autores (2026)</sup> <br>
</div>
<br/>

&emsp;A integração evoluiu de um fluxo *pull* — em que o collector fazia *polling* de arquivos parquet gerados ao final das simulações — para um fluxo **orientado a eventos**. Um broker **Redpanda** (compatível com a API Kafka) passa a intermediar a comunicação: um produtor publica continuamente o estado da infraestrutura no tópico `workload.events`, o gêmeo digital consome esse fluxo em tempo real, executa o modelo a cada evento e publica recomendações estruturadas no tópico `dt.recommendations`, além de transmiti-las ao dashboard via SSE. As três camadas (collector, API e dashboard) permanecem, mas a fonte de dados deixa de ser um lote consolidado e passa a ser um stream contínuo, aproximando o sistema de um cenário operacional real.

## 7. Componentes Serviços Legado

## 8. Modelagem de Dados

## 9. Solução Técnica (Design)

&emsp;Esta seção descreve o percurso de design da solução, da caracterização dos padrões de consumo até a operação em tempo real do gêmeo digital. Cada etapa apoia-se na anterior, formando um fluxo coeso entre simulação, análise, modelagem e entrega contínua de recomendações.

### 9.1 Definição dos padrões de consumo

&emsp;O ponto de partida foi caracterizar como uma infraestrutura de nuvem é exercitada na prática. Em vez de um único cenário, definiu-se um espectro de **sete perfis de carga** — de `01_min` a `07_max` — parametrizados sobre uma topologia de referência `m7i.xlarge` (cluster de 100 hosts, cada um com 4 vCPUs, potência *idle* de 70 W e máxima de 200 W). Cada perfil ajusta fatores de fração de tarefas, duração, uso de CPU e memória, varrendo de **10 a 350 tarefas** por execução. Esse leque estabeleceu o vocabulário do projeto: cada padrão de consumo representa um regime operacional distinto que o sistema precisaria reconhecer e tratar.

### 9.2 Simulação no OpenDC

&emsp;Com os perfis definidos, cada um foi submetido ao **OpenDC** sobre a topologia `m7ixlarge`, reproduzindo o comportamento da infraestrutura sob aquela carga. As execuções produziram *traces* detalhados — `tasks.parquet`, `fragments.parquet` e um `summary.json` por workload — capturando submissão, escalonamento e conclusão das tarefas, consumo energético e ocupação de recursos. A simulação transformou os padrões abstratos em **evidência quantitativa e reprodutível**, sem custo de infraestrutura real.

### 9.3 Análise dos resultados

&emsp;A consolidação dos sete cenários revelou o achado que orientaria todo o restante: o cluster de 100 hosts estava **massivamente sobredimensionado**. Em todos os regimes, a utilização de CPU permanecia próxima de 0%, a taxa de conclusão em 100%, a saturação nula, e a energia era dominada pelo consumo *idle* (~70 W por host, ~7 kW de cluster, praticamente independente da carga). Métricas derivadas — `tasks_per_kwh`, `cost_per_task` — evidenciaram o desperdício silencioso, exatamente o tipo de ineficiência que ferramentas genéricas de monitoramento não revelam. Essa análise tornou-se a base de cenários (`scenario_db`) e os limiares de referência (`rules`) do modelo. O detalhamento estatístico e as visualizações estão documentados em `analysis.md`.

### 9.4 Modelo de recomendação

&emsp;De posse dessa evidência, o modelo foi concebido não como um *preditor que ecoa* o resultado simulado, mas como um **otimizador**. A ideia central é usar as simulações como matéria-prima para calcular a configuração ótima de recursos. Dado um workload, o modelo estima a demanda real de compute pela Lei de Little (`concorrência = nº_tarefas × tempo_exec / janela`), converte-a em cores necessários e busca o **menor número de hosts** que atende à demanda dentro de uma banda-alvo de utilização (70%). Como custo e energia crescem monotonicamente com o número de hosts e o SLA é mantido enquanto há capacidade, esse mínimo equivale a **minimizar custo + energia sob SLA**. O resultado é serializado em um pacote portátil de artefatos JSON (`scaler`, `predictor`, `positioner`, `rules`, `scenario_db` e `optimizer`), consumível tanto em Python quanto em Node.js. Para o estado de referência, o modelo recomenda **reduzir de 100 para 4 hosts — uma economia de ~96%** mantendo 100% de conclusão.

### 9.5 Gêmeo digital

&emsp;O modelo foi encapsulado em um **gêmeo digital de três camadas**. O *collector* coleta e normaliza o estado da infraestrutura (CPU, memória, energia); a *API* carrega o pacote do modelo e, a cada estado recebido, retorna uma recomendação estruturada em **JSON** — incluindo o bloco `optimization` com a configuração ótima, a economia projetada e a viabilidade sob SLA, além de recomendações por categoria (capacidade, energia, latência, custo e confiabilidade); e o *dashboard* exibe tudo ao operador em tempo real via SSE. Assim, o gêmeo digital traduz o modelo de otimização em uma **decisão contextualizada e acionável**, adaptável ao perfil de cada cliente.

### 9.6 Camada Kafka de alimentação em tempo real

&emsp;Por fim, para aproximar o sistema de um cenário operacional real, a alimentação deixou de ser por lotes pós-simulação e passou a ser **orientada a eventos**. Um broker **Redpanda** (compatível com a API Kafka) e um **produtor em Python** geram continuamente um workload representativo da topologia, publicando eventos no tópico `workload.events`. O gêmeo digital consome esse fluxo de forma contínua: para cada evento, atualiza seu estado interno, executa o modelo e **emite recomendações dinâmicas** — para o tópico `dt.recommendations` (integrável a dashboards e APIs) e para o dashboard via SSE. Com isso, o sistema deixa de observar apenas o passado consolidado e passa a **recomendar continuamente, com base no comportamento corrente da infraestrutura**, fechando o ciclo de um gêmeo digital adaptável e em tempo real.

## 10. Componentes Adotados em relação as Táticas Arquiteturais

## 11. Especificação da Solução Técnica

## 12. Implementação dos Mecanismos Arquiteturais

## 13. Mapeamento Técnico de Infraestrutura e Implantação

## 14. Justificativa das Escolhas de Implantação

## 15. Considerações sobre Desempenho e Segurança
-------------------------------------------------------
--------------------------------------------



