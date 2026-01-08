import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import domainRouter from './domain';

describe('domain controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/domain', domainRouter);
  });

  describe('POST /domain/update-existing-response', () => {
    it('should update existing response and delete old value', async () => {
      const data = {
        json: { old_key: [{ text: 'old value' }] },
        searchKey: 'old_key',
        newKey: 'new_key',
        newKeyValue: 'new value',
      };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({ new_key: [{ text: 'new value' }] });
      expect(res.status).toBe(200);
    });

    it('should update existing response and keep old value', async () => {
      const data = {
        json: { old_key: [{ text: 'old value' }] },
        searchKey: 'old_key',
        newKey: 'new_key',
        newKeyValue: 'new value',
        deleteOldValue: false,
      };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({ old_key: [{ text: 'old value' }], new_key: [{ text: 'new value' }] });
      expect(res.status).toBe(200);
    });

    it('should not create new key when no matching key found and createIfAbsent is false', async () => {
      const data = {
        json: { old_key: [{ text: 'old value' }] },
        searchKey: 'nonexistent',
        newKey: 'new_key',
        newKeyValue: 'new value',
      };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({ old_key: [{ text: 'old value' }] });
      expect(res.status).toBe(200);
    });

    it('should create new key when no matching key found and createIfAbsent is true', async () => {
      const data = {
        json: { old_key: [{ text: 'old value' }] },
        searchKey: 'nonexistent',
        newKey: 'new_key',
        newKeyValue: 'new value',
        createIfAbsent: true,
      };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({ old_key: [{ text: 'old value' }], new_key: [{ text: 'new value' }] });
      expect(res.status).toBe(200);
    });

    it('should handle multiple keys including searchKey', async () => {
      const data = {
        json: {
          old_key_1: [{ text: 'one value' }],
          old_key_2: [{ text: 'two value' }],
          other_key: [{ text: 'other' }],
        },
        searchKey: 'old_key',
        newKey: 'new_key',
        newKeyValue: 'new',
      };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({ new_key: [{ text: 'new' }], other_key: [{ text: 'other' }] });
      expect(res.status).toBe(200);
    });

    it('should handle empty json object', async () => {
      const data = { json: {}, searchKey: 'old_key', newKey: 'new_key', newKeyValue: 'new value' };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it('should return 400 when json is missing', async () => {
      const data = { searchKey: 'old_key', newKey: 'new_key', newKeyValue: 'new value' };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body.message).toBe('json, searchKey, newKey, newKeyValue are required fields');
      expect(res.status).toBe(400);
    });

    it('should return 400 when searchKey is missing', async () => {
      const data = { json: { old_key: [{ text: 'old value' }] }, newKey: 'new_key', newKeyValue: 'new value' };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body.message).toBe('json, searchKey, newKey, newKeyValue are required fields');
      expect(res.status).toBe(400);
    });

    it('should return 400 when newKey is missing', async () => {
      const data = { json: { old_key: [{ text: 'old value' }] }, searchKey: 'old_key', newKeyValue: 'new value' };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body.message).toBe('json, searchKey, newKey, newKeyValue are required fields');
      expect(res.status).toBe(400);
    });

    it('should return 400 when newKeyValue is missing', async () => {
      const data = { json: { old_key: [{ text: 'old value' }] }, searchKey: 'old_key', newKey: 'new_key' };
      const res = await request(app).post('/domain/update-existing-response').send(data);

      expect(res.body.message).toBe('json, searchKey, newKey, newKeyValue are required fields');
      expect(res.status).toBe(400);
    });
  });
});
