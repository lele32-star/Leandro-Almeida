Cotação de voo executivo web app com conversão NM↔KM, múltiplas pernas, mapa Leaflet e lookup de aeroportos via Aerodatabox.
# Leandro-Almeida

To regenerate the vendored jsdom tarball, run:

```
npm pack jsdom@24.0.0
mkdir -p vendor
mv jsdom-24.0.0.tgz vendor/
```

<!DOCTYPE html> <html lang="pt-BR"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>Cotação de Voo Executivo</title> <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" /> <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script> <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script> <style> :root { --primary: #0d6efd; --primary-hover: #0b5ed7; --bg: #f8f9fa; --surface: #ffffff; --text: #212529; --border: #ced4da; } *,*::before,*::after { box-sizing: border-box; } body { font-family: 'Arial', sans-serif; margin: 30px; max-width: 800px; margin: 0; background: var(--bg); color: var(--text); font-family: 'Segoe UI', Tahoma, sans-serif; } .container { max-width: 900px; margin: 0 auto; padding: 20px; } h1 { text-align: center; margin-bottom: 1.5rem; } label { font-weight: bold; display: block; margin-top: 15px; } input, select, textarea { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); } input:focus, select:focus, textarea:focus { outline: 2px solid var(--primary); outline-offset: 2px; } .linha { display: flex; gap: 10px; flex-wrap: wrap; gap: 15px; } .linha > div { flex: 1; flex: 1 1 200px; } .botoes { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; } button { padding: 12px 20px; font-size: 16px; margin-right: 10px; cursor: pointer; border: none; border-radius: 4px; background: var(--primary); color: #fff; transition: background 0.2s; } button:hover { background: var(--primary-hover); } #resultado { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; } #pdfFilters { margin-top: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 10px; display: flex; flex-wrap: wrap; gap: 10px; } #pdfFilters label { font-weight: normal; display: flex; align-items: center; gap: 4px; margin-right: 0; } #map { height: 400px; margin-top: 20px; border: 1px solid var(--border); border-radius: 6px; } @media (max-width: 600px) { .botoes button { flex: 1 1 100%; } } </style> </head> <body> <h1>Cotação de Voo Executivo</h1> <label>Aeronave:</label> <select id="aeronave"> <option value="" disabled selected>Escolha uma aeronave</option> <option value="Hawker 400">Hawker 400 — R$36,00/km</option> <option value="Phenom 100">Phenom 100 — R$36,00/km</option> <option value="Citation II">Citation II — R$36,00/km</option> <option value="King Air C90">King Air C90 — R$30,00/km</option> <option value="Sêneca IV">Sêneca IV — R$22,00/km</option> <option value="Cirrus SR22">Cirrus SR22 — R$15,00/km</option> </select> <div class="linha"> <div> <label>Distância (NM):</label> <input type="number" id="nm" /> </div> <div> <label>Origem:</label> <input type="text" id="origem" /> <main class="container"> <h1>Cotação de Voo Executivo</h1> <label for="aeronave">Aeronave:</label> <select id="aeronave"> <option value="" disabled selected>Escolha uma aeronave</option> <option value="Hawker 400">Hawker 400 — R$36,00/km</option> <option value="Phenom 100">Phenom 100 — R$36,00/km</option> <option value="Citation II">Citation II — R$36,00/km</option> <option value="King Air C90">King Air C90 — R$30,00/km</option> <option value="Sêneca IV">Sêneca IV — R$22,00/km</option> <option value="Cirrus SR22">Cirrus SR22 — R$15,00/km</option> </select> <label for="tarifa">Tarifa por km (R$):</label> <input type="number" id="tarifa" step="0.01" /> <div class="linha"> <div> <label for="nm">Distância (NM):</label> <input type="number" id="nm" /> </div> <div> <label for="km">Distância (KM):</label> <input type="number" id="km" /> </div> <div> <label for="origem">Origem:</label> <input type="text" id="origem" /> </div> <div> <label for="destino">Destino:</label> <input type="text" id="destino" /> </div> </div> <div> <label>Destino:</label> <input type="text" id="destino" /> <div id="stops"></div> <button id="addStop" type="button">Adicionar Aeroporto</button> <div class="linha"> <div> <label for="dataIda">Data Ida:</label> <input type="date" id="dataIda" /> </div> <div> <label for="dataVolta">Data Volta:</label> <input type="date" id="dataVolta" /> </div> </div> </div> <div class="linha"> <div> <label>Data Ida:</label> <input type="date" id="dataIda" /> <label for="valorExtra">Acréscimo ou Desconto:</label> <input type="number" id="valorExtra" placeholder="Valor em R$" /> <select id="tipoExtra"> <option value="soma">Adicionar</option> <option value="subtrai">Subtrair</option> </select> <label for="pagamento">Dados para pagamento:</label> <textarea id="pagamento" rows="5">INTER - 077 AUTOCON SUPRIMENTOS DE INFORMATICA CNPJ: 36.326.772/0001-65 Agência: 0001 Conta: 25691815-5</textarea> <label for="observacoes">Observações:</label> <textarea id="observacoes" rows="4"></textarea> <div id="pdfFilters"> <h4>Campos do PDF</h4> <label><input type="checkbox" id="showRota" checked /> Rota</label> <label><input type="checkbox" id="showAeronave" checked /> Aeronave</label> <label><input type="checkbox" id="showTarifa" checked /> Tarifa</label> <label><input type="checkbox" id="showDistancia" checked /> Distância</label> <label><input type="checkbox" id="showDatas" checked /> Datas</label> <label><input type="checkbox" id="showAjuste" checked /> Ajuste</label> <label><input type="checkbox" id="showObservacoes" checked /> Observações</label> <label><input type="checkbox" id="showPagamento" checked /> Pagamento</label> <label><input type="checkbox" id="showMapa" checked /> Mapa</label> </div> <div> <label>Data Volta:</label> <input type="date" id="dataVolta" /> <div class="botoes"> <button onclick="gerarPreOrcamento()">Gerar Pré-Orçamento</button> <button onclick="gerarPDF()">Gerar PDF</button> <button onclick="limparCampos()">Limpar</button> </div> </div> <label>Acréscimo ou Desconto:</label> <input type="number" id="valorExtra" placeholder="Valor em R$" /> <select id="tipoExtra"> <option value="soma">Adicionar</option> <option value="subtrai">Subtrair</option> </select> <label><input type="checkbox" id="incluirNoPDF" /> Incluir no PDF</label> <label>Observações:</label> <textarea id="observacoes" rows="4"></textarea> <div class="botoes"> <button onclick="gerarPreOrcamento()">Gerar Pré-Orçamento</button> <button onclick="gerarPDF()">Gerar PDF</button> </div> <div id="resultado"></div> <script> const valoresKm = { "Hawker 400": 36, "Phenom 100": 36, "Citation II": 36, "King Air C90": 30, "Sêneca IV": 22, "Cirrus SR22": 15 }; function gerarPreOrcamento() { const aeronave = document.getElementById("aeronave").value; const nm = parseFloat(document.getElementById("nm").value); const origem = document.getElementById("origem").value; const destino = document.getElementById("destino").value; const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0; const tipoExtra = document.getElementById("tipoExtra").value; const km = nm * 1.852; const valorKm = valoresKm[aeronave]; let total = km * valorKm; let labelExtra = ""; if (valorExtra > 0) { if (tipoExtra === "soma") { total += valorExtra; labelExtra = + R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (outras despesas); } else { total -= valorExtra; labelExtra = - R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (desconto); } } document.getElementById("resultado").innerHTML = <h3>Pré-Orçamento</h3> <p><strong>Origem:</strong> ${origem}</p> <p><strong>Destino:</strong> ${destino}</p> <p><strong>Aeronave:</strong> ${aeronave}</p> <p><strong>Distância:</strong> ${nm} NM (${km.toFixed(1)} km)</p> ${valorExtra > 0 ? <p><strong>Ajuste:</strong> ${labelExtra}</p> : ""} <p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p> ; } function gerarPDF() { const aeronave = document.getElementById("aeronave").value; const nm = parseFloat(document.getElementById("nm").value); const origem = document.getElementById("origem").value; const destino = document.getElementById("destino").value; const dataIda = document.getElementById("dataIda").value; const dataVolta = document.getElementById("dataVolta").value; const observacoes = document.getElementById("observacoes").value; const incluirNoPDF = document.getElementById("incluirNoPDF").checked; const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0; const tipoExtra = document.getElementById("tipoExtra").value; const km = nm * 1.852; const valorKm = valoresKm[aeronave]; let total = km * valorKm; let ajustes = ""; if (valorExtra > 0 && incluirNoPDF) { if (tipoExtra === "soma") { total += valorExtra; ajustes = { text: Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, margin: [0, 10, 0, 0] }; } else { total -= valorExtra; ajustes = { text: Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, margin: [0, 10, 0, 0] }; } } <div id="resultado"></div> const docDefinition = { content: [ { text: "Cotação de Voo Executivo", style: "header" }, { text: Origem: ${origem} → Destino: ${destino}, margin: [0, 10, 0, 0] }, { text: Aeronave: ${aeronave} }, { text: Data Ida: ${dataIda} | Data Volta: ${dataVolta} }, ajustes, { text: Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, bold: true, margin: [0, 10, 0, 0] }, observacoes ? { text: Observações: ${observacoes}, margin: [0, 10, 0, 0] } : null ], styles: { header: { fontSize: 18, bold: true } } }; const nomeArquivo = Cotacao_${aeronave}_${origem}_${destino}.pdf.replace(/\s+/g, "_"); pdfMake.createPdf(docDefinition).open(); // Abre em nova aba } </script> <div id="map"></div> <script src="app.js"></script> </main> </body> </html>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cotação de Voo Executivo</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <style>
    :root {
      --primary: #0d6efd;
      --primary-hover: #0b5ed7;
      --bg: #f8f9fa;
      --surface: #ffffff;
      --text: #212529;
      --border: #ced4da;
    }
    *,*::before,*::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', Tahoma, sans-serif;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; margin-bottom: 1.5rem; }
    label { font-weight: bold; display: block; margin-top: 15px; }
    input, select, textarea {
      width: 100%; padding: 8px; margin-top: 5px;
      border: 1px solid var(--border); border-radius: 4px; background: var(--surface);
    }
    input.icao { text-transform: uppercase; letter-spacing: .04em; }
    input:focus, select:focus, textarea:focus { outline: 2px solid var(--primary); outline-offset: 2px; }
    .linha { display: flex; flex-wrap: wrap; gap: 15px; }
    .linha > div { flex: 1 1 200px; }
    .botoes { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; }
    button {
      padding: 12px 20px; font-size: 16px; cursor: pointer; border: none; border-radius: 4px;
      background: var(--primary); color: #fff; transition: background 0.2s;
    }
    button:hover { background: var(--primary-hover); }
    #resultado {
      margin-top: 30px; padding: 20px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 6px;
    }
    #pdfFilters {
      margin-top: 20px; border: 1px solid var(--border); border-radius: 6px;
      padding: 10px; display: flex; flex-wrap: wrap; gap: 10px;
    }
    #pdfFilters label {
      font-weight: normal; display: flex; align-items: center; gap: 4px; margin-right: 0;
    }
    #map {
      height: 400px; margin-top: 20px; border: 1px solid var(--border); border-radius: 6px;
    }
    @media (max-width: 600px) { .botoes button { flex: 1 1 100%; } }
  </style>
