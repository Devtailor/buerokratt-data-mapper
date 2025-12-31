import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import cronRouter from './cron';

describe('cron controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/cron', cronRouter);
  });

  describe('POST /cron/generate-expression-date-days', () => {
    it('should generate cron expression and start date from ISO date string', async () => {
      const data = { date: '2024-01-15T14:30:45.123Z', days: 'MON-FRI' };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.body).toEqual({
        expression: '45 30 14 ? * MON-FRI *',
        startDate: Date.parse('2024-01-15T14:30:45.123Z'),
      });
      expect(res.status).toBe(200);
    });

    it('should return 400 when date is missing', async () => {
      const data = { days: 'MON-FRI' };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when date is not a string', async () => {
      const data = { date: 20240115, days: 'MON-FRI' };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when days is missing', async () => {
      const data = { date: '2024-01-15T14:30:45.123Z' };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when days is not a string', async () => {
      const data = { date: '2024-01-15T14:30:45.123Z', days: 123 };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 500 when date format is not valid ISO string', async () => {
      const data = { date: '2024-01-15', days: 'MON-FRI' };
      const res = await request(app).post('/cron/generate-expression-date-days').send(data);

      expect(res.text).toContain('TypeError');
      expect(res.status).toBe(500);
    });
  });
});
