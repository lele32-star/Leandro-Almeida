Cotação de voo executivo web app com conversão NM↔KM, múltiplas pernas, mapa Leaflet e lookup de aeroportos via Aerodatabox.
# Leandro-Almeida

To regenerate the vendored jsdom tarball, run:

```
npm pack jsdom@24.0.0
mkdir -p vendor
mv jsdom-24.0.0.tgz vendor/
```


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
      <label>Distância (KM):</label>
      <input type="number" id="km" />
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

  <label>Dados para pagamento:</label>
  <textarea id="pagamento" rows="5">INTER - 077
AUTOCON SUPRIMENTOS DE INFORMATICA
CNPJ: 36.326.772/0001-65
Agência: 0001
Conta: 25691815-5</textarea>

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

    document.getElementById('nm').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const kmInput = document.getElementById('km');
      kmInput.value = Number.isFinite(val) ? (val * 1.852).toFixed(1) : '';
    });

    document.getElementById('km').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const nmInput = document.getElementById('nm');
      nmInput.value = Number.isFinite(val) ? (val / 1.852).toFixed(1) : '';
    });

    let routeLayer = null;

    function haversine(a, b) {
      const R = 6371; // Earth radius in km
      const toRad = (deg) => deg * Math.PI / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }

    function updateDistanceFromAirports(waypoints) {
      const nmInput = document.getElementById('nm');
      const kmInput = document.getElementById('km');
      const points = (waypoints || []).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

      if (points.length < 2) {
        if (routeLayer && typeof routeLayer.remove === 'function') {
          routeLayer.remove();
        }
        routeLayer = null;
        if (nmInput) nmInput.value = '';
        if (kmInput) kmInput.value = '';
        return;
      }

      let kmTotal = 0;
      for (let i = 1; i < points.length; i++) {
        kmTotal += haversine(points[i - 1], points[i]);
      }
      const nmTotal = kmTotal / 1.852;

      if (nmInput) nmInput.value = nmTotal.toFixed(1);
      if (kmInput) kmInput.value = kmTotal.toFixed(1);

      if (typeof L !== 'undefined' && typeof map !== 'undefined') {
        if (routeLayer) routeLayer.remove();
        routeLayer = L.polyline(points.map(p => [p.lat, p.lng]), { color: 'blue' }).addTo(map);
      }
    }

    function gerarPreOrcamento() {
      const aeronave = document.getElementById("aeronave").value;
      const nm = parseFloat(document.getElementById("nm").value);
      const km = parseFloat(document.getElementById("km").value);
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;
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
      const km = parseFloat(document.getElementById("km").value);
      const origem = document.getElementById("origem").value;
      const destino = document.getElementById("destino").value;
      const dataIda = document.getElementById("dataIda").value;
      const dataVolta = document.getElementById("dataVolta").value;
      const observacoes = document.getElementById("observacoes").value;
      const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
      const tipoExtra = document.getElementById("tipoExtra").value;

      const valorKm = valoresKm[aeronave];
      let total = km * valorKm;

      let ajustes = "";
      if (valorExtra > 0) {
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