</head>
<body>
  <main class="container">
    <h1>Cotação de Voo Executivo</h1>

    <label for="aeronave">Aeronave:</label>
    <select id="aeronave">
      <option value="" disabled selected>Escolha uma aeronave</option>
      <option value="Hawker 400">Hawker 400 — R$36,00/km</option>
      <option value="Phenom 100">Phenom 100 — R$36,00/km</option>
      <option value="Citation II">Citation II — R$36,00/km</option>
      <option value="King Air C90">King Air C90 — R$30,00/km</option>
      <option value="Sêneca IV">Sêneca IV — R$22,00/km</option>
      <option value="Cirrus SR22">Cirrus SR22 — R$15,00/km</option>
    </select>

    <label for="tarifa">Tarifa por km (R$):</label>
    <input type="number" id="tarifa" step="0.01" />

    <div class="linha">
      <div>
        <label for="nm">Distância (NM):</label>
        <input type="number" id="nm" />
      </div>
      <div>
        <label for="km">Distância (KM):</label>
        <input type="number" id="km" />
      </div>
      <div>
        <label for="origem">Origem (ICAO):</label>
        <input type="text" id="origem" class="icao" maxlength="4"
          oninput="this.value=this.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);" />
      </div>
      <div>
        <label for="destino">Destino (ICAO):</label>
        <input type="text" id="destino" class="icao" maxlength="4"
          oninput="this.value=this.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);" />
      </div>
    </div>

    <div id="stops"></div>
    <button id="addStop" type="button">Adicionar Aeroporto</button>

    <div class="linha">
      <div>
        <label for="dataIda">Data Ida:</label>
        <input type="date" id="dataIda" />
      </div>
      <div>
        <label for="dataVolta">Data Volta:</label>
        <input type="date" id="dataVolta" />
      </div>
    </div>

    <label for="valorExtra">Acréscimo ou Desconto:</label>
    <input type="number" id="valorExtra" placeholder="Valor em R$" />
    <select id="tipoExtra">
      <option value="soma">Adicionar</option>
      <option value="subtrai">Subtrair</option>
    </select>

    <!-- === Componente de Comissão ========================================= -->
    <section id="commission-component" role="region" aria-labelledby="commissionTitle" style="margin-top:1rem">
      <h3 id="commissionTitle" style="position:absolute;left:-9999px;top:-9999px;">Comissão</h3>
      <button type="button" id="btnAddCommission"
              aria-pressed="false"
              style="padding:.6rem .9rem;border:1px solid var(--primary);border-radius:.75rem;background:var(--primary);color:#fff;cursor:pointer">
        Adicionar comissão
      </button>
      <div id="commissionPanel" hidden
           style="margin-top:.75rem; padding:1rem; border:1px solid #eee; border-radius:.75rem; background:#fafafa">
        <label for="commissionPercent" style="display:block;font-size:.95rem;margin-bottom:.4rem">
          Percentual da comissão (%)
        </label>
        <input id="commissionPercent" type="number" min="0" max="100" step="0.1" value="5"
               inputmode="decimal" aria-describedby="commissionHelp"
               style="width:120px;padding:.5rem;border:1px solid var(--border);border-radius:.5rem" />
        <div id="commissionHelp" style="font-size:.85rem;color:#666;margin-top:.35rem">
          A comissão será aplicada sobre a base conforme as regras informadas no sistema.
        </div>
        <output id="commissionPreview" style="display:block;margin-top:.75rem;font-weight:600">
          Comissão: R$ 0,00
        </output>
      </div>
      <input type="hidden" id="commissionAmount" value="0">
    </section>

    <script>
      // Mantém o módulo de comissão (necessário para app.js)
      (() => {
        const root = document.getElementById('commission-component');
        if (!root) return;
        const btnAdd = root.querySelector('#btnAddCommission');
        const panel = root.querySelector('#commissionPanel');
        const percentInput = root.querySelector('#commissionPercent');
        const preview = root.querySelector('#commissionPreview');
        const amountHidden = root.querySelector('#commissionAmount');

        const state = { enabled: false, percent: Number(percentInput.value) || 0 };
        const fmtBRL = (n) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
        const clamp2 = (n) => Number((Number(n)||0).toFixed(2));

        btnAdd.addEventListener('click', () => {
          state.enabled = !state.enabled;
          panel.hidden = !state.enabled;
          btnAdd.setAttribute('aria-pressed', String(state.enabled));
          btnAdd.textContent = state.enabled ? 'Remover comissão' : 'Adicionar comissão';
          if (!state.enabled) {
            amountHidden.value = '0';
            preview.textContent = 'Comissão: R$ 0,00';
            root.dispatchEvent(new CustomEvent('commission:changed', { detail: { amount:0, base:0 }, bubbles: true }));
          }
        });
        percentInput.addEventListener('input', () => {
          const v = Number(String(percentInput.value).replace(',', '.'));
          state.percent = Math.max(0, isNaN(v) ? 0 : v);
        });

        function calculate({ km, tarifa }) {
          if (!state.enabled) {
            const payload = { enabled:false, percent:state.percent, amount:0, base:0 };
            root.dispatchEvent(new CustomEvent('commission:changed', { detail: payload, bubbles:true }));
            return payload;
          }
          const base = Math.max(0, Number(km) * Number(tarifa));
          const amount = clamp2(base * (Number(state.percent)/100));
          amountHidden.value = String(amount);
          preview.textContent = 'Comissão: ' + fmtBRL(amount);
          const payload = { enabled:true, percent:state.percent, amount, base };
          root.dispatchEvent(new CustomEvent('commission:changed', { detail: payload, bubbles:true }));
          return payload;
        }

        window.CommissionModule = Object.freeze({
          calculate,
          getState: () => ({ enabled: state.enabled, percent: state.percent, amount: Number(amountHidden.value)||0 }),
          setPercent: (p) => { state.percent = Math.max(0, Number(p)||0); percentInput.value = String(state.percent); }
        });
      })();
    </script>
    <!-- === Fim Comissão ===================================================== -->

    <label for="pagamento">Dados para pagamento:</label>
    <textarea id="pagamento" rows="5">INTER - 077
