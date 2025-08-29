# Plano de Refatoração Incremental

## Objetivo
Reestruturar o código do sistema de cotação de voo executivo para melhorar a manutenibilidade, testabilidade e organização, sem quebrar funcionalidades existentes.

## Situação Atual
- Código principal concentrado em `app.js` (~900+ linhas)
- Mistura de responsabilidades: UI, cálculos, formatação, PDF, API
- Funções globais expostas no window
- Testes básicos existentes mas infraestrutura incompleta
- Sistema funcional com dois métodos de cálculo (distância e tempo)

## Estratégia de Refatoração

### Fase 1: Separação de Responsabilidades
- **Extrair módulo de cálculos**: `src/calculations/`
  - `priceCalculator.js` - lógica de preços por distância/tempo
  - `commissionCalculator.js` - cálculos de comissão
  - `distanceCalculator.js` - conversões NM/KM e distâncias
- **Extrair formatação**: `src/formatters/`
  - `currencyFormatter.js` - formatação BRL
  - `dateFormatter.js` - formatação de datas
- **Preservar**: Interface pública atual, IDs, métodos expostos no window

### Fase 2: Modularização da UI
- **Extrair gerenciamento de estado**: `src/state/`
  - `formState.js` - estado do formulário
  - `quoteState.js` - estado de cotações congeladas
- **Extrair componentes UI**: `src/ui/`
  - `formHandlers.js` - manipuladores de eventos
  - `dynamicFields.js` - campos dinâmicos (stops, comissões)
- **Preservar**: Comportamento atual, IDs de elementos

### Fase 3: Organização de Documentos PDF
- **Extrair geração PDF**: `src/pdf/`
  - `documentBuilder.js` - construção do documento
  - `styleDefinitions.js` - estilos PDF
  - `contentSections.js` - seções do documento
- **Preservar**: Formato atual do PDF, estrutura de dados

### Fase 4: Melhoria da Infraestrutura
- **Melhorar testes**: Setup do vitest, testes por módulo
- **Documentação**: README técnico, exemplos de uso
- **Build/Deploy**: Scripts de desenvolvimento
- **Preservar**: Funcionalidade atual 100%

## Princípios da Refatoração

1. **Mudanças Incrementais**: Um módulo por vez, sempre funcionando
2. **Backward Compatibility**: Manter API pública inalterada
3. **Testes Primeiro**: Garantir que funciona antes e depois
4. **Zero Downtime**: Sistema sempre utilizável
5. **Documentação**: Cada mudança documentada

## Critérios de Sucesso

- ✅ Sistema funciona identicamente ao estado atual
- ✅ Código mais legível e organizado
- ✅ Testes passando em todas as fases
- ✅ Facilidade de manutenção aumentada
- ✅ Zero regressões funcionais
- ✅ Performance mantida ou melhorada

## Cronograma Estimado

- **Fase 1**: 1-2 semanas (cálculos + formatação)
- **Fase 2**: 1-2 semanas (UI + estado)  
- **Fase 3**: 1 semana (PDF)
- **Fase 4**: 1 semana (infraestrutura)

**Total**: 4-6 semanas de refatoração incremental e segura.