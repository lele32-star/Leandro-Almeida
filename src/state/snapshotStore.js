/**
 * Snapshot Store - Isolates freeze/unfreeze functionality
 * 
 * Manages immutable quote snapshots and validation before recomputation.
 * Provides clean API for freezing quotes and preventing changes when frozen.
 */

// Private state
let __frozenQuote = null;
const FROZEN_KEY = 'quote:last';
const CURRENT_VERSION = '1.0';

/**
 * Freezes a quote with the given state snapshot
 * @param {Object} state - The complete state to freeze
 * @returns {Object} The frozen quote object
 */
export function freezeQuote(state) {
  __frozenQuote = {
    version: CURRENT_VERSION,
    selectedMethod: state.selectedMethod || 'distance',
    snapshot: { ...state },
    ts: Date.now()
  };
  
  try {
    localStorage.setItem(FROZEN_KEY, JSON.stringify(__frozenQuote));
  } catch (e) {
    console.warn('Failed to save frozen quote to localStorage:', e);
  }
  
  return __frozenQuote;
}

/**
 * Unfreezes the current quote, allowing modifications
 */
export function unfreezeQuote() {
  __frozenQuote = null;
  try {
    localStorage.removeItem(FROZEN_KEY);
  } catch (e) {
    console.warn('Failed to remove frozen quote from localStorage:', e);
  }
}

/**
 * Gets the current frozen quote if available
 * @returns {Object|null} The frozen quote or null if none exists
 */
export function getFrozenQuote() {
  if (__frozenQuote) return __frozenQuote;
  
  try {
    const raw = localStorage.getItem(FROZEN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Check version compatibility
      if (parsed.version === CURRENT_VERSION) {
        __frozenQuote = parsed;
        return __frozenQuote;
      } else {
        console.warn('Incompatible snapshot version, ignoring:', parsed.version);
        localStorage.removeItem(FROZEN_KEY);
        return null;
      }
    }
  } catch (e) {
    console.warn('Failed to load frozen quote from localStorage:', e);
  }
  
  return null;
}

/**
 * Checks if there is currently a frozen quote
 * @returns {boolean} True if a quote is frozen
 */
export function isFrozen() {
  return getFrozenQuote() !== null;
}

/**
 * Asserts that the state is mutable (not frozen) or throws an error
 * Call this before any recomputation to prevent changes when frozen
 * @throws {Error} If the quote is currently frozen
 */
export function assertMutableOrThrow() {
  if (isFrozen()) {
    throw new Error('Quote is frozen. Cannot modify values. Please unfreeze first.');
  }
}

// For backward compatibility, export the legacy functions if needed
export { __frozenQuote as _internalFrozenState };