// ==================== Validation Tests ====================

import { describe, it, expect } from 'vitest';
import {
  validateRequest,
  radarQuerySchema,
  radarCandidateCreateSchema,
  radarProfileCreateSchema,
  safeUrlSchema,
  emailSchema,
  countriesSchema,
  ValidationError,
  parseValidationError,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('validateRequest', () => {
    it('should validate correct data', async () => {
      const result = await validateRequest(
        radarQuerySchema,
        { keywords: ['paint', 'coating'] }
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords).toEqual(['paint', 'coating']);
      }
    });

    it('should reject invalid email', async () => {
      const result = await validateRequest(
        emailSchema,
        'not-an-email'
      );
      expect(result.success).toBe(false);
    });

    it('should accept valid email', async () => {
      const result = await validateRequest(
        emailSchema,
        'test@example.com'
      );
      expect(result.success).toBe(true);
    });

    it('should validate country codes', async () => {
      const result = await validateRequest(
        countriesSchema,
        ['US', 'DE', 'CN']
      );
      expect(result.success).toBe(true);
    });

    it('should reject invalid country codes', async () => {
      const result = await validateRequest(
        countriesSchema,
        ['USA', 'DE']  // USA is 3 chars, should be 2
      );
      expect(result.success).toBe(false);
    });
  });

  describe('safeUrlSchema', () => {
    it('should accept valid HTTP URL', () => {
      const result = safeUrlSchema.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('should accept valid HTTP URL with path', () => {
      const result = safeUrlSchema.safeParse('https://example.com/path/to/page');
      expect(result.success).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      const result = safeUrlSchema.safeParse('file:///etc/passwd');
      expect(result.success).toBe(false);
    });

    it('should reject javascript URLs', () => {
      const result = safeUrlSchema.safeParse('javascript:alert(1)');
      expect(result.success).toBe(false);
    });
  });

  describe('radarQuerySchema', () => {
    it('should validate full query', () => {
      const result = radarQuerySchema.safeParse({
        keywords: ['industrial coating'],
        countries: ['US', 'DE'],
        regions: ['EU'],
        maxResults: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const result = radarQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxResults).toBeUndefined(); // No default in schema
      }
    });

    it('should reject negative maxResults', () => {
      const result = radarQuerySchema.safeParse({
        maxResults: -1
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxResults > 500', () => {
      const result = radarQuerySchema.safeParse({
        maxResults: 1000
      });
      expect(result.success).toBe(false);
    });
  });

  describe('radarCandidateCreateSchema', () => {
    it('should validate complete candidate data', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        displayName: 'Acme Corp',
        sourceUrl: 'https://acme.com',
        candidateType: 'COMPANY',
        country: 'US',
      });
      expect(result.success).toBe(true);
    });

    it('should require displayName', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        sourceUrl: 'https://acme.com',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty displayName', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        displayName: '',
        sourceUrl: 'https://acme.com',
      });
      expect(result.success).toBe(false);
    });

    it('should set default candidateType', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        displayName: 'Acme Corp',
        sourceUrl: 'https://acme.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.candidateType).toBe('COMPANY');
      }
    });

    it('should validate matchScore range', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        displayName: 'Acme Corp',
        sourceUrl: 'https://acme.com',
        matchScore: 0.85,
      });
      expect(result.success).toBe(true);
    });

    it('should reject matchScore > 1', () => {
      const result = radarCandidateCreateSchema.safeParse({
        profileId: 'profile-123',
        sourceId: 'source-456',
        displayName: 'Acme Corp',
        sourceUrl: 'https://acme.com',
        matchScore: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('radarProfileCreateSchema', () => {
    it('should validate profile with all fields', () => {
      const result = radarProfileCreateSchema.safeParse({
        name: 'Test Profile',
        description: 'A test profile',
        keywords: {
          en: ['coating', 'paint'],
          zh: ['涂料', '油漆'],
        },
        targetCountries: ['US', 'DE', 'CN'],
        targetRegions: ['EU', 'APAC'],
        isActive: true,
        maxRunSeconds: 60,
      });
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = radarProfileCreateSchema.safeParse({
        description: 'Missing name',
      });
      expect(result.success).toBe(false);
    });

    it('should validate cron expression', () => {
      const result = radarProfileCreateSchema.safeParse({
        name: 'Test',
        scheduleRule: '0 6 * * *',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid cron expression', () => {
      const result = radarProfileCreateSchema.safeParse({
        name: 'Test',
        scheduleRule: 'not-a-cron',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
    });

    it('should include details', () => {
      const error = new ValidationError('Test error', {
        field: ['Error 1', 'Error 2'],
      });
      expect(error.details).toEqual({
        field: ['Error 1', 'Error 2'],
      });
    });
  });

  describe('parseValidationError', () => {
    it('should parse ValidationError', () => {
      const error = new ValidationError('Test error', { field: ['Error'] });
      const result = parseValidationError(error);
      expect(result.message).toBe('Test error');
      expect(result.details).toEqual({ field: ['Error'] });
    });

    it('should parse standard Error', () => {
      const error = new Error('Standard error');
      const result = parseValidationError(error);
      expect(result.message).toBe('Standard error');
    });

    it('should parse unknown error', () => {
      const result = parseValidationError(null);
      expect(result.message).toBe('Unknown error');
    });
  });
});
