// Vitest setup: garante window/global e carrega safeExport
if (typeof window === 'undefined') {
  global.window = global;
}
import '../src/utils/safeExport.js';
