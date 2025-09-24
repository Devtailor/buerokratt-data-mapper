import express from 'express';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { App } from 'supertest/types.js';
import { describe, expect, it } from 'vitest';

import utilsRouter from './utils.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use('/utils', utilsRouter);

// Helper function to avoid repetitive type assertions
const makeRequest = (): TestAgent => request(app as App);

describe('POST /utils/compare-intents', () => {
  it('should return 400 when oldIntents is missing', async () => {
    const response = await makeRequest()
      .post('/utils/compare-intents')
      .send({ newIntents: ['intent1', 'intent2'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Both oldIntents and newIntents are required');
  });

  it('should return 400 when newIntents is missing', async () => {
    const response = await makeRequest()
      .post('/utils/compare-intents')
      .send({ oldIntents: ['intent1', 'intent2'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Both oldIntents and newIntents are required');
  });

  it('should return 400 when oldIntents is not an array', async () => {
    const response = await makeRequest()
      .post('/utils/compare-intents')
      .send({ oldIntents: 'not an array', newIntents: ['intent1', 'intent2'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Both oldIntents and newIntents must be arrays');
  });

  it('should return 400 when newIntents is not an array', async () => {
    const response = await makeRequest()
      .post('/utils/compare-intents')
      .send({ oldIntents: ['intent1', 'intent2'], newIntents: 'not an array' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Both oldIntents and newIntents must be arrays');
  });

  it('should compare intents and return unique intents', async () => {
    const response = await makeRequest()
      .post('/utils/compare-intents')
      .send({
        oldIntents: ['intent1', 'intent2', 'intent3'],
        newIntents: ['intent2', 'intent3', 'intent4', 'intent5'],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      newModelUniqueIntents: ['intent4', 'intent5'],
      oldModelUniqueIntents: ['intent1'],
    });
  });
});

describe('POST /utils/compare-model-intent-reports', () => {
  it('should return 400 when oldModelReport is missing', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        newModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should return 400 when newModelReport is missing', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should return 400 when oldModelReport is not an object', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: 'not an object',
        newModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport must be objects',
    });
  });

  it('should return 400 when newModelReport is not an object', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
        newModelReport: 123,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport must be objects',
    });
  });

  it('should return 400 when both reports are missing', async () => {
    const response = await makeRequest().post('/utils/compare-model-intent-reports').send({}).expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should return 400 when oldModelReport is null', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: null,
        newModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should return 400 when newModelReport is null', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
        newModelReport: null,
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should return 400 when oldModelReport is an array', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: [{ intent: 'test' }],
        newModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport must be objects',
    });
  });

  it('should return 400 when newModelReport is an array', async () => {
    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport: {
          common_intent: { precision: 0.8, recall: 0.7, f1_score: 0.75, support: 10 },
        },
        newModelReport: [{ intent: 'test' }],
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport must be objects',
    });
  });

  it('should handle empty request body', async () => {
    const response = await makeRequest().post('/utils/compare-model-intent-reports').send().expect(400);

    expect(response.body).toEqual({
      error: 'Both oldModelReport and newModelReport are required',
    });
  });

  it('should handle complex real-world scenario', async () => {
    const oldModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
      },
      common_tänamine: {
        precision: 0.4117647058823529,
        recall: 0.7,
        f1_score: 0.5185185185185185,
        support: 10,
      },
      serviceDemo: {
        precision: 1,
        recall: 0.6666666666666666,
        f1_score: 0.8,
        support: 18,
      },
      accuracy: 0.8161290322580645,
      'macro avg': {
        precision: 0.8079814484699976,
        recall: 0.6980693058288127,
        f1_score: 0.6860074771098126,
        support: 930,
      },
      'weighted avg': {
        precision: 0.8650358074639694,
        recall: 0.8161290322580645,
        f1_score: 0.8004022610647045,
        support: 930,
      },
      'micro avg': {
        precision: 0.8161290322580645,
        recall: 0.8161290322580645,
        f1_score: 0.8161290322580645,
        support: 930,
      },
    };

    const newModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.85,
        recall: 0.9,
        f1_score: 0.875,
        support: 50,
      },
      common_tänamine: {
        precision: 0.5,
        recall: 0.8,
        f1_score: 0.615,
        support: 12,
      },
      common_teenus_ilm: {
        precision: 0.8412698412698413,
        recall: 0.9814814814814815,
        f1_score: 0.905982905982906,
        support: 54,
      },
      common_klienditeenindajale_suunamine: {
        precision: 0.8928571428571429,
        recall: 0.8620689655172413,
        f1_score: 0.8771929824561403,
        support: 29,
      },
      accuracy: 0.85,
      'macro avg': {
        precision: 0.8,
        recall: 0.75,
        f1_score: 0.77,
        support: 1000,
      },
      'weighted avg': {
        precision: 0.87,
        recall: 0.85,
        f1_score: 0.86,
        support: 1000,
      },
      'micro avg': {
        precision: 0.85,
        recall: 0.85,
        f1_score: 0.85,
        support: 1000,
      },
    };

    const response = await makeRequest()
      .post('/utils/compare-model-intent-reports')
      .send({
        oldModelReport,
        newModelReport,
      })
      .expect(200);

    expect(response.body).toEqual({
      newModelUniqueIntents: ['common_teenus_ilm', 'common_klienditeenindajale_suunamine'],
      oldModelUniqueIntents: ['serviceDemo'],
    });
  });
});

describe('POST /get-intents-from-rule-steps', () => {
  it('should return 400 when steps parameter is missing', async () => {
    const response = await makeRequest().post('/utils/get-intents-from-rule-steps').send({}).expect(400);

    expect(response.body).toEqual({
      error: 'steps parameter is required',
    });
  });

  it('should return 400 when steps parameter is null', async () => {
    const response = await makeRequest().post('/utils/get-intents-from-rule-steps').send({ steps: null }).expect(400);

    expect(response.body).toEqual({
      error: 'steps parameter is required',
    });
  });

  it('should return 400 when steps is not an array or object', async () => {
    const response = await makeRequest()
      .post('/utils/get-intents-from-rule-steps')
      .send({ steps: 'invalid' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'steps must be either an array or an object',
    });
  });

  it('should handle complex nested objects in steps', async () => {
    const steps = [
      {
        intent: 'common_ask_csa',
        entities: [{ name: 'entity1', value: 'value1' }],
        metadata: { source: 'user' },
      },
      {
        intent: 'common_greeting',
        entities: [],
        metadata: { source: 'system' },
      },
    ];

    const response = await makeRequest().post('/utils/get-intents-from-rule-steps').send({ steps }).expect(200);

    expect(response.body).toEqual(['common_ask_csa', 'common_greeting']);
  });
});
