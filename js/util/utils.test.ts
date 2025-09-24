import { describe, expect, it } from 'vitest';

import { compareIntents, extractIntentsFromModelReport, getIntentsFromRuleSteps } from './utils.js';

describe('extractIntentsFromModelReport', () => {
  it('should extract intents from model report excluding summary metrics', () => {
    const modelReport = {
      intent1: { precision: 0.8, recall: 0.9 },
      intent2: { precision: 0.7, recall: 0.8 },
      accuracy: 0.85,
      'macro avg': { precision: 0.75, recall: 0.85 },
      'weighted avg': { precision: 0.76, recall: 0.86 },
      'micro avg': { precision: 0.77, recall: 0.87 },
    };

    const result = extractIntentsFromModelReport(modelReport);

    expect(result).toEqual(['intent1', 'intent2']);
  });

  it('should return empty array for model report with only summary metrics', () => {
    const modelReport = {
      accuracy: 0.85,
      'macro avg': { precision: 0.75, recall: 0.85 },
      'weighted avg': { precision: 0.76, recall: 0.86 },
      'micro avg': { precision: 0.77, recall: 0.87 },
    };

    const result = extractIntentsFromModelReport(modelReport);

    expect(result).toEqual([]);
  });
});

describe('compareModelIntents', () => {
  it('should identify unique intents in new model', () => {
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
      accuracy: 0.8161290322580645,
      'macro avg': {
        precision: 0.8079814484699976,
        recall: 0.6980693058288127,
        f1_score: 0.6860074771098126,
        support: 930,
      },
    };

    const newModelReport = {
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
      common_new_intent: {
        precision: 0.9,
        recall: 0.8,
        f1_score: 0.85,
        support: 20,
      },
      another_new_intent: {
        precision: 0.95,
        recall: 0.9,
        f1_score: 0.925,
        support: 15,
      },
      accuracy: 0.85,
      'macro avg': {
        precision: 0.8,
        recall: 0.75,
        f1_score: 0.77,
        support: 1000,
      },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual(['common_new_intent', 'another_new_intent']);
    expect(result.oldModelUniqueIntents).toEqual([]);
  });

  it('should identify unique intents in old model', () => {
    const oldModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
      },
      common_old_intent: {
        precision: 0.8,
        recall: 0.7,
        f1_score: 0.75,
        support: 25,
      },
      another_old_intent: {
        precision: 0.9,
        recall: 0.85,
        f1_score: 0.875,
        support: 30,
      },
      accuracy: 0.8161290322580645,
      'macro avg': {
        precision: 0.8079814484699976,
        recall: 0.6980693058288127,
        f1_score: 0.6860074771098126,
        support: 930,
      },
    };

    const newModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
      },
      accuracy: 0.85,
      'macro avg': {
        precision: 0.8,
        recall: 0.75,
        f1_score: 0.77,
        support: 1000,
      },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual([]);
    expect(result.oldModelUniqueIntents).toEqual(['common_old_intent', 'another_old_intent']);
  });

  it('should identify unique intents in both models', () => {
    const oldModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
      },
      common_old_intent: {
        precision: 0.8,
        recall: 0.7,
        f1_score: 0.75,
        support: 25,
      },
      accuracy: 0.8161290322580645,
      'macro avg': {
        precision: 0.8079814484699976,
        recall: 0.6980693058288127,
        f1_score: 0.6860074771098126,
        support: 930,
      },
    };

    const newModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
      },
      common_new_intent: {
        precision: 0.9,
        recall: 0.8,
        f1_score: 0.85,
        support: 20,
      },
      accuracy: 0.85,
      'macro avg': {
        precision: 0.8,
        recall: 0.75,
        f1_score: 0.77,
        support: 1000,
      },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual(['common_new_intent']);
    expect(result.oldModelUniqueIntents).toEqual(['common_old_intent']);
  });

  it('should return empty arrays when models have identical intents', () => {
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
      accuracy: 0.8161290322580645,
      'macro avg': {
        precision: 0.8079814484699976,
        recall: 0.6980693058288127,
        f1_score: 0.6860074771098126,
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
      accuracy: 0.85,
      'macro avg': {
        precision: 0.8,
        recall: 0.75,
        f1_score: 0.77,
        support: 1000,
      },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual([]);
    expect(result.oldModelUniqueIntents).toEqual([]);
  });

  it('should exclude summary metrics from comparison', () => {
    const oldModelReport = {
      common_service_estimated_subsistence_minimum: {
        precision: 0.8392857142857143,
        recall: 0.9591836734693877,
        f1_score: 0.8952380952380952,
        support: 49,
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

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual([]);
    expect(result.oldModelUniqueIntents).toEqual([]);
  });

  it('should handle empty reports', () => {
    const oldModelReport = {
      accuracy: 0.8,
      'macro avg': { precision: 0.7, recall: 0.6, f1_score: 0.65, support: 100 },
    };

    const newModelReport = {
      accuracy: 0.85,
      'macro avg': { precision: 0.8, recall: 0.75, f1_score: 0.77, support: 200 },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual([]);
    expect(result.oldModelUniqueIntents).toEqual([]);
  });

  it('should handle reports with only summary metrics', () => {
    const oldModelReport = {
      accuracy: 0.8,
      'macro avg': { precision: 0.7, recall: 0.6, f1_score: 0.65, support: 100 },
      'weighted avg': { precision: 0.75, recall: 0.7, f1_score: 0.72, support: 100 },
      'micro avg': { precision: 0.8, recall: 0.8, f1_score: 0.8, support: 100 },
    };

    const newModelReport = {
      accuracy: 0.85,
      'macro avg': { precision: 0.8, recall: 0.75, f1_score: 0.77, support: 200 },
      'weighted avg': { precision: 0.82, recall: 0.8, f1_score: 0.81, support: 200 },
      'micro avg': { precision: 0.85, recall: 0.85, f1_score: 0.85, support: 200 },
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual([]);
    expect(result.oldModelUniqueIntents).toEqual([]);
  });

  it('should handle reports with mixed intent names and summary metrics', () => {
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

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual(['common_teenus_ilm', 'common_klienditeenindajale_suunamine']);
    expect(result.oldModelUniqueIntents).toEqual(['serviceDemo']);
  });

  it('should handle case sensitivity correctly', () => {
    const oldModelReport = {
      Common_Service_Intent: {
        precision: 0.8,
        recall: 0.7,
        f1_score: 0.75,
        support: 25,
      },
      accuracy: 0.8,
    };

    const newModelReport = {
      common_service_intent: {
        precision: 0.85,
        recall: 0.8,
        f1_score: 0.825,
        support: 30,
      },
      accuracy: 0.85,
    };

    // Extract intent arrays from model reports
    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);

    expect(result.newModelUniqueIntents).toEqual(['common_service_intent']);
    expect(result.oldModelUniqueIntents).toEqual(['Common_Service_Intent']);
  });
});

describe('getIntentsFromRuleSteps', () => {
  it('should extract intents from array of steps with duplicate intents', () => {
    const steps = [
      { intent: 'common_ask_csa', entities: [] },
      { intent: 'common_ask_csa', entities: [] },
    ];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual(['common_ask_csa']);
  });

  it('should extract intents from array of steps with different intents', () => {
    const steps = [
      { intent: 'common_ask_csa', entities: [] },
      { intent: 'common_greeting', entities: [] },
      { intent: 'common_ask_csa', entities: [] },
    ];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual(['common_ask_csa', 'common_greeting']);
  });

  it('should extract intent from single step object', () => {
    const step = { intent: 'common_ask_csa', entities: [] };

    const result = getIntentsFromRuleSteps(step);

    expect(result).toEqual(['common_ask_csa']);
  });

  it('should handle empty array', () => {
    const steps: any[] = [];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual([]);
  });

  it('should handle array with steps without intent property', () => {
    const steps = [{ entities: [] }, { entities: [] }];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual([]);
  });

  it('should handle array with mixed steps (some with intent, some without)', () => {
    const steps = [
      { intent: 'common_ask_csa', entities: [] },
      { entities: [] },
      { intent: 'common_greeting', entities: [] },
    ];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual(['common_ask_csa', 'common_greeting']);
  });

  it('should handle object without intent property', () => {
    const step = { entities: [] };

    const result = getIntentsFromRuleSteps(step);

    expect(result).toEqual([]);
  });

  it('should handle steps with undefined intent values', () => {
    const steps = [
      { intent: undefined, entities: [] },
      { intent: 'common_ask_csa', entities: [] },
    ];

    const result = getIntentsFromRuleSteps(steps);

    expect(result).toEqual(['common_ask_csa']);
  });
});
