# Estratégia de Branches e Pull Requests

Resumo rápido

- `main`: produção (sempre estável)
- `develop`: integração contínua de features
- Branch por fase/épico: `feat/fase-0-dados`, `feat/fase-1-pricing-mode`, `feat/fase-2-aircraft-params`, etc.

Regras de PR

- Um PR por épico/feature (pequeno e focado)
- Título: `[Fase X][UI/CALC/STATE] <nome curto>`
- Descrição: Contexto + objetivo + impacto
- Checklist mínimo no PR:
  - Não alterar método "Tarifa x km"
  - Tests passando (`npm test`)
  - Prints antes/depois (se UI)

Template de Issue (feature/épico)

- Título: `[Fase X][UI/CALC/STATE] <nome curto>`
- Descrição: contexto, objetivo e impacto
- Tarefas: checklist de implementação
- AC: critérios de aceite verificáveis
- Riscos: breve
- Screens: se UI

Checklist de Testes (compacto)

1. Selecionar aeronave → ver velocidade/valor-hora pré-preenchidos.
2. Criar 1 perna com distância conhecida → calcular tempo (decimal e HH:MM).
3. Alterar KTAS → tempo recalcula.
4. Override manual do tempo → respeitado.
5. Multi-pernas → soma correta.
6. Resumo mostra dois métodos com valores coerentes.
7. Salvar e reabrir → tudo preservado.
8. Voltar ao modo “distância total” → método antigo intacto.
9. A11y: navegação por teclado e leitura de labels.
10. Inputs inválidos exibem feedback sem quebrar.

Riscos e mitigação

- R1 Colisão com lógica atual de preços — Mitigar: PRs pequenos, testes de regressão.
- R2 Defaults de hora impraticáveis — Mitigar: campos editáveis + salvar padrão.
- R3 UX confusa entre métodos — Mitigar: rótulos e painel comparativo.

Estimativas (story points)

- Fase 0–2: 8–13 pts
- Fase 3–4: 8–13 pts
- Fase 5–7: 5–8 pts
- Fase 8 (opcional): 3–5 pts
