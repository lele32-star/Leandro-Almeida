import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Share Module', () => {
  let dom;
  let window;
  let mockClipboard;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    window = dom.window;
    global.window = window;
    global.document = window.document;
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:http://localhost/test-blob-url'),
      revokeObjectURL: vi.fn()
    };
    
    // Mock navigator.clipboard
    mockClipboard = {
      writeText: vi.fn(() => Promise.resolve())
    };
    global.navigator = { clipboard: mockClipboard };

    // Mock safeExport
    global.safeExport = vi.fn();

    // Set up App namespace
    global.window.App = {};

    // Load the share module
    const fs = require('fs');
    const path = require('path');
    const shareModule = fs.readFileSync(
      path.join(__dirname, '../src/share/index.js'),
      'utf8'
    );
    eval(shareModule);
  });

  it('should export createShareLink function to App.share', () => {
    expect(global.safeExport).toHaveBeenCalledWith(
      'share',
      expect.objectContaining({
        createShareLink: expect.any(Function)
      })
    );
  });

  it('should create blob URL and copy to clipboard', async () => {
    const snapshot = { test: 'data', value: 123 };
    
    // Get the function that was exported
    const exportCall = global.safeExport.mock.calls[0];
    const shareObject = exportCall[1];
    const createShareLink = shareObject.createShareLink;

    const result = await createShareLink(snapshot);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.any(Object) // Blob object
    );
    expect(mockClipboard.writeText).toHaveBeenCalledWith('blob:http://localhost/test-blob-url');
    expect(result).toBe('blob:http://localhost/test-blob-url');
  });

  it('should handle clipboard errors gracefully', async () => {
    const snapshot = { test: 'data' };
    
    // Make clipboard fail
    mockClipboard.writeText = vi.fn(() => Promise.reject(new Error('Clipboard failed')));
    
    const exportCall = global.safeExport.mock.calls[0];
    const shareObject = exportCall[1];
    const createShareLink = shareObject.createShareLink;

    // Should not throw error
    const result = await createShareLink(snapshot);
    
    expect(result).toBe('blob:http://localhost/test-blob-url');
  });
});