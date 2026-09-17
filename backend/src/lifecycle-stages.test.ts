import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLifecycleStageTree,
  coarseStatusForStage,
  isLifecycleStageType,
  latestLifecycleStage,
  type LifecycleStageRecord,
} from './lifecycle-stages';

function makeStage(overrides: Partial<LifecycleStageRecord> = {}): LifecycleStageRecord {
  return {
    id: 'stage-1',
    parentId: null,
    status: 'Filed',
    stageDate: new Date('2025-03-12T00:00:00.000Z'),
    notes: null,
    source: 'Manual',
    createdAt: new Date('2025-03-12T00:00:00.000Z'),
    ...overrides,
  };
}

test('isLifecycleStageType accepts only the defined stage vocabulary', () => {
  assert.equal(isLifecycleStageType('Filed'), true);
  assert.equal(isLifecycleStageType('Settled'), true);
  assert.equal(isLifecycleStageType('Active'), false);
  assert.equal(isLifecycleStageType('nonsense'), false);
});

test('coarseStatusForStage maps the fine-grained stage onto the existing five-value status field', () => {
  assert.equal(coarseStatusForStage('Filed'), 'Active');
  assert.equal(coarseStatusForStage('Certified'), 'Active');
  assert.equal(coarseStatusForStage('Trial'), 'Active');
  assert.equal(coarseStatusForStage('Judgment'), 'Active');
  assert.equal(coarseStatusForStage('Settled'), 'Settled');
  assert.equal(coarseStatusForStage('Dismissed'), 'Dismissed');
  assert.equal(coarseStatusForStage('Closed'), 'Closed');
});

test('buildLifecycleStageTree assembles a single linear chain', () => {
  const stages = [
    makeStage({ id: 'filed', status: 'Filed', createdAt: new Date('2025-03-12') }),
    makeStage({ id: 'certified', parentId: 'filed', status: 'Certified', createdAt: new Date('2025-06-02') }),
    makeStage({ id: 'trial', parentId: 'certified', status: 'Trial', createdAt: new Date('2026-02-14') }),
  ];

  const tree = buildLifecycleStageTree(stages);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.id, 'filed');
  assert.equal(tree[0]?.children[0]?.id, 'certified');
  assert.equal(tree[0]?.children[0]?.children[0]?.id, 'trial');
});

test('buildLifecycleStageTree branches when two stages share a parent', () => {
  const stages = [
    makeStage({ id: 'trial', status: 'Trial', createdAt: new Date('2026-02-14') }),
    makeStage({ id: 'judgment', parentId: 'trial', status: 'Judgment', createdAt: new Date('2026-05-18') }),
    makeStage({ id: 'settlement-talks', parentId: 'trial', status: 'Settled', notes: 'Parallel settlement talks', createdAt: new Date('2026-05-19') }),
  ];

  const tree = buildLifecycleStageTree(stages);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.children.length, 2);
  // Newest-created branch first.
  assert.equal(tree[0]?.children[0]?.id, 'settlement-talks');
  assert.equal(tree[0]?.children[1]?.id, 'judgment');
});

test('buildLifecycleStageTree treats a dangling parentId as a root, rather than dropping the stage', () => {
  const stages = [makeStage({ id: 'orphan', parentId: 'does-not-exist' })];

  const tree = buildLifecycleStageTree(stages);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.id, 'orphan');
});

test('latestLifecycleStage returns the most recently created stage across all branches', () => {
  const stages = [
    makeStage({ id: 'trial', status: 'Trial', createdAt: new Date('2026-02-14') }),
    makeStage({ id: 'judgment', parentId: 'trial', status: 'Judgment', createdAt: new Date('2026-05-18') }),
    makeStage({ id: 'settlement-talks', parentId: 'trial', status: 'Settled', createdAt: new Date('2026-05-19') }),
  ];

  assert.equal(latestLifecycleStage(stages)?.id, 'settlement-talks');
  assert.equal(latestLifecycleStage([]), null);
});
