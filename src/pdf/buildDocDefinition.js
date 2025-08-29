/* Pure PDF docDefinition builder (no DOM access) */
(function(root){
  function buildDocDefinition(state, methodSelection = 'method1', pdfOptions = {}, helpers = {}) {
    const { calcularComissao, obterComissao, aircraftCatalog = [] } = helpers;
    const km = state.nm * 1.852;
    const subtotal = km * state.valorKm;
    const ajusteAplicado = state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra;
    const totalSemComissao = subtotal + ajusteAplicado;
    const { totalComissao, detalhesComissao } = calcularComissao(
      subtotal,
      state.valorExtra,
      state.tipoExtra,
      state.commissions || []
    );
    const commissionAmount = obterComissao(km, state.valorKm);
    const total = totalSemComissao + totalComissao + commissionAmount;

    // Método 2 se fornecido em state.metodo2
    let method2Data = null;
    if (state.metodo2) {
      const m2 = state.metodo2;
      const m2Comm = calcularComissao(
        m2.subtotal || m2.subtotal || 0,
        state.valorExtra,
        state.tipoExtra,
        state.commissions || []
      );
      const m2Commission = obterComissao(km, state.valorKm);
      const m2Total = m2.total || ( (m2.subtotal||0) + (state.tipoExtra==='soma'?state.valorExtra:-state.valorExtra) + m2Comm.totalComissao + m2Commission );
      method2Data = {
        subtotal: m2.subtotal || 0,
        total: m2Total,
        totalHours: m2.totalHours,
        totalHhmm: m2.totalHhmm,
        detalhesComissao: m2Comm.detalhesComissao,
        totalComissao: m2Comm.totalComissao
      };
    }

    const methodLabel = methodSelection === 'method2' ? 'Base: Tempo (R$/h x horas)' : 'Base: Distância';
    const headerBlock = {
      columns: [
        { width: 80, stack: [ { canvas: [ { type: 'rect', x:0,y:0,w:60,h:40,color:'#f0f0f0' } ] } ], margin:[0,0,0,0] },
        { stack: [ { text: '[NOME_EMPRESA]', style: 'brand' }, { text: '[SLOGAN_CURTO]', style:'muted' }, { text: methodLabel, style:'methodLabel', margin:[0,4,0,0] } ], alignment:'left' },
        { stack: [ { text:'[EMAIL_CONTATO]', style:'mini' }, { text:'[WHATSAPP_LINK]', style:'mini' }, { text:'[CNPJ_OPCIONAL]', style:'mini' } ], alignment:'right' }
      ],
      columnGap:10,
      margin:[0,0,0,12]
    };

    const resumoLeft = [];
    const showAircraft = pdfOptions.hasOwnProperty('includeAircraft') ? pdfOptions.includeAircraft : true;
    const showDates = pdfOptions.hasOwnProperty('includeDates') ? pdfOptions.includeDates : true;
    const showRoute = pdfOptions.hasOwnProperty('includeRoute') ? pdfOptions.includeRoute : true;
    if (showRoute) {
      const codes = [state.origem, state.destino, ...(state.stops || [])].filter(Boolean).join(' → ');
      resumoLeft.push({ text: `Rota: ${codes}`, style: 'row' });
    }
    if (showAircraft) resumoLeft.push({ text: `Aeronave: ${state.aeronave}`, style: 'row' });
    if (showDates) resumoLeft.push({ text: `Datas: ${state.dataIda} - ${state.dataVolta}`, style: 'row' });

    function createInvestmentBlock(methodType, methodData, isSecondary=false){
      const investBody = [];
      const totalUsed = methodType === 'method1' ? total : methodData.total;
      const subtotalUsed = methodType === 'method1' ? subtotal : methodData.subtotal;
      const detalhesUsed = methodType === 'method1' ? detalhesComissao : methodData.detalhesComissao;
      if (methodType === 'method1') {
        investBody.push([{ text: `Total parcial (km×tarifa): R$ ${subtotalUsed.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right' }]);
      } else {
        const entry = aircraftCatalog.find(a => a.nome === state.aeronave || a.id === state.aeronave);
        const hourlyRate = entry ? entry.hourly_rate_brl_default : 0;
        investBody.push([{ text: `Valor hora: R$ ${hourlyRate.toLocaleString('pt-BR',{minimumFractionDigits:2})}/h`, alignment:'right' }]);
        investBody.push([{ text: `Tempo total: ${methodData.totalHhmm} (${methodData.totalHours.toFixed(2)}h)`, alignment:'right' }]);
        investBody.push([{ text: `Total parcial (tempo×hora): R$ ${subtotalUsed.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right' }]);
      }
      if (state.showAjuste && state.valorExtra > 0) {
        const label = state.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
        investBody.push([{ text: `${label}: R$ ${state.valorExtra.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right' }]);
      }
      const showCommissionInPdf = state.showComissao && (pdfOptions.includeCommission || pdfOptions.includeCommission === undefined);
      if (showCommissionInPdf) {
        (detalhesUsed||[]).forEach((c, idx) => investBody.push([{ text: `Comissão ${idx+1}: R$ ${c.calculado.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right' }]));
        if (commissionAmount > 0) investBody.push([{ text: `Comissão: R$ ${commissionAmount.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right' }]);
      } else if (state.showComissao && pdfOptions.includeCommission === false) {
        investBody.push([{ text: 'Comissões ocultadas', fontSize:0, alignment:'right' }]);
      }
      investBody.push([{ text: `Total Final: R$ ${totalUsed.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right', bold:true }]);
      return { table:{ widths:['*'], body: investBody }, layout:{ fillColor:(rowIndex)=> (rowIndex===investBody.length-1 ? (isSecondary?'#17a2b8':'#0d6efd') : (rowIndex%2===0?null:'#fafafa')), hLineColor:()=> '#eaeaea', vLineColor:()=> '#ffffff', paddingTop:(i)=> (i===investBody.length-1?8:6), paddingBottom:(i)=> (i===investBody.length-1?8:6) }, margin:[0,6,0,12] };
    }

    const resumoRight = [];
    const includeDistance = pdfOptions.hasOwnProperty('includeDistance') ? pdfOptions.includeDistance : state.showDistancia;
    const includeTariff = pdfOptions.hasOwnProperty('includeTariff') ? pdfOptions.includeTariff : state.showTarifa;
    const includeHourly = pdfOptions.hasOwnProperty('includeMethod2') ? pdfOptions.includeMethod2 : ((methodSelection === 'method2' || methodSelection === 'both') && !!method2Data);
    if (includeDistance) resumoRight.push({ text: `Distância: ${state.nm} NM (${km.toFixed(1)} km)`, style:'row' });
    if (includeTariff) resumoRight.push({ text: `Tarifa por km: R$ ${state.valorKm.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, style:'row' });
    if (includeHourly && method2Data) {
      const entry = aircraftCatalog.find(a => a.nome === state.aeronave || a.id === state.aeronave);
      const hourlyRate = entry ? entry.hourly_rate_brl_default : 0;
      resumoRight.push({ text: `Valor por hora: R$ ${hourlyRate.toLocaleString('pt-BR',{minimumFractionDigits:2})}/h`, style:'row' });
    }

    const resumoBlock = { table:{ widths:['*','*'], body:[[ { stack:resumoLeft, margin:[0,0,0,0] }, { stack:resumoRight, margin:[0,0,0,0] } ]] }, layout:{ hLineWidth:()=>0, vLineWidth:()=>0, paddingTop:()=>6, paddingBottom:()=>6 }, margin:[0,6,0,10] };

    const investmentBlocks = [];
    let wantMethod1, wantMethod2;
    if (methodSelection === 'method1') { wantMethod1 = true; wantMethod2 = false; }
    else if (methodSelection === 'method2') { wantMethod2 = true; wantMethod1 = false; }
    else if (methodSelection === 'both') { wantMethod1 = true; wantMethod2 = !!method2Data; }
    else { wantMethod1 = true; }

    if (wantMethod1) investmentBlocks.push(createInvestmentBlock('method1', null, methodSelection==='both'));
    if (wantMethod2 && method2Data) investmentBlocks.push(createInvestmentBlock('method2', method2Data, methodSelection==='both'));

    const observationsBlock = (state.observacoes && pdfOptions.includeObservations !== false) ? { text: `Observações:\n${state.observacoes}`, style:'obs', margin:[0,10,0,0] } : null;
    const paymentBlock = (state.pagamento && pdfOptions.includePayment !== false) ? { text: `Pagamento:\n${state.pagamento}`, style:'obs', margin:[0,10,0,0] } : null;

    const doc = {
      pageMargins:[40,60,40,40],
      content: [ headerBlock, resumoBlock, ...investmentBlocks, observationsBlock, paymentBlock ].filter(Boolean),
      styles:{
        brand:{ fontSize:16, bold:true },
        muted:{ fontSize:8, color:'#666' },
        methodLabel:{ fontSize:9, italics:true, color:'#444' },
        row:{ fontSize:10, margin:[0,2,0,0] },
        mini:{ fontSize:7 },
        obs:{ fontSize:9, color:'#333' }
      },
      footer: function(currentPage,pageCount){
        return { columns:[ { text:'ELITE AVIATION • +55 11 3000-0000 • reservas@eliteaviation.com.br', style:'mini', color:'#AAB7B8' }, { text:`${currentPage} / ${pageCount}`, alignment:'right', style:'mini', color:'#AAB7B8' } ], margin:[40,0,40,20] };
      }
    };
    return doc;
  }
  const api = { buildDocDefinition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PdfBuilder = api;
})(typeof window !== 'undefined' ? window : globalThis);