AUTOCON SUPRIMENTOS DE INFORMATICA
CNPJ: 36.326.772/0001-65
Agência: 0001
Conta: 25691815-5</textarea>

    <label for="observacoes">Observações:</label>
    <textarea id="observacoes" rows="4"></textarea>

    <div id="pdfFilters">
      <h4>Campos do PDF</h4>
      <label><input type="checkbox" id="showRota" checked /> Rota</label>
      <label><input type="checkbox" id="showAeronave" checked /> Aeronave</label>
      <label><input type="checkbox" id="showTarifa" checked /> Tarifa</label>
      <label><input type="checkbox" id="showDistancia" checked /> Distância</label>
      <label><input type="checkbox" id="showDatas" checked /> Datas</label>
      <label><input type="checkbox" id="showAjuste" checked /> Ajuste</label>
      <label><input type="checkbox" id="showObservacoes" checked /> Observações</label>
      <label><input type="checkbox" id="showPagamento" checked /> Pagamento</label>
      <label><input type="checkbox" id="showMapa" checked /> Mapa</label>
      <label for="pdfCommissionToggle" style="margin-right:1rem;display:inline-flex;align-items:center;gap:.4rem;">
        <input type="checkbox" id="pdfCommissionToggle" checked> Comissão
      </label>
      <script>
        // Toggle de visibilidade da comissão no PDF (hidden compat)
        (() => {
          const pdfToggle = document.getElementById('pdfCommissionToggle');
          let hidden = document.getElementById('commissionShowInPdf');
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.id = 'commissionShowInPdf';
            hidden.value = '1';
            document.body.appendChild(hidden);
          }
          const sync = () => {
            hidden.value = pdfToggle.checked ? '1' : '0';
            document.dispatchEvent(new CustomEvent('commission:visibility', {
              detail: { showInPdf: pdfToggle.checked }, bubbles: true
            }));
          };
          pdfToggle.addEventListener('change', sync);
          sync();
        })();
      </script>
    </div>

    <div class="botoes">
      <button onclick="appGerarPreOrcamento()">Gerar Pré-Orçamento</button>
      <button onclick="appGerarPDF()">Gerar PDF</button>
      <button onclick="limparCampos()">Limpar</button>
    </div>

    <div id="resultado"></div>
    <div id="map"></div>

    <script src="cotacao.js"></script>
    <script src="app.js"></script>
  </main>
</body>
</html>
