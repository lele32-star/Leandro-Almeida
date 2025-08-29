 (function(){
  const parseBRNumber = (str) => {
    if (str == null) return NaN;
    const s = String(str).trim().replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const formatNumber = (n, decimals = 2) => {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  const formatBRL = (n) => {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  safeExport('format', { parseBRNumber, formatNumber, formatBRL });
 })();
