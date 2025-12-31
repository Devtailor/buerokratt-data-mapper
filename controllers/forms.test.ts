import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import formsRouter from './forms';

describe('forms controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/forms', formsRouter);
  });

  describe('POST /forms/detailed-information', () => {
    it('should return form details with all fields', async () => {
      const data = {
        name: 'form',
        slots: { ignored_intents: ['intent1', 'intent2'], required_slots: ['slot1', 'slot2'] },
        responses: [
          { name: 'utter_form', response: [{ text: 'form response text' }] },
          { name: 'utter_ask_slot1', response: [{ text: 'slot1 question' }] },
          { name: 'utter_ask_slot2', response: [{ text: 'slot2 question' }] },
        ],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({
        formResponse: 'form response text',
        requiredSlots: [
          { slot_name: 'slot1', question: 'slot1 question' },
          { slot_name: 'slot2', question: 'slot2 question' },
        ],
        ignoredIntents: ['intent1', 'intent2'],
      });
      expect(res.status).toBe(200);
    });

    it('should return empty formResponse when form response is not found', async () => {
      const data = {
        name: 'form',
        slots: { ignored_intents: ['intent1', 'intent2'], required_slots: ['slot1', 'slot2'] },
        responses: [
          { name: 'utter_ask_slot1', response: [{ text: 'slot1 question' }] },
          { name: 'utter_ask_slot2', response: [{ text: 'slot2 question' }] },
        ],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({
        formResponse: '',
        requiredSlots: [
          { slot_name: 'slot1', question: 'slot1 question' },
          { slot_name: 'slot2', question: 'slot2 question' },
        ],
        ignoredIntents: ['intent1', 'intent2'],
      });
      expect(res.status).toBe(200);
    });

    it('should return empty ignoredIntents when ignored_intents is missing', async () => {
      const data = {
        name: 'form',
        slots: { required_slots: ['slot1', 'slot2'] },
        responses: [
          { name: 'utter_form', response: [{ text: 'form response text' }] },
          { name: 'utter_ask_slot1', response: [{ text: 'slot1 question' }] },
          { name: 'utter_ask_slot2', response: [{ text: 'slot2 question' }] },
        ],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({
        formResponse: 'form response text',
        requiredSlots: [
          { slot_name: 'slot1', question: 'slot1 question' },
          { slot_name: 'slot2', question: 'slot2 question' },
        ],
        ignoredIntents: [],
      });
      expect(res.status).toBe(200);
    });

    it('should return empty requiredSlots when required_slots is missing', async () => {
      const data = {
        name: 'form',
        slots: { ignored_intents: ['intent1', 'intent2'] },
        responses: [{ name: 'utter_form', response: [{ text: 'form response text' }] }],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({
        formResponse: 'form response text',
        requiredSlots: [],
        ignoredIntents: ['intent1', 'intent2'],
      });
      expect(res.status).toBe(200);
    });

    it("should filter out slots that don't have matching responses", async () => {
      const data = {
        name: 'form',
        slots: { required_slots: ['slot1', 'slot2'] },
        responses: [
          { name: 'utter_form', response: [{ text: 'form response text' }] },
          { name: 'utter_ask_slot1', response: [{ text: 'slot1 question' }] },
        ],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({
        formResponse: 'form response text',
        requiredSlots: [{ slot_name: 'slot1', question: 'slot1 question' }],
        ignoredIntents: [],
      });
      expect(res.status).toBe(200);
    });

    it('should handle empty responses array', async () => {
      const data = {
        name: 'form',
        slots: { ignored_intents: ['intent1', 'intent2'], required_slots: ['slot1', 'slot2'] },
        responses: [],
      };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body).toEqual({ formResponse: '', requiredSlots: [], ignoredIntents: ['intent1', 'intent2'] });
      expect(res.status).toBe(200);
    });

    it('should return 400 when name is missing', async () => {
      const data = { slots: { required_slots: ['slot1', 'slot2'] }, responses: [] };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when name is not a string', async () => {
      const data = { name: 123, slots: { required_slots: ['slot1', 'slot2'] }, responses: [] };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when slots is missing', async () => {
      const data = { name: 'form', responses: [] };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when slots is not an object', async () => {
      const data = { name: 'form', slots: 'object', responses: [] };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when responses is missing', async () => {
      const data = { name: 'form', slots: { required_slots: ['slot1', 'slot2'] } };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when responses is not an array', async () => {
      const data = { name: 'form', slots: { required_slots: ['slot1', 'slot2'] }, responses: 'array' };
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when body is empty', async () => {
      const data = {};
      const res = await request(app).post('/forms/detailed-information').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });
});
