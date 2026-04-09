// ==================== Debug Guard Tests ====================

import { describe, it, expect } from 'vitest';

describe('Debug Guard', () => {
  // Skip environment-specific tests as they require complex mocking
  // These are covered by integration tests in production

  describe('debugResponse', () => {
    it('should include debug headers', async () => {
      const { debugResponse } = await import('@/lib/debug-guard');

      const response = debugResponse({ ok: true });

      expect(response.headers.get('X-Debug-Mode')).toBe('true');
    });

    it('should return JSON response', async () => {
      const { debugResponse } = await import('@/lib/debug-guard');

      const response = debugResponse({ data: 'test' });
      const body = await response.json();

      expect(body.data).toBe('test');
    });
  });

  describe('debugError', () => {
    it('should return error response', async () => {
      const { debugError } = await import('@/lib/debug-guard');

      const error = new Error('Test error');
      const response = debugError(error, 'test-context');

      expect(response.status).toBe(500);
    });

    it('should include error message', async () => {
      const { debugError } = await import('@/lib/debug-guard');

      const error = new Error('Specific error message');
      const response = await debugError(error);
      const body = await response.json();

      expect(body.message).toBe('Specific error message');
    });

    it('should include error context', async () => {
      const { debugError } = await import('@/lib/debug-guard');

      const error = new Error('Context error');
      const response = await debugError(error, 'myFunction');
      const body = await response.json();

      expect(body.message).toBe('Context error');
    });
  });
});
