# Cotação de Voo Executivo

Aplicação web para calcular rotas de voo executivo, estimar custos e gerar um PDF com o resumo da viagem.

## Como usar
1. Abra `index.html` em um navegador com acesso à internet.
2. Informe os aeroportos da rota e ajuste as configurações desejadas.
3. Clique em **Calcular & Traçar Rota** para ver o mapa e o resumo.
4. Após o cálculo, utilize **Gerar PDF** para baixar um orçamento com os itens selecionados.
5. A busca de aeroportos usa a API Aerodatabox já configurada com uma chave de teste (`84765bd38cmsh03b2568c9aa4a0fp1867f6jsnd28a64117f8b`). Substitua-a se possuir outra chave.

## Funcionalidades
- Busca simplificada de aeroportos por código ICAO ou nome.
- Cálculo de distância com opção de ida e volta.
- Ajuste de valores adicionais ou descontos.
- Exibição da rota em mapa interativo (Leaflet).
- Geração de PDF configurável (pdfmake).
- Campo para informações gerais com dados de pagamento pré-preenchidos.
- Layout de PDF aprimorado com cabeçalho centralizado e tabela estilizada.
- Resultados de aeroportos consistentes graças ao cache local.
