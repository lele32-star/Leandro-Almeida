/**
 * Central recalc scheduler with debounce
 * Objective: Avoid excessive re-renders and multiple recalculations
 * 
 * This module provides a centralized way to schedule recalculations
 * that automatically debounces multiple rapid calls into a single execution.
 */

// Track scheduled functions to avoid duplicates
let scheduledCallbacks = new Set();
let pendingExecution = null;

/**
 * Schedule a recalculation function with debounce
 * @param {Function} fn - Function to execute (typically gerarPreOrcamento)
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Delay in milliseconds (default: 0)
 * @param {boolean} options.microtask - Use microtask scheduling if true (default: true)
 * @returns {void}
 */
function scheduleRecalc(fn, options = {}) {
  if (typeof fn !== 'function') {
    console.warn('scheduleRecalc: fn must be a function');
    return;
  }

  const { delay = 0, microtask = true } = options;

  // Add function to scheduled set
  scheduledCallbacks.add(fn);

  // Cancel any pending execution
  if (pendingExecution) {
    if (typeof pendingExecution === 'number') {
      clearTimeout(pendingExecution);
    }
    pendingExecution = null;
  }

  // Schedule execution
  const executeScheduled = () => {
    const callbacks = Array.from(scheduledCallbacks);
    scheduledCallbacks.clear();
    pendingExecution = null;

    // Execute all scheduled callbacks
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing scheduled recalc:', error);
      }
    });
  };

  if (delay > 0) {
    // Use setTimeout for delayed execution
    pendingExecution = setTimeout(executeScheduled, delay);
  } else if (microtask) {
    // Use Promise.resolve() for microtask scheduling
    pendingExecution = Promise.resolve().then(executeScheduled);
  } else {
    // Use requestAnimationFrame for frame-based scheduling
    if (typeof requestAnimationFrame !== 'undefined') {
      pendingExecution = requestAnimationFrame(executeScheduled);
    } else {
      // Fallback to immediate execution in non-browser environments
      pendingExecution = setTimeout(executeScheduled, 0);
    }
  }
}

/**
 * Cancel any pending scheduled recalculations
 * @returns {void}
 */
function cancelScheduledRecalc() {
  if (pendingExecution) {
    if (typeof pendingExecution === 'number') {
      clearTimeout(pendingExecution);
    } else if (typeof requestAnimationFrame !== 'undefined' && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(pendingExecution);
    }
    pendingExecution = null;
  }
  scheduledCallbacks.clear();
}

/**
 * Check if there are any pending recalculations
 * @returns {boolean}
 */
function hasPendingRecalc() {
  return scheduledCallbacks.size > 0 || pendingExecution !== null;
}

// For backward compatibility in browser environments
if (typeof window !== 'undefined') {
  window.scheduleRecalc = scheduleRecalc;
  window.cancelScheduledRecalc = cancelScheduledRecalc;
  window.hasPendingRecalc = hasPendingRecalc;
}