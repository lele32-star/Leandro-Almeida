import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock global objects
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <!-- Aircraft and catalog fields (should be preserved) -->
  <select id="aeronave">
    <option value="">Choose aircraft</option>
    <option value="Hawker 400" selected>Hawker 400</option>
  </select>
  <input type="number" id="tarifa" value="36" />
  <input type="number" id="cruiseSpeed" value="430" />
  <input type="text" id="hourlyRate" value="18000" />
  
  <!-- Client/Item/Leg fields (should be cleared) -->
  <input type="number" id="nm" value="100" />
  <input type="number" id="km" value="185" />
  <input type="text" id="origem" value="SBSP" />
  <input type="text" id="destino" value="SBRJ" />
  <input type="date" id="dataIda" value="2024-01-01" />
  <input type="date" id="dataVolta" value="2024-01-02" />
  <textarea id="observacoes">Test observation</textarea>
  <input type="number" id="valorExtra" value="500" />
  <select id="tipoExtra">
    <option value="soma" selected>Add</option>
  </select>
  
  <!-- PDF checkboxes (should be preserved/reset to default) -->
  <input type="checkbox" id="showRota" checked />
  <input type="checkbox" id="showAeronave" checked />
  <input type="checkbox" id="showTarifa" checked />
  <input type="checkbox" id="showDistancia" checked />
  <input type="checkbox" id="showDatas" checked />
  <input type="checkbox" id="showAjuste" checked />
  <input type="checkbox" id="showObservacoes" checked />
  <input type="checkbox" id="showPagamento" checked />
  <input type="checkbox" id="showMapa" checked />
  
  <!-- Result and commission elements -->
  <div id="resultado">Some result content</div>
  <div id="comissoes">Commission content</div>
  <div id="comissaoConfig" style="display: block;">Config</div>
  
  <!-- Commission component -->
  <div id="commission-component">
    <button id="btnAddCommission" aria-pressed="true">Remove commission</button>
    <div id="commissionPanel">Panel content</div>
    <input id="commissionPercent" value="10" />
    <div id="commissionPreview">Commission: R$ 100,00</div>
    <input id="commissionAmount" value="100" />
  </div>
  
  <input type="checkbox" id="pdfCommissionToggle" />
</body>
</html>
`);

global.document = dom.window.document;
global.window = dom.window;
global.Event = dom.window.Event;

// Import the function after setting up DOM
const app = await import('../app.js');

describe('limparCampos function', () => {
  beforeEach(() => {
    // Reset DOM state before each test
    document.getElementById('aeronave').value = 'Hawker 400';
    document.getElementById('tarifa').value = '36';
    document.getElementById('cruiseSpeed').value = '430';
    document.getElementById('hourlyRate').value = '18000';
    
    document.getElementById('nm').value = '100';
    document.getElementById('km').value = '185';
    document.getElementById('origem').value = 'SBSP';
    document.getElementById('destino').value = 'SBRJ';
    document.getElementById('dataIda').value = '2024-01-01';
    document.getElementById('dataVolta').value = '2024-01-02';
    document.getElementById('observacoes').value = 'Test observation';
    document.getElementById('valorExtra').value = '500';
    document.getElementById('tipoExtra').value = 'soma';
    
    document.getElementById('resultado').innerHTML = 'Some result content';
    document.getElementById('comissoes').innerHTML = 'Commission content';
    document.getElementById('comissaoConfig').style.display = 'block';
  });

  it('should preserve aircraft selection', () => {
    window.limparCampos();
    
    expect(document.getElementById('aeronave').value).toBe('Hawker 400');
  });

  it('should preserve catalog data (tarifa, cruise speed, hourly rate)', () => {
    window.limparCampos();
    
    expect(document.getElementById('tarifa').value).toBe('36');
    expect(document.getElementById('cruiseSpeed').value).toBe('430');
    expect(document.getElementById('hourlyRate').value).toBe('18000');
  });

  it('should clear client/item/leg fields', () => {
    window.limparCampos();
    
    expect(document.getElementById('nm').value).toBe('');
    expect(document.getElementById('km').value).toBe('');
    expect(document.getElementById('origem').value).toBe('');
    expect(document.getElementById('destino').value).toBe('');
    expect(document.getElementById('dataIda').value).toBe('');
    expect(document.getElementById('dataVolta').value).toBe('');
    expect(document.getElementById('observacoes').value).toBe('');
    expect(document.getElementById('valorExtra').value).toBe('');
  });

  it('should reset PDF checkboxes to default checked state', () => {
    // First uncheck some boxes
    document.getElementById('showRota').checked = false;
    document.getElementById('showAeronave').checked = false;
    
    window.limparCampos();
    
    expect(document.getElementById('showRota').checked).toBe(true);
    expect(document.getElementById('showAeronave').checked).toBe(true);
    expect(document.getElementById('showTarifa').checked).toBe(true);
    expect(document.getElementById('showDistancia').checked).toBe(true);
    expect(document.getElementById('showDatas').checked).toBe(true);
    expect(document.getElementById('showAjuste').checked).toBe(true);
    expect(document.getElementById('showObservacoes').checked).toBe(true);
    expect(document.getElementById('showPagamento').checked).toBe(true);
    expect(document.getElementById('showMapa').checked).toBe(true);
  });

  it('should clear result and commission areas', () => {
    window.limparCampos();
    
    expect(document.getElementById('resultado').innerHTML).toBe('');
    expect(document.getElementById('comissoes').innerHTML).toBe('');
    expect(document.getElementById('comissaoConfig').style.display).toBe('none');
  });

  it('should reset commission component', () => {
    window.limparCampos();
    
    const btnAdd = document.getElementById('btnAddCommission');
    const panel = document.getElementById('commissionPanel');
    const percent = document.getElementById('commissionPercent');
    const preview = document.getElementById('commissionPreview');
    const amountHidden = document.getElementById('commissionAmount');
    
    expect(panel.hidden).toBe(true);
    expect(btnAdd.getAttribute('aria-pressed')).toBe('false');
    expect(btnAdd.textContent).toBe('Adicionar comissão');
    expect(percent.value).toBe('5');
    expect(preview.textContent).toBe('Comissão: R$ 0,00');
    expect(amountHidden.value).toBe('0');
  });
});