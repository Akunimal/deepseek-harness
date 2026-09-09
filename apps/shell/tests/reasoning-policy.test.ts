import { describe, expect, it } from 'vitest';
import { compatForModel, reasoningEffortsForModel } from '../src/main/reasoning-policy.js';

describe('reasoning policy', () => {
  it('advertises MiMo V2.5 as an on/off thinking model', () => {
    expect(reasoningEffortsForModel('mimo-v2.5')).toEqual({ off: null, high: 'high' });
    expect(reasoningEffortsForModel('mimo-v2.5-pro')).toEqual({ off: null, high: 'high' });
    expect(compatForModel('mimo-v2.5')).toEqual({
      thinkingFormat: 'deepseek',
      supportsReasoningEffort: false,
    });
  });

  it('does not attach MiMo-only wire overrides to unrelated models', () => {
    expect(compatForModel('deepseek-v3.2-free')).toBeUndefined();
    expect(reasoningEffortsForModel('deepseek-v3.2-free')).toEqual({
      off: null,
      low: 'low',
      high: 'high',
      max: 'max',
    });
  });
});
