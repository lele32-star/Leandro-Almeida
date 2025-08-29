// Formatação e parsing numérico/BRL puros (sem acessar DOM)
// Pure functions: não dependem de window/document

export function parseBRNumber(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  let s = String(input).trim();
  if (!s) return 0;
  // remover espaços e símbolos monetários
  s = s.replace(/R\$/i, '').replace(/\s+/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // Formato típico 1.234,56 -> remover pontos milhares e trocar vírgula por ponto
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma && !hasDot) {
    // Apenas vírgula decimal
    s = s.replace(/,/g, '.');
  } else if (!hasComma && hasDot) {
    // Apenas pontos: pode ser milhares (2.500) ou decimal (2.5). Heurística: se depois do último ponto houver exatamente 3 dígitos, tratar como milhares.
    const lastSeg = s.split('.').pop();
    if (lastSeg && lastSeg.length === 3) {
      s = s.replace(/\./g, '');
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(n, decimals = 2) {
  const num = Number(n) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatBRL(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ES module exports already declared
