import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseAiRole } from './llm-processor';

test('normaliseAiRole keeps recognised role labels stable', () => {
  assert.equal(normaliseAiRole('GENERATIVE_AI', true), 'GENERATIVE_AI');
  assert.equal(normaliseAiRole('facial recognition', true), 'FACIAL_RECOGNITION');
});

test('normaliseAiRole falls back based on relevance when the role is unknown', () => {
  assert.equal(normaliseAiRole('general technology', true), 'OTHER_AI');
  assert.equal(normaliseAiRole('general technology', false), 'NOT_AI');
});

test('normaliseAiRole prevents relevance and role contradictions', () => {
  assert.equal(normaliseAiRole('GENERATIVE_AI', false), 'NOT_AI');
  assert.equal(normaliseAiRole('NOT_AI', true), 'OTHER_AI');
});
