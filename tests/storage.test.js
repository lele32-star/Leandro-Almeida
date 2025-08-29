// Test for storage.js functionality
import { expect, test, describe, beforeEach } from 'vitest';
import { saveDraft, loadDraft, migrateIfNeeded } from '../src/persist/storage.js';

// Mock localStorage for testing
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value;
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

describe('Storage API - Fase 6', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saveDraft should save with version', () => {
    const testState = {
      aeronave: 'Hawker 400',
      nm: 100,
      origem: 'SBBR',
      destino: 'SBMO'
    };

    const result = saveDraft(testState);
    expect(result).toBe(true);

    const savedData = localStorage.getItem('app:quote:draft');
    expect(savedData).not.toBeNull();
    
    const parsed = JSON.parse(savedData);
    expect(parsed.draftVersion).toBe(1);
    expect(parsed.state).toEqual(testState);
    expect(parsed.timestamp).toBeDefined();
  });

  test('loadDraft should return saved draft', () => {
    const testState = {
      aeronave: 'Phenom 100', 
      nm: 200,
      origem: 'SBGL',
      destino: 'SBBR'
    };

    saveDraft(testState);
    const loaded = loadDraft();
    
    expect(loaded).not.toBeNull();
    expect(loaded.draftVersion).toBe(1);
    expect(loaded.state).toEqual(testState);
  });

  test('migration should handle legacy drafts', () => {
    const legacyDraft = {
      state: {
        aeronave: 'Citation II',
        nm: 150
      },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    // Simulate legacy data
    localStorage.setItem('cotacao:currentDraft', JSON.stringify(legacyDraft));

    const migrated = migrateIfNeeded();
    expect(migrated).toBe(true);

    // Should have migrated to new key
    const newDraft = localStorage.getItem('app:quote:draft');
    expect(newDraft).not.toBeNull();
    
    const parsed = JSON.parse(newDraft);
    expect(parsed.draftVersion).toBe(1);
    expect(parsed.migratedFrom).toBe('legacy');
    expect(parsed.state.aeronave).toBe('Citation II');
  });

  test('loadDraft should handle legacy drafts', () => {
    const legacyDraft = {
      state: {
        aeronave: 'King Air C90',
        nm: 80
      },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    // Set only legacy key
    localStorage.setItem('cotacao:currentDraft', JSON.stringify(legacyDraft));

    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded.draftVersion).toBe(1);
    expect(loaded.state.aeronave).toBe('King Air C90');
    expect(loaded.migratedFrom).toBe('legacy');

    // Should have saved migrated version
    const newDraft = localStorage.getItem('app:quote:draft');
    expect(newDraft).not.toBeNull();
  });

  test('should return null when no draft exists', () => {
    const loaded = loadDraft();
    expect(loaded).toBeNull();
  });
});