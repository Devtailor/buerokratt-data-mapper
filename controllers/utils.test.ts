import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import utilsRouter from './utils';

describe('utils controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/utils', utilsRouter);
  });

  describe('POST /utils/increase-double-digit-version', () => {
    it('should increment minor version', async () => {
      const data = { version: '1.0_5' };
      const res = await request(app).post('/utils/increase-double-digit-version').send(data);

      expect(res.body).toBe('1.0_6');
      expect(res.status).toBe(200);
    });

    it('should return 400 when version is missing', async () => {
      const data = {};
      const res = await request(app).post('/utils/increase-double-digit-version').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when version is not a string', async () => {
      const data = { version: 123 };
      const res = await request(app).post('/utils/increase-double-digit-version').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /utils/object-list-contains-id', () => {
    it('should return true when id exists in list', async () => {
      const data = { id: '123', list: [{ id: '123' }, { id: '456' }] };
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.body).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return false when id does not exist in list', async () => {
      const data = { id: '999', list: [{ id: '123' }, { id: '456' }] };
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when list is empty', async () => {
      const data = { id: '123', list: [] };
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when id is missing', async () => {
      const data = { list: [{ id: '123' }, { id: '456' }] };
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return 500 when list is missing', async () => {
      const data = { id: '123' };
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.text).toContain('TypeError: array is not iterable');
      expect(res.status).toBe(500);
    });

    it('should return 500 when both id and list are missing', async () => {
      const data = {};
      const res = await request(app).post('/utils/object-list-contains-id').send(data);

      expect(res.text).toContain('TypeError: array is not iterable');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /utils/today-minus-days', () => {
    it('should return date minus specified days', async () => {
      const data = { days: 5 };
      const res = await request(app).post('/utils/today-minus-days').send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - data.days);

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });

    it('should return date minus 0 days', async () => {
      const data = { days: 0 };
      const res = await request(app).post('/utils/today-minus-days').send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });

    it('should handle negative days', async () => {
      const data = { days: -5 };
      const res = await request(app).post('/utils/today-minus-days').send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - data.days);

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });
  });

  describe('POST /utils/calculate-sha256-checksum', () => {
    it('should return SHA256 checksum for text', async () => {
      const text = 'hello world';
      const res = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text);

      expect(res.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res.status).toBe(200);
    });

    it('should return same checksum for same input', async () => {
      const text = 'test string';
      const res1 = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text);
      const res2 = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text);

      expect(res1.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res2.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res1.text).toBe(res2.text);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should return different checksum for different input', async () => {
      const text1 = 'hello';
      const text2 = 'world';
      const res1 = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text1);
      const res2 = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text2);

      expect(res1.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res2.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res1.text).not.toBe(res2.text);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should handle multiline text', async () => {
      const text = 'line1\nline2\nline3';
      const res = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send(text);

      expect(res.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res.status).toBe(200);
    });

    it('should return 400 when body is empty', async () => {
      const res = await request(app)
        .post('/utils/calculate-sha256-checksum')
        .set('Content-Type', 'text/plain')
        .send('');

      expect(res.body).toBe('error: request body is empty');
      expect(res.status).toBe(400);
    });

    it('should return 400 when no body is sent', async () => {
      const res = await request(app).post('/utils/calculate-sha256-checksum').set('Content-Type', 'text/plain');

      expect(res.body).toBe('error: request body is empty');
      expect(res.status).toBe(400);
    });

    it('should return 400 when body is parsed as JSON object', async () => {
      const text = 'hello world';
      const res = await request(app).post('/utils/calculate-sha256-checksum').send({ text });

      expect(res.body).toBe('error: request body is empty');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /utils/map-domains-data', () => {
    it('should map domains data with filtering and selection', async () => {
      const data = {
        domains: [
          { domainId: '1', name: 'Domain 1', url: 'https://domain1.com' },
          { domainId: '2', name: 'Domain 2', url: 'https://domain2.com' },
          { domainId: '3', name: 'Domain 3', url: 'https://domain3.com' },
        ],
        userDomains: { domains: ['1', '2'], selected: ['2'] },
      };
      const res = await request(app).post('/utils/map-domains-data').send(data);

      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual([
        { id: '1', name: 'Domain 1', url: 'https://domain1.com', selected: false },
        { id: '2', name: 'Domain 2', url: 'https://domain2.com', selected: true },
      ]);
      expect(res.status).toBe(200);
    });

    it('should return empty array when no domains match', async () => {
      const data = {
        domains: [{ domainId: '1', name: 'Domain 1', url: 'https://domain1.com' }],
        userDomains: { domains: [], selected: [] },
      };
      const res = await request(app).post('/utils/map-domains-data').send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should return 500 when domains is missing', async () => {
      const data = { userDomains: { domains: ['1'], selected: ['1'] } };
      const res = await request(app).post('/utils/map-domains-data').send(data);

      expect(res.text).toContain('TypeError: Cannot read properties of undefined');
      expect(res.status).toBe(500);
    });

    it('should return 500 when userDomains is missing', async () => {
      const data = { domains: [{ domainId: '1', name: 'Domain 1', url: 'https://domain1.com' }] };
      const res = await request(app).post('/utils/map-domains-data').send(data);

      expect(res.text).toContain('TypeError: Cannot read properties of undefined');
      expect(res.status).toBe(500);
    });

    it('should return 500 when body is empty', async () => {
      const data = {};
      const res = await request(app).post('/utils/map-domains-data').send(data);

      expect(res.text).toContain('TypeError: Cannot read properties of undefined');
      expect(res.status).toBe(500);
    });
  });
});
