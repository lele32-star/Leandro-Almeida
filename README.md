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
# Leandro-Almeida
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cotação de Voo Executivo</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 30px;
      max-width: 800px;
    }
    label {
      font-weight: bold;
      display: block;
      margin-top: 15px;
    }
    input, select, textarea {
      width: 100%;
      padding: 8px;
      margin-top: 5px;
    }
    .linha {
      display: flex;
      gap: 10px;
    }
    .linha > div {
      flex: 1;
    }
    .botoes {
      margin-top: 30px;
    }
    button {
      padding: 12px 20px;
      font-size: 16px;
      margin-right: 10px;
      cursor: pointer;
    }
    #resultado {
      margin-top: 30px;
      border-top: 1px solid #ccc;
      padding-top: 20px;
    }
  </style>
</head>
<body>

  <h1>Cotação de Voo Executivo</h1>

  <label>Aeronave:</label>
  <select id="aeronave">
    <option value="" disabled selected>Escolha uma aeronave</option>
    <option value="Hawker 400">Hawker 400 — R$36,00/km</option>
    <option value="Phenom 100">Phenom 100 — R$36,00/km</option>
    <option value="Citation II">Citation II — R$36,00/km</option>
    <option value="King Air C90">King Air C90 — R$30,00/km</option>
    <option value="Sêneca IV">Sêneca IV — R$22,00/km</option>
    <option value="Cirrus SR22">Cirrus SR22 — R$15,00/km</option>
  </select>

  <div class="linha">
    <div>
      <label>Distância (NM):</label>
      <input type="number" id="nm" />
    </div>
    <div>
      <label>Origem:</label>
      <input type="text" id="origem" />
    </div>
    <div>
      <label>Destino:</label>
      <input type="text" id="destino" />
    </div>
  </div>

  <div class="linha">
    <div>
      <label>Data Ida:</label>
      <input type="date" id="dataIda" />
    </div>
    <div>
      <label>Data Volta:</label>
      <input type="date" id="dataVolta" />
    </div>
  </div>

  <label>Acréscimo ou Desconto:</label>
  <input type="number" id="valorExtra" placeholder="Valor em R$" />
  <select id="tipoExtra">
    <option value="soma">Adicionar</option>
    <option value="subtrai">Subtrair</option>
  </select>
  <label><input type="checkbox" id="incluirNoPDF" /> Incluir no PDF</label>

  <label>Observações:</label>
  <textarea id="observacoes" rows="4"></textarea>

  <div class="botoes">
    <button onclick="gerarPreOrcamento()">Gerar Pré-Orçamento</button>
    <button onclick="gerarPDF()">Gerar PDF</button>
  </div>

  <div id="resultado"></div>

  <script>
    const valoresKm = {
      "Hawker 400": 36,
      "Phenom 100": 36,
      "Citation II": 36,
      "King Air C90": 30,
      "Sêneca IV": 22,
      "Cirrus SR22": 15
    };

    function gerarPreOrcamento() {
      const aeronave = document.getElementById("aeronave").value;
      const nm = parseFloat(document.getElementById("nm").value);
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;

      const km = nm * 1.852;
      const valorKm = valoresKm[aeronave];
      let total = km * valorKm;

      let labelExtra = "";
      if (valorExtra > 0) {
        if (tipoExtra === "soma") {
          total += valorExtra;
          labelExtra = `+ R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (outras despesas)`;
        } else {
          total -= valorExtra;
          labelExtra = `- R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (desconto)`;
        }
      }

      document.getElementById("resultado").innerHTML = `
        <h3>Pré-Orçamento</h3>
        <p><strong>Origem:</strong> ${origem}</p>
        <p><strong>Destino:</strong> ${destino}</p>
        <p><strong>Aeronave:</strong> ${aeronave}</p>
        <p><strong>Distância:</strong> ${nm} NM (${km.toFixed(1)} km)</p>
        ${valorExtra > 0 ? `<p><strong>Ajuste:</strong> ${labelExtra}</p>` : ""}
        <p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      `;
    }

    function gerarPDF() {
      const aeronave = document.getElementById("aeronave").value;
      const nm = parseFloat(document.getElementById("nm").value);
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const dataIda = document.getElementById("dataIda").value;
      const dataVolta = document.getElementById("dataVolta").value;
      const observacoes = document.getElementById("observacoes").value;
      const incluirNoPDF = document.getElementById("incluirNoPDF").checked;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;

      const km = nm * 1.852;
      const valorKm = valoresKm[aeronave];
      let total = km * valorKm;

      let ajustes = "";
      if (valorExtra > 0 && incluirNoPDF) {
        if (tipoExtra === "soma") {
          total += valorExtra;
          ajustes = { text: `Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
        } else {
          total -= valorExtra;
          ajustes = { text: `Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
        }
      }

      const docDefinition = {
        content: [
          { text: "Cotação de Voo Executivo", style: "header" },
          { text: `Origem: ${origem} → Destino: ${destino}`, margin: [0, 10, 0, 0] },
          { text: `Aeronave: ${aeronave}` },
          { text: `Data Ida: ${dataIda} | Data Volta: ${dataVolta}` },
          ajustes,
          { text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, margin: [0, 10, 0, 0] },
          observacoes ? { text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] } : null
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true
          }
        }
      };

      const nomeArquivo = `Cotacao_${aeronave}_${origem}_${destino}.pdf`.replace(/\s+/g, "_");
      pdfMake.createPdf(docDefinition).open(); // Abre em nova aba
    }
  </script>

</body>
</html>
