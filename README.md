# Leandro-Almeida

Cotação de voo executivo web app com conversão NM↔KM, múltiplas pernas, mapa Leaflet e lookup de aeroportos via AVWX.

## Documentação rápida

- Fórmulas principais:
  - KM = NM × 1.852
  - Subtotal (Método 1) = KM × Tarifa por km
  - Tempo por perna = Distância (NM) / KTAS (nós) → horas decimais
  - Total por hora (Método 2) = (soma horas por perna) × Valor-hora (R$/h)
  - Comissões aplicadas sobre a base (mesma função usada para ambos os métodos)

- Limitações conhecidas:
  - AVWX token embutido no código em alguns ambientes de teste; para produção, use variável de ambiente `AVWX_TOKEN` ou um backend seguro.
  - Rascunhos são salvos localmente (localStorage) sob a chave `cotacao:currentDraft`.

## QA e checklist

Um checklist de QA manual e passos de regressão está disponível em `scripts/QA_CHECKLIST.md` — siga-o antes de criar PRs de release.

## Configurar AVWX_TOKEN (token AVWX)

O projeto usa a API AVWX para obter METARs e coordenadas de estações. Configure o token AVWX para que chamadas autenticadas funcionem em desenvolvimento e em deploy.

Fontes do token (ordem de prioridade):

1. Variável de ambiente `AVWX_TOKEN` (recomendada para servidores/CI).
2. Campo na UI `Token AVWX` (apenas para testes locais no navegador).
3. `localStorage` no navegador (quando o token for inserido pela UI, ele é salvo localmente).

Instruções rápidas — desenvolvimento local

1. Exportar a variável no shell (Linux/macOS):

```bash
export AVWX_TOKEN="seu_token_aqui"
npm test
```

No Windows PowerShell:

```powershell
$env:AVWX_TOKEN = "seu_token_aqui"
npm test
```

2. Alternativa: abra `index.html` em http://localhost:8080 e cole o token no campo "Token AVWX". O token será salvo no `localStorage` do navegador.

Deployment (exemplos)

- GitHub Actions: defina o secret `AVWX_TOKEN` nas configurações do repositório e exporte-o como variável de ambiente no workflow.
- Netlify: em Site settings → Build & deploy → Environment → Add variable `AVWX_TOKEN`.
- Vercel: em Settings → Environment Variables → adicionar `AVWX_TOKEN` para os ambientes desejados.

Observações de segurança

- Não comite o token no repositório. Use secrets/env vars do provedor de CI.
- Para produção, prefira um backend/proxy que armazene o token com segurança e faça as chamadas ao AVWX do lado servidor, evitando expor o token no cliente.


To regenerate the vendored jsdom tarball, run:

```
npm pack jsdom@24.0.0
mkdir -p vendor
mv jsdom-24.0.0.tgz vendor/
```

## Como usar

1. Abra o arquivo `index.html` em um navegador ou em um servidor local
2. Preencha os dados da cotação:
   - Selecione a aeronave
   - Insira origem e destino (códigos ICAO)
   - Configure datas e observações
3. Clique em "Gerar Pré-Orçamento" para calcular
4. Clique em "Gerar PDF" para exportar

## Desenvolvimento

### Scripts disponíveis

```bash
npm test          # Executa todos os testes
npm run lint      # Verifica problemas no código
npm run lint:fix  # Corrige problemas automaticamente
npm run format    # Formata código com Prettier
npm run dev       # Inicia servidor local na porta 8080
npm run validate  # Executa lint + format + test
```

### Configuração do ambiente

1. Clone o repositório
2. Execute `npm install` para instalar dependências de desenvolvimento
3. Configure o token AVWX (opcional, ver seção AVWX_TOKEN)
4. Execute `npm run dev` para iniciar o servidor local

## Estrutura do Projeto

```
├── index.html              # Interface principal da aplicação
├── app.js                  # Lógica principal e cálculos
├── cotacao.js              # Funções de cálculo de cotação
├── src/
│   ├── css/
│   │   └── main.css        # Estilos principais da aplicação
│   └── js/                 # (reservado para JS modularizado)
├── tests/                  # Suite de testes e arquivos de teste
│   ├── test.js             # Testes principais
│   └── *.html              # Arquivos de teste HTML
├── docs/                   # Documentação adicional
├── scripts/                # Scripts utilitários
├── libs/                   # Bibliotecas vendorizadas
└── data/                   # Dados e configurações
```

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Mapas**: Leaflet.js
- **PDF**: PDFMake
- **APIs**: AVWX (dados meteorológicos e aeroportos)
- **Testes**: Node.js (testes unitários)

## Contribuindo

1. Rode os testes antes de fazer alterações: `npm test`
2. Siga o checklist de QA em `scripts/QA_CHECKLIST.md`
3. Mantenha a compatibilidade com a arquitetura existente

## Licença

Este projeto é de uso interno.
