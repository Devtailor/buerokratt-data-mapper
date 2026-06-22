import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import objectRouter from './object';

describe('object controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/object', objectRouter);
  });

  describe('POST /object/rules/remove-by-intent-name', () => {
    it('should keep rules when they do not contain the search intent name', async () => {
      const data = { rulesJson: [{ rule: 'goodbye', steps: ['intent_goodbye'] }], searchIntentName: 'greet' };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.result).toHaveLength(1);
      expect(res.body.result).toEqual([{ rule: 'goodbye', steps: ['intent_goodbye'] }]);
      expect(res.status).toBe(200);
    });

    it('should remove rules when they contain the search intent name', async () => {
      const data = { rulesJson: [{ rule: 'greet', steps: ['intent_greet'] }], searchIntentName: 'greet' };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.result).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should return 400 when rulesJson is missing', async () => {
      const data = { searchIntentName: 'greet' };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when rulesJson is not an array', async () => {
      const data = { rulesJson: 'array', searchIntentName: 'greet' };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when searchIntentName is missing', async () => {
      const data = { rulesJson: [{ rule: 'test' }] };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when searchIntentName is not a string', async () => {
      const data = { rulesJson: [{ rule: 'test' }], searchIntentName: 123 };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when searchIntentName contains illegal characters', async () => {
      const data = { rulesJson: [{ rule: 'test' }], searchIntentName: 'greet!' };
      const res = await request(app).post('/object/rules/remove-by-intent-name').send(data);

      expect(res.body.error).toBe('Search intent name contains illegal characters');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /object/responses/remove-by-intent-name', () => {
    it('should remove responses matching the intent pattern', async () => {
      const data = {
        responses: {
          utter_greet: 'hello',
          utter_goodbye: 'goodbye',
          utter_help: 'help text',
          other_key: 'other value',
        },
        intent: 'greet',
      };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body).toEqual({ utter_goodbye: 'goodbye', utter_help: 'help text', other_key: 'other value' });
      expect(res.body).not.toHaveProperty('utter_greet');
      expect(res.status).toBe(200);
    });

    it('should return empty object when all responses match the intent pattern', async () => {
      const data = { responses: { utter_greet: 'hello' }, intent: 'greet' };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it('should return 400 when responses is missing', async () => {
      const data = { intent: 'greet' };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when responses is not an object', async () => {
      const data = { responses: 'object', intent: 'greet' };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when intent is missing', async () => {
      const data = { responses: { utter_greet: 'hello' } };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when intent is not a string', async () => {
      const data = { responses: { utter_greet: 'hello' }, intent: 123 };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when intent contains illegal characters', async () => {
      const data = { responses: { utter_greet: 'hello' }, intent: 'greet!' };
      const res = await request(app).post('/object/responses/remove-by-intent-name').send(data);

      expect(res.body.error).toBe('Intent name contains illegal characters');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /object/replace/key-value-in-obj', () => {
    it('should replace key and value in object', async () => {
      const data = {
        object: { oldKey: 'oldValue', someKey: 'someValue' },
        oldKey: 'oldKey',
        newKey: 'newKey',
        newValue: 'newValue',
      };
      const res = await request(app).post('/object/replace/key-value-in-obj').send(data);

      expect(res.body).toEqual({ newKey: 'newValue', someKey: 'someValue' });
      expect(res.status).toBe(200);
    });

    it('should return same object when oldKey does not exist', async () => {
      const data = {
        object: { key1: 'value1', key2: 'value2' },
        oldKey: 'nonexistent',
        newKey: 'newKey',
        newValue: 'newValue',
      };
      const res = await request(app).post('/object/replace/key-value-in-obj').send(data);

      expect(res.body).toEqual({ key1: 'value1', key2: 'value2' });
      expect(res.status).toBe(200);
    });

    it('should return empty object when input object is empty', async () => {
      const data = { object: {}, oldKey: 'oldKey', newKey: 'newKey', newValue: 'newValue' };
      const res = await request(app).post('/object/replace/key-value-in-obj').send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it('should return 500 when object is missing', async () => {
      const data = { oldKey: 'oldKey', newKey: 'newKey', newValue: 'newValue' };
      const res = await request(app).post('/object/replace/key-value-in-obj').send(data);

      expect(res.text).toContain('TypeError: Cannot convert undefined or null to object');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /object/array/replace-next-element', () => {
    it('should replace the element after the found element', async () => {
      const data = { array: ['1', '2', '3', '4'], element: '2', newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.array).toEqual(['1', '2', '999', '4']);
      expect(res.status).toBe(200);
    });

    it('should not replace when element is last in array', async () => {
      const data = { array: ['1', '2', '3'], element: '3', newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.array).toEqual(['1', '2', '3']);
      expect(res.status).toBe(200);
    });

    it('should not replace when element is not found', async () => {
      const data = { array: ['1', '2', '3'], element: '4', newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.array).toEqual(['1', '2', '3']);
      expect(res.status).toBe(200);
    });

    it('should return 400 when array is missing', async () => {
      const data = { element: '1', newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when array is not an array', async () => {
      const data = { array: 'array', element: '1', newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when element is missing', async () => {
      const data = { array: ['1', '2'], newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when element is not a string', async () => {
      const data = { array: ['1', '2'], element: 3, newInput: 999 };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when newInput is missing', async () => {
      const data = { array: ['1', '2'], element: '1' };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when newInput is non-numeric', async () => {
      const data = { array: ['1', '2'], element: '1', newInput: 'non-numeric' };
      const res = await request(app).post('/object/array/replace-next-element').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /object/get-selected-csa-nps', () => {
    it('should separate periodNps by customer support name', async () => {
      const data = {
        data: [
          { id: 1, name: 'John', customerSupportFullName: 'John Doe', periodNps: 8.5 },
          { id: 2, name: 'Jane', customerSupportFullName: 'Jane Smith', periodNps: 9.0 },
          { id: 3, name: 'John', customerSupportFullName: 'John Doe', periodNps: 7.5 },
        ],
      };
      const res = await request(app).post('/object/get-selected-csa-nps').send(data);

      expect(res.body.response).toHaveLength(3);
      expect(res.body.response).toEqual([
        { id: 1, name: 'John', customerSupportFullName: 'John Doe' },
        { id: 2, name: 'Jane', customerSupportFullName: 'Jane Smith' },
        { id: 3, name: 'John', customerSupportFullName: 'John Doe' },
      ]);
      expect(res.body.periodNpsByCsa).toEqual({ 'John Doe': 8.5, 'Jane Smith': 9.0 });
      expect(res.status).toBe(200);
    });

    it('should handle empty data array', async () => {
      const data = { data: [] };
      const res = await request(app).post('/object/get-selected-csa-nps').send(data);

      expect(res.body.response).toEqual([]);
      expect(res.body.periodNpsByCsa).toEqual({});
      expect(res.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = {};
      const res = await request(app).post('/object/get-selected-csa-nps').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array', async () => {
      const data = { data: 'array' };
      const res = await request(app).post('/object/get-selected-csa-nps').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });
});
