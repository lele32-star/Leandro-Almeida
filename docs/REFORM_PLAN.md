# Plano Incremental de Refatoração

Objetivo geral: Evoluir o código para uma base modular, testável, acessível e segura, sem grandes interrupções na operação atual. Cada passo deve ser pequeno, com rollback simples.

## Princípios
- Pequenas mudanças isoladas (1 responsabilidade / commit).
- Cobrir com teste sempre que extrair lógica pura.
- Nunca recalcular no PDF (snapshot congelado imutável).
- Evitar regressões de UX (conservar comportamento padrão; melhorias graduais).
- Segurança: remover dependências de tokens hardcoded e padronizar storage versionado.

## Etapas (Backlog Imediato)
1. R1 Geo: Extrair `haversine` para `src/geo/haversine.js` + teste de precisão (<0.5%).
2. R2 UX Limpar: Ajustar `limparCampos` para preservar seleção de aeronave e parâmetros de catálogo.
3. R3 Flag tempo custom: Persistir flag por perna no snapshot e refletir no PDF (exibir "(tempo customizado)").
4. R4 Logger: Introduzir `src/utils/logger.js` com níveis (error|warn|info|debug) e gate por flag `?debug`.
5. A1 Acessibilidade & Clean: Remover handlers inline ICAO → listeners modulares.
6. A2 Modal acessível (caso seja reintroduzido) com foco inicial e aria-* corretos.
7. B1 Tooling: Adicionar ESLint + script CI (regra leve: no-unused-vars / no-undef / eqeqeq / semi consistente).
8. B2 Build: Preparar configuração opcional Vite (desenvolvimento mais rápido + bundling futuro).
9. P1 Compartilhamento: Evoluir "Copiar Link" para serializar estado em base64 e permitir reimportação via query param.
10. T1 Cobertura: Alcançar ~80% de testes nas funções core (calc, format, geo, persist, serviços isolados).
11. S1 Security: Remover fallback de token AVWX e documentar setup seguro (.env / injeção runtime).

## Guardrails
- Antes de cada bloco: rodar testes (`npm test`).
- Após extrações: validar manualmente fluxo principal (gerar pré-orçamento, congelar, PDF).
- Não misturar refactors com mudanças visuais.
- Commits convencionais (feat|fix|refactor|chore|docs|test|perf|build|ci|revert).

## Métricas de Conclusão
- Funções centrais puras sem dependência de DOM (calc, geo, format) ≥ 95% cobertas.
- Tempo médio de gerar pré-orçamento não piora (>5%).
- Nenhum token sensível presente no bundle final.
- Lint zero erros (warnings aceitáveis inicialmente <5).

## Próximo Passo Imediato
Criar módulo geo (R1) e teste; em seguida ajustar limparCampos (R2), garantindo commit separado.

---
Documento inicial de referência; será atualizado conforme evolução.
