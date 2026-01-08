import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import mergeRouter from './merge';

describe('merge controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/merge', mergeRouter);
  });

  describe('POST /merge/objects', () => {
    it('should merge two objects', async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { c: 3, d: 4 } };
      const res = await request(app).post('/merge/objects').send(data);

      expect(res.body).toEqual({ a: 1, b: 2, c: 3, d: 4 });
      expect(res.status).toBe(200);
    });

    it('should override object1 values with object2 when keys overlap', async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { b: 3, c: 4 } };
      const res = await request(app).post('/merge/objects').send(data);

      expect(res.body).toEqual({ a: 1, b: 3, c: 4 });
      expect(res.status).toBe(200);
    });

    it('should return 400 when object1 is missing', async () => {
      const data = { object2: { c: 3 } };
      const res = await request(app).post('/merge/objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when object2 is missing', async () => {
      const data = { object1: { a: 1 } };
      const res = await request(app).post('/merge/objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when both objects are missing', async () => {
      const data = {};
      const res = await request(app).post('/merge/objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /merge/response_objects', () => {
    it('should merge two objects and process text fields in non-array objects', async () => {
      const data = { object1: { a: { text: 'line1\n\n\n\nline2' } }, object2: { b: 1 } };
      const res = await request(app).post('/merge/response_objects').send(data);

      expect(res.body).toEqual({ a: { text: 'line1\\n\\nline2' }, b: 1 });
      expect(res.status).toBe(200);
    });

    it('should merge two objects and process text fields in arrays', async () => {
      const data = { object1: { a: [{ text: 'line1\n\n\nline2' }] }, object2: { b: 1 } };
      const res = await request(app).post('/merge/response_objects').send(data);

      expect(res.body).toEqual({ a: [{ text: 'line1\\n\\nline2' }], b: 1 });
      expect(res.status).toBe(200);
    });

    it('should return 400 when object1 is missing', async () => {
      const data = { object2: { a: 1 } };
      const res = await request(app).post('/merge/response_objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when object2 is missing', async () => {
      const data = { object1: { a: 1 } };
      const res = await request(app).post('/merge/response_objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when both objects are missing', async () => {
      const data = {};
      const res = await request(app).post('/merge/response_objects').send(data);

      expect(res.text).toBe('Both objects are required');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /merge/remove-key', () => {
    it('should remove specified key from object', async () => {
      const data = { object: { a: 1, b: 2, c: 3 }, key: 'b' };
      const res = await request(app).post('/merge/remove-key').send(data);

      expect(res.body).toEqual({ a: 1, c: 3 });
      expect(res.status).toBe(200);
    });

    it('should not remove key from object if it does not exist', async () => {
      const data = { object: { a: 1, c: 3 }, key: 'b' };
      const res = await request(app).post('/merge/remove-key').send(data);

      expect(res.body).toEqual({ a: 1, c: 3 });
      expect(res.status).toBe(200);
    });

    it('should return 400 when object is missing', async () => {
      const data = { key: 'b' };
      const res = await request(app).post('/merge/remove-key').send(data);

      expect(res.text).toBe('Both object and key are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when key is missing', async () => {
      const data = { object: { a: 1 } };
      const res = await request(app).post('/merge/remove-key').send(data);

      expect(res.text).toBe('Both object and key are required');
      expect(res.status).toBe(400);
    });

    it('should return 400 when both object and key are missing', async () => {
      const data = {};
      const res = await request(app).post('/merge/remove-key').send(data);

      expect(res.text).toBe('Both object and key are required');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /merge/remove-array-value', () => {
    it('should remove specified value from array', async () => {
      const data = { array: ['a', 'b'], value: 'b' };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body).toEqual(['a']);
      expect(res.status).toBe(200);
    });

    it('should return empty array when all values match', async () => {
      const data = { array: ['a', 'a'], value: 'a' };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should not remove value from array if it does not exist', async () => {
      const data = { array: ['a', 'b'], value: 'c' };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body).toEqual(['a', 'b']);
      expect(res.status).toBe(200);
    });

    it('should return 400 when array is missing', async () => {
      const data = { value: 'b' };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when array is not an array', async () => {
      const data = { array: 'array', value: 'b' };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when value is missing', async () => {
      const data = { array: ['a', 'b'] };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when value is not a string', async () => {
      const data = { array: ['a', 'b'], value: 123 };
      const res = await request(app).post('/merge/remove-array-value').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /merge/replace-array-element', () => {
    it('should replace element with string value', async () => {
      const data = { array: ['a', 'b'], element: 'b', newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body).toEqual(['a', 'x']);
      expect(res.status).toBe(200);
    });

    it('should replace element with object value', async () => {
      const data = { array: ['a', 'b'], element: 'b', newValue: { key: 'x' } };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body).toEqual(['a', { key: 'x' }]);
      expect(res.status).toBe(200);
    });

    it('should not replace element if it does not exist', async () => {
      const data = { array: ['a', 'b'], element: 'c', newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.text).toBe('Array element c is missing');
      expect(res.status).toBe(400);
    });

    it('should return 400 when array is missing', async () => {
      const data = { element: 'b', newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when array is not an array', async () => {
      const data = { array: 'array', element: 'b', newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when element is missing', async () => {
      const data = { array: ['a', 'b'], newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when element is not a string', async () => {
      const data = { array: ['a', 'b'], element: 123, newValue: 'x' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when newValue is missing', async () => {
      const data = { array: ['a', 'b'], element: 'b' };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when newValue is not a string or object', async () => {
      const data = { array: ['a', 'b'], element: 'b', newValue: 123 };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when newValue is an array', async () => {
      const data = { array: ['a', 'b'], element: 'b', newValue: ['x', 'y'] };
      const res = await request(app).post('/merge/replace-array-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /merge/multi-objects', () => {
    it('should merge multiple objects', async () => {
      const data = { object1: { a: 1 }, object2: { b: 2 }, object3: { c: 3 } };
      const res = await request(app).post('/merge/multi-objects').send(data);

      expect(res.body).toEqual({ a: 1, b: 2, c: 3 });
      expect(res.status).toBe(200);
    });

    it('should merge multiple objects and override values when keys overlap', async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { b: 3, c: 4 }, object3: { c: 5, d: 6 } };
      const res = await request(app).post('/merge/multi-objects').send(data);

      expect(res.body).toEqual({ a: 1, b: 3, c: 5, d: 6 });
      expect(res.status).toBe(200);
    });

    it('should return 400 when less than two objects are provided', async () => {
      const data = { object: { a: 1 } };
      const res = await request(app).post('/merge/multi-objects').send(data);

      expect(res.text).toBe('At least two object are required');
      expect(res.status).toBe(400);
    });

    it('should return empty object when object(s) are missing', async () => {
      const data = {};
      const res = await request(app).post('/merge/multi-objects').send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });
  });
});
