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
  const nm = parseFloat(document.getElementById("nm").value) || 0;
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;

      const km = nm * 1.852;
  const valorKm = valoresKm[aeronave] || 0;
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
      const nm = parseFloat(document.getElementById("nm").value) || 0;
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const dataIda = document.getElementById("dataIda").value;
      const dataVolta = document.getElementById("dataVolta").value;
      const observacoes = document.getElementById("observacoes").value;
      const incluirNoPDF = document.getElementById("incluirNoPDF").checked;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;

      const km = nm * 1.852;
      const valorKm = valoresKm[aeronave] || 0;
      let total = km * valorKm;

      let ajustes = null;
      if (valorExtra > 0 && incluirNoPDF) {
        if (tipoExtra === "soma") {
          total += valorExtra;
          ajustes = { text: `Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
        } else {
          total -= valorExtra;
          ajustes = { text: `Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
        }
      }
      const content = [
        { text: "Cotação de Voo Executivo", style: "header" },
        { text: `Origem: ${origem} → Destino: ${destino}`, margin: [0, 10, 0, 0] },
        { text: `Aeronave: ${aeronave}` },
        { text: `Data Ida: ${dataIda} | Data Volta: ${dataVolta}` }
      ];
      if (ajustes) content.push(ajustes);
      content.push({ text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, margin: [0, 10, 0, 0] });
      if (observacoes) content.push({ text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] });

      const docDefinition = {
        content,
        styles: {
          header: {
            fontSize: 18,
            bold: true
          }
        }
      };

      const nomeArquivo = `Cotacao_${aeronave}_${origem}_${destino}.pdf`.replace(/\s+/g, "_");
      pdfMake.createPdf(docDefinition).download(nomeArquivo);
    }
  </script>

</body>
</html>
