import { describe, it, expect } from 'vitest';

import '../src/utils/safeExport.js';
import '../src/state/snapshotStore.js';

describe('freeze', () => {
  const S = window.App.state;
  it('congela e impede mutações', () => {
    S.freezeQuote({ total: 123 });
    expect(S.isFrozen()).toBe(true);
    expect(S.getFrozenQuote().total).toBe(123);
    expect(() => S.assertMutableOrThrow()).toThrow();
    S.unfreezeQuote();
    expect(S.isFrozen()).toBe(false);
  });
});
