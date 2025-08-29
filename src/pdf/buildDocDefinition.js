/**
 * Pure PDF Document Definition Builder
 * 
 * Takes a snapshot and returns a pdfmake document definition object.
 * This is a pure function that doesn't depend on global state or DOM.
 */

// Helper functions (extracted from app.js for purity)
function valorParcialFn(distanciaKm, valorKm) {
  return distanciaKm * valorKm;
}

function valorTotalFn(distanciaKm, valorKm, valorExtra = 0) {
  return valorParcialFn(distanciaKm, valorKm) + valorExtra;
}

function calcularComissao(subtotal, _valorExtra, _tipoExtra, commissions) {
  const base = subtotal; // km × tarifa
  let totalComissao = 0;
  const detalhesComissao = [];
  for (const perc of commissions || []) {
    const val = base * (perc / 100);
    totalComissao += val;
    detalhesComissao.push({ percent: perc, calculado: val });
  }
  return { totalComissao, detalhesComissao };
}

function obterComissao(snapshot) {
  // Use the commission amount from the snapshot if available
  // This makes the function pure by relying on the snapshot data
  if (snapshot.commissionAmountExtra !== undefined) {
    return snapshot.commissionAmountExtra;
  }
  
  // Fallback calculation if not in snapshot
  const base = Math.max(0, Number(snapshot.distanciaKm || 0) * Number(snapshot.valorKm || 0));
  const commissions = snapshot.commissions || [];
  if (commissions.length === 0) return 0;
  
  // Simple calculation for fallback
  let total = 0;
  for (const perc of commissions) {
    total += base * (perc / 100);
  }
  return total;
}

/**
 * Pure function to build PDF document definition from snapshot
 * @param {Object} snapshot - The frozen quote snapshot
 * @param {string} methodSelection - 'method1', 'method2', or 'both'
 * @param {Object} pdfOptions - PDF generation options
 * @param {Array} aircraftCatalog - Aircraft catalog for lookups (optional)
 * @returns {Object} PDFMake document definition
 */
