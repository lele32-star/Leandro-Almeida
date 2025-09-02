 (function(){
  function buildDocDefinition(snapshot) {
    // use os campos reais do seu snapshot
    const { cliente, itens, totais, meta } = snapshot;
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      content: [
        { text: meta?.empresaNome || 'Cotação', style: 'h1' },
        { text: meta?.slogan || '', margin: [0,0,0,10] },
        { text: `Cliente: ${cliente?.nome || ''}`, margin: [0,0,0,10] },
        {
          table: {
            widths: ['*','auto','auto','auto'],
            body: [
              [{text:'Item', style:'th'}, {text:'Qtd', style:'th'}, {text:'Preço', style:'th'}, {text:'Subtotal', style:'th'}],
              ...(itens||[]).map(i => [i.nome, i.qtd, i.precoFmt, i.subtotalFmt])
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0,10,0,10]
        },
        { text: `Total: ${totais?.totalFmt || '—'}`, style: 'h2', alignment: 'right' },
      ],
      styles: { h1:{fontSize:18,bold:true}, h2:{fontSize:14,bold:true}, th:{bold:true} }
    };
  }
  safeExport('pdf', Object.assign(window.App.pdf || {}, { buildDocDefinition }));
})();
