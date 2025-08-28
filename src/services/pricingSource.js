// src/services/pricingSource.js
import { loadCatalog, loadOverrides, mergeEffectiveParams } from './aircraftCatalog.js';

let cachedCatalog = null;
let cachedOverrides = null;

export async function getEffectivePricing(aircraftId) {
  if (!cachedCatalog) {
    cachedCatalog = await loadCatalog();
  }
  if (!cachedOverrides) {
    cachedOverrides = loadOverrides();
  }

  const aircraft = cachedCatalog.find(a => a.id === aircraftId);
  if (!aircraft) {
    throw new Error(`Aeronave ${aircraftId} não encontrada no catálogo`);
  }

  return mergeEffectiveParams(aircraft, cachedOverrides);
}

export function getTarifaKmFromAircraft(aircraftId) {
  // Função utilitária para compatibilidade com código existente
  try {
    const effective = getEffectivePricing(aircraftId);
    return effective.tarifa_km_brl_effective;
  } catch {
    return null;
  }
}

export function invalidateCache() {
  cachedCatalog = null;
  cachedOverrides = null;
}
