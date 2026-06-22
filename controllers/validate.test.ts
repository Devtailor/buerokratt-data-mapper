import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import validateRouter from './validate';

describe('validate controller', () => {
  let app: Express;
  let appWithCategory: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/validate', validateRouter);

    appWithCategory = express();
    appWithCategory.use(express.json());
    appWithCategory.use((req, _res, next) => {
      (req as any).category = 'rules';
      next();
    });
    appWithCategory.use('/validate', validateRouter);
  });

  describe('POST /validate/array-elements-length', () => {
    it('should return true when all elements are within length limit', async () => {
      const data = { array: ['ab', 'c', 'de'], length: 2 };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });

    it('should return false when any element exceeds length limit', async () => {
      const data = { array: ['ab', 'cde', 'ef'], length: 2 };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body).toEqual(false);
      expect(res.status).toBe(200);
    });

    it('should return true for empty array', async () => {
      const data = { array: [], length: 5 };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });

    it('should return 400 when array is missing', async () => {
      const data = { length: 5 };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when array is not an array', async () => {
      const data = { array: 'array', length: 5 };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when length is missing', async () => {
      const data = { array: ['a', 'b'] };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when length is not numeric', async () => {
      const data = { array: ['a', 'b'], length: 'number' };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should handle numeric length as string', async () => {
      const data = { array: ['ab', 'cd'], length: '2' };
      const res = await request(app).post('/validate/array-elements-length').send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /validate/validate-stories-rules', () => {
    it('should return true when story steps have no consecutive duplicate intents', async () => {
      const data = { story: { steps: [{ intent: 'greet' }, { intent: 'goodbye' }, { intent: 'greet' }] } };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true when rule steps have no consecutive duplicate intents', async () => {
      const data = { rule: { steps: [{ intent: 'greet' }, { intent: 'goodbye' }, { intent: 'greet' }] } };
      const res = await request(appWithCategory).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true when story steps have no consecutive duplicate entities', async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'email' }] },
            { entities: [{ entity: 'name' }] },
          ],
        },
      };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true when rule steps have no consecutive duplicate entities', async () => {
      const data = {
        rule: {
          steps: [
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'email' }] },
            { entities: [{ entity: 'name' }] },
          ],
        },
      };
      const res = await request(appWithCategory).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return false when story steps have consecutive duplicate intents', async () => {
      const data = { story: { steps: [{ intent: 'greet' }, { intent: 'greet' }, { intent: 'goodbye' }] } };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when rule steps have consecutive duplicate intents', async () => {
      const data = { rule: { steps: [{ intent: 'greet' }, { intent: 'greet' }, { intent: 'goodbye' }] } };
      const res = await request(appWithCategory).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when story steps have consecutive duplicate entities', async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'email' }] },
          ],
        },
      };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when rule steps have consecutive duplicate entities', async () => {
      const data = {
        rule: {
          steps: [
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'name' }] },
            { entities: [{ entity: 'email' }] },
          ],
        },
      };
      const res = await request(appWithCategory).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return false when steps have consecutive duplicate entities with multiple entities', async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: 'name' }, { entity: 'email' }] },
            { entities: [{ entity: 'name' }, { entity: 'phone' }] },
          ],
        },
      };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it('should return true when steps have mixed intents and entities', async () => {
      const data = {
        story: {
          steps: [
            { intent: 'greet', entities: [{ entity: 'name' }] },
            { intent: 'goodbye', entities: [{ entity: 'email' }] },
          ],
        },
      };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true when steps have no intents or entities', async () => {
      const data = { story: { steps: [{}, {}, {}] } };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true for single step', async () => {
      const data = { story: { steps: [{ intent: 'greet' }] } };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return true for empty steps array', async () => {
      const data = { story: { steps: [] } };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should return 400 when steps are missing', async () => {
      const data = { story: {} };
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.error).toBe('Invalid request body');
      expect(res.status).toBe(400);
    });

    it('should return 400 when body is empty', async () => {
      const data = {};
      const res = await request(app).post('/validate/validate-stories-rules').send(data);

      expect(res.body.error).toBe('Invalid request body');
      expect(res.status).toBe(400);
    });

    it('should return false when non-array is passed as steps', async () => {
      const data = { rule: { steps: 'array' } };
      const res = await request(appWithCategory).post('/validate/validate-stories-rules').send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });
  });
});