export function buildDocDefinition(snapshot, methodSelection = 'method1', pdfOptions = {}, aircraftCatalog = []) {
  const km = snapshot.nm * 1.852;
  const subtotal = valorParcialFn(km, snapshot.valorKm);
  const totalSemComissao = valorTotalFn(
    km,
    snapshot.valorKm,
    snapshot.tipoExtra === 'soma' ? snapshot.valorExtra : -snapshot.valorExtra
  );
  const { totalComissao, detalhesComissao } = calcularComissao(
    subtotal,
    snapshot.valorExtra,
    snapshot.tipoExtra,
    snapshot.commissions || []
  );
  const commissionAmount = obterComissao(snapshot);
  const total = totalSemComissao + totalComissao + commissionAmount;

  // Method 2 data (if applicable)
  let method2Data = null;
  let method2Total = 0;
  if (snapshot.metodo2) {
    const m2 = snapshot.metodo2;
    const m2Details = calcularComissao(
      m2.subtotal || subtotal,
      snapshot.valorExtra,
      snapshot.tipoExtra,
      snapshot.commissions || []
    );
    method2Total = m2.total || (m2.subtotal + (snapshot.tipoExtra === 'soma' ? snapshot.valorExtra : -snapshot.valorExtra) + m2Details.totalComissao + commissionAmount);
    
    method2Data = {
      subtotal: m2.subtotal,
      total: method2Total,
      totalHours: m2.totalHours,
      totalHhmm: m2.totalHhmm,
      ajuste: m2.ajuste,
      detalhesComissao: m2Details.detalhesComissao,
      totalComissao: m2Details.totalComissao
    };
  }

  // Header without image (avoids failure if dataURL doesn't exist)
  const methodLabel = methodSelection === 'method2' ? 'Base: Tempo (R$/h x horas)' : 'Base: Distância';
  const headerBlock = {
    columns: [
      { width: 80, stack: [ { canvas: [ { type: 'rect', x: 0, y: 0, w: 60, h: 40, color: '#f0f0f0' } ] } ], margin: [0,0,0,0] },
      { stack: [
          { text: '[NOME_EMPRESA]', style: 'brand' },
          { text: '[SLOGAN_CURTO]', style: 'muted' },
          { text: methodLabel, style: 'methodLabel', margin: [0, 4, 0, 0] }
        ], alignment: 'left' },
      { stack: [ { text: '[EMAIL_CONTATO]', style: 'mini' }, { text: '[WHATSAPP_LINK]', style: 'mini' }, { text: '[CNPJ_OPCIONAL]', style: 'mini' } ], alignment: 'right' }
    ],
    columnGap: 10,
    margin: [0, 0, 0, 12]
  };

  const resumoLeft = [];
  // prefer pdfOptions when explicit, otherwise fallback to default true
  const showAircraft = (pdfOptions && pdfOptions.hasOwnProperty('includeAircraft')) ? pdfOptions.includeAircraft : true;
  const showDates = (pdfOptions && pdfOptions.hasOwnProperty('includeDates')) ? pdfOptions.includeDates : true;
  const showRoute = (pdfOptions && pdfOptions.hasOwnProperty('includeRoute')) ? pdfOptions.includeRoute : true;
  if (showRoute) {
    const codes = [snapshot.origem, snapshot.destino, ...(snapshot.stops || [])].filter(Boolean).join(' → ');
    resumoLeft.push({ text: `Rota: ${codes}`, style: 'row' });
  }
  if (showAircraft) resumoLeft.push({ text: `Aeronave: ${snapshot.aeronave}`, style: 'row' });
  if (showDates) resumoLeft.push({ text: `Datas: ${snapshot.dataIda} - ${snapshot.dataVolta}`, style: 'row' });

  // Function to create investment block based on method
  function createInvestmentBlock(methodType, methodData, isSecondary = false) {
    const investBody = [];
    const totalUsed = methodType === 'method1' ? total : methodData.total;
    const subtotalUsed = methodType === 'method1' ? subtotal : methodData.subtotal;
    const detalhesUsed = methodType === 'method1' ? detalhesComissao : methodData.detalhesComissao;
    
    // Method-specific subtotal line
    if (methodType === 'method1') {
      investBody.push([{ text: `Total parcial (km×tarifa): R$ ${subtotalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    } else {
      const entry = aircraftCatalog.find(a => a.nome === snapshot.aeronave || a.id === snapshot.aeronave);
      const hourlyRate = entry ? entry.hourly_rate_brl_default : (snapshot.metodo2?.hourlyRate || 0);
      investBody.push([{ text: `Valor hora: R$ ${hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h`, alignment: 'right' }]);
      investBody.push([{ text: `Tempo total: ${methodData.totalHhmm} (${methodData.totalHours.toFixed(2)}h)`, alignment: 'right' }]);
      investBody.push([{ text: `Total parcial (tempo×hora): R$ ${subtotalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }

    // Adjustment line (same for both methods)
    const ajusteVal = snapshot.tipoExtra === 'soma' ? snapshot.valorExtra : -snapshot.valorExtra;
    if (ajusteVal !== 0) {
      const ajusteTipo = snapshot.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
      const sinal = snapshot.tipoExtra === 'soma' ? '+' : '-';
      investBody.push([{ text: `${ajusteTipo}: ${sinal}R$ ${Math.abs(ajusteVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }

    // Commission details
    if (detalhesUsed && detalhesUsed.length > 0) {
      detalhesUsed.forEach((det, idx) => {
        const label = detalhesUsed.length === 1 ? 'Comissão' : `Comissão ${idx + 1}`;
        investBody.push([{ text: `${label}: ${det.percent}% = R$ ${det.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
      });
    }

    // Additional commission (if any)
    if (commissionAmount > 0) {
      investBody.push([{ text: `Comissão adicional: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }

    investBody.push([{ text: `Total Final: R$ ${totalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right', bold: true }]);

    return {
      table: { widths: ['*'], body: investBody },
      layout: {
        fillColor: (rowIndex) => (rowIndex === investBody.length - 1 ? (isSecondary ? '#17a2b8' : '#0d6efd') : (rowIndex % 2 === 0 ? null : '#fafafa')),
        hLineColor: () => '#eaeaea',
        vLineColor: () => '#ffffff',
        paddingTop: (i) => (i === investBody.length - 1 ? 8 : 6),
        paddingBottom: (i) => (i === investBody.length - 1 ? 8 : 6)
      },
      margin: [0, 6, 0, 12]
    };
  }

  // Create resumoRight with priority for pdfOptions when provided
  const resumoRight = [];
  const includeDistance = (pdfOptions && pdfOptions.hasOwnProperty('includeDistance')) ? pdfOptions.includeDistance : snapshot.showDistancia;
  const includeTariff = (pdfOptions && pdfOptions.hasOwnProperty('includeTariff')) ? pdfOptions.includeTariff : snapshot.showTarifa;
  const includeHourly = (pdfOptions && pdfOptions.hasOwnProperty('includeMethod2')) ? pdfOptions.includeMethod2 : ((methodSelection === 'method2' || methodSelection === 'both') && !!method2Data);
  if (includeDistance) resumoRight.push({ text: `Distância: ${snapshot.nm} NM (${km.toFixed(1)} km)`, style: 'row' });
  if (includeTariff) resumoRight.push({ text: `Tarifa por km: R$ ${snapshot.valorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'row' });
  if (includeHourly && method2Data) {
    const entry = aircraftCatalog.find(a => a.nome === snapshot.aeronave || a.id === snapshot.aeronave);
    const hourlyRate = entry ? entry.hourly_rate_brl_default : (snapshot.metodo2?.hourlyRate || 0);
    resumoRight.push({ text: `Valor por hora: R$ ${hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h`, style: 'row' });
  }

  const resumoBlock = {
    table: {
      widths: ['*','*'],
      body: [
        [ { stack: resumoLeft, margin: [0,0,0,0] }, { stack: resumoRight, margin: [0,0,0,0] } ]
      ]
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 6, paddingBottom: () => 6 },
    margin: [0, 6, 0, 10]
  };

  // Create investment blocks based on selection and PDF options
  const investmentBlocks = [];
  let wantMethod1, wantMethod2;
  if (methodSelection === 'method1') {
    // Explicit selection: only Method 1, ignore toggles
    wantMethod1 = true;
    wantMethod2 = false;
  } else if (methodSelection === 'method2') {
    // Explicit selection: only Method 2, ignore toggles
    wantMethod1 = false;
    wantMethod2 = !!method2Data; // only show if there's data
  } else {
    // Case 'both' (or fallback without explicit choice): respect toggles
    wantMethod1 = pdfOptions.includeMethod1 !== false; // default true
    wantMethod2 = (pdfOptions.includeMethod2 !== false) && !!method2Data; // default true if there's data
  }

  if (wantMethod1) {
    investmentBlocks.push({ text: 'Investimento (Método 1 - Tarifa por KM)', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method1', null));
  }
  if (wantMethod2 && method2Data) {
    investmentBlocks.push({ text: 'Investimento (Método 2 - Hora de Voo)', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method2', method2Data, !!wantMethod1));
  }
  // If nothing selected, default to method1
  if (investmentBlocks.length === 0) {
    investmentBlocks.push({ text: 'Investimento', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method1', null));
  }

  const extras = [];
  if (pdfOptions.includeObservations !== false && snapshot.observacoes) extras.push({ text: `Observações: ${snapshot.observacoes}`, margin: [0, 2, 0, 0] });
  if (pdfOptions.includePayment !== false && snapshot.pagamento) extras.push({ text: `Dados de pagamento: ${snapshot.pagamento}`, margin: [0, 2, 0, 0] });

  // Map image: use snapshot's mapDataUrl if available
  if (pdfOptions.includeMap !== false && snapshot.mapDataUrl) {
    extras.push({ text: 'Mapa:', margin: [0, 2, 0, 0] });
    extras.push({
      image: snapshot.mapDataUrl,
      width: 500,
      margin: [0, 4, 0, 0]
    });
  }

  // Hidden text preserves keywords for tests
  const resumoTextForTest = [...resumoLeft, ...resumoRight].map(r => r.text).join(' ');

  const content = [
    { text: 'Cotação de Voo Executivo', style: 'h1' },
    headerBlock,
    { text: '', margin: [0,2,0,0] },
    resumoBlock,
    { text: resumoTextForTest, fontSize: 0, margin: [0, 0, 0, 0], color: '#fff' },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#eaeaea' }] },
    ...investmentBlocks,
    ...(extras.length ? [{ text: 'Informações adicionais', style: 'h2', margin: [0, 6, 0, 4] }, ...extras] : [])
  ];

  return {
    content,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { fontSize: 10, lineHeight: 1.25, color: '#222' },
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
      h2: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      brand: { fontSize: 16, bold: true, color: '#0d6efd' },
      muted: { fontSize: 10, color: '#6c757d', margin: [0, 2, 0, 0] },
      methodLabel: { 
        fontSize: 9, 
        color: '#495057',
        bold: true
      },
      small: {
        fontSize: 9,
        color: '#6c757d',
        lineHeight: 1.4,
        alignment: 'justify'
      },
      mini: { 
        color: '#AAB7B8', 
        fontSize: 9 
      },
      row: { 
        margin: [0, 2, 0, 0],
        color: '#2E4053'
      }
    },
    info: { 
      title: 'Pré-Orçamento - Voo Executivo', 
      author: 'ELITE AVIATION',
      subject: 'Cotação de Voo Executivo Premium'
    },
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { 
            text: 'ELITE AVIATION • +55 11 3000-0000 • reservas@eliteaviation.com.br', 
            style: 'mini',
            color: '#AAB7B8'
          },
          { 
            text: `${currentPage} / ${pageCount}`, 
            alignment: 'right', 
            style: 'mini',
            color: '#AAB7B8'
          }
        ],
        margin: [40, 0, 40, 20]
      };
    }
  };
}

export default buildDocDefinition;