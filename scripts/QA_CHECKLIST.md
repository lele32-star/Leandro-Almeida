# QA Manual / Checklist — Cotação de Voo Executivo

Objetivo: passos para testes regressivos manuais. Execute na ordem indicada.

Ambiente recomendado
- Node.js 18+ (para testes automatizados)
- Navegador com console (Chrome/Firefox)
- Variável de ambiente `AVWX_TOKEN` definida para chamadas AVWX (opcional; sem token algumas consultas podem falhar)

Passos rápidos (smoke tests)
1. Instalar dependências e rodar testes:

```bash
npm install
npm test
```

2. Abrir `index.html` em um servidor local (por exemplo: `npx http-server . -p 8080`) e acessar `http://localhost:8080`.

Funcionalidades principais a validar
- [ ] Selecionar uma aeronave e verificar tarifa padrão aparece em "Tarifa por km".
- [ ] Inserir origem/destino (ICAO) válidos e confirmar cálculo de distância (NM/KM) e desenho no mapa.
- [ ] Testar botão "Mostrar / Editar Tarifa" e persistência local da tarifa por aeronave.
- [ ] No card "Parâmetros da aeronave" alterar `Velocidade de Cruzeiro` e `Valor-hora`: verificar que o pré-orçamento atualiza imediatamente.
- [ ] Adicionar pernas via botão "Adicionar Aeroporto" e checar tempo por perna e possibilidade de override manual (✏️).
- [ ] Salvar rascunho (se botões existirem) e recarregar página; verificar que rascunho é restaurado.

Casos de borda e validações
- [ ] KTAS inválido (0 ou vazio) deve marcar input como inválido e não quebrar cálculo.
- [ ] Sem aeronave selecionada no modo "pernas" exibir toast: "Selecione uma aeronave para calcular tempo.".
- [ ] Verificar que perna com override manual (`custom_time`) é considerada no cálculo do total por hora.

Acessibilidade
- [ ] Navegar por teclado (Tab/Shift+Tab) e abrir editor de perna com Enter/Space.
- [ ] Ler toasts com leitor de tela (região aria-live presente).
- [ ] Conferir contraste mínimo entre texto e fundo nos cartões de resumo.

Checklist de release
- [ ] Atualizar `README.md` com instruções de env/CI se aplicável.
- [ ] Rodar `npm test` e garantir que tudo passa.
- [ ] Criar PR com descrição e checklist preenchido.

Notas
- Para testes automáticos adicionais, ver `test.js`.
- Para integrar autenticação segura do AVWX, prefira um backend que armazene o token em secrets.
