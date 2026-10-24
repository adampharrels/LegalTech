import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLifecycleStageTree,
  coarseStatusForStage,
  coarseStatusForStages,
  isEarlierStageDay,
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
  assert.equal(coarseStatusForStage('Appeal'), 'Active');
  assert.equal(coarseStatusForStage('Settlement failed'), 'Active');
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
  // Same stage date, so the newest-entered branch comes first.
  assert.equal(tree[0]?.children[0]?.id, 'settlement-talks');
  assert.equal(tree[0]?.children[1]?.id, 'judgment');
});

test('buildLifecycleStageTree treats a dangling parentId as a root, rather than dropping the stage', () => {
  const stages = [makeStage({ id: 'orphan', parentId: 'does-not-exist' })];

  const tree = buildLifecycleStageTree(stages);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.id, 'orphan');
});

test('latestLifecycleStage falls back to entry order for stages on the same date', () => {
  const stages = [
    makeStage({ id: 'trial', status: 'Trial', createdAt: new Date('2026-02-14') }),
    makeStage({ id: 'judgment', parentId: 'trial', status: 'Judgment', createdAt: new Date('2026-05-18') }),
    makeStage({ id: 'settlement-talks', parentId: 'trial', status: 'Settled', createdAt: new Date('2026-05-19') }),
  ];

  assert.equal(latestLifecycleStage(stages)?.id, 'settlement-talks');
  assert.equal(latestLifecycleStage([]), null);
});

test('buildLifecycleStageTree orders by stage date, so a back-filled older stage is not shown as newest', () => {
  const stages = [
    makeStage({ id: 'settled', status: 'Settled', stageDate: new Date('2026-01-10'), createdAt: new Date('2026-01-10') }),
    makeStage({ id: 'filed', status: 'Filed', stageDate: new Date('2023-04-02'), createdAt: new Date('2026-02-01') }),
  ];

  const tree = buildLifecycleStageTree(stages);

  assert.equal(tree[0]?.id, 'settled');
  assert.equal(tree[1]?.id, 'filed');
});

test('latestLifecycleStage picks the latest stage date, not the latest entry', () => {
  const stages = [
    makeStage({ id: 'settled', status: 'Settled', stageDate: new Date('2026-01-10'), createdAt: new Date('2026-01-10') }),
    makeStage({ id: 'filed', status: 'Filed', stageDate: new Date('2023-04-02'), createdAt: new Date('2026-02-01') }),
  ];

  assert.equal(latestLifecycleStage(stages)?.id, 'settled');
});

test('latestLifecycleStage with onOrBefore only considers stages that do not post-date it', () => {
  const stages = [
    makeStage({ id: 'filed', status: 'Filed', stageDate: new Date('2024-01-01') }),
    makeStage({ id: 'trial', parentId: 'filed', status: 'Trial', stageDate: new Date('2025-06-01') }),
  ];

  assert.equal(latestLifecycleStage(stages, new Date('2025-01-01'))?.id, 'filed');
  assert.equal(latestLifecycleStage(stages, new Date('2025-06-01'))?.id, 'trial');
  assert.equal(latestLifecycleStage(stages, new Date('2023-01-01')), null);
});

test('coarseStatusForStages mirrors the latest-dated stage, and is null with no stages', () => {
  const stages = [
    makeStage({ id: 'settled', status: 'Settled', stageDate: new Date('2026-01-10'), createdAt: new Date('2026-01-10') }),
    makeStage({ id: 'filed', status: 'Filed', stageDate: new Date('2023-04-02'), createdAt: new Date('2026-02-01') }),
  ];

  assert.equal(coarseStatusForStages(stages), 'Settled');
  assert.equal(coarseStatusForStages([...stages, makeStage({ id: 'failed', status: 'Settlement failed', stageDate: new Date('2026-03-01') })]), 'Active');
  assert.equal(coarseStatusForStages([]), null);
});

test('stage dates compare by day, so a same-day manual stage follows a timestamped newswire stage', () => {
  const newswire = makeStage({ id: 'newswire', status: 'Settled', stageDate: new Date('2026-10-24T03:00:00.000Z'), createdAt: new Date('2026-10-24T03:00:00.000Z') });
  const manual = makeStage({ id: 'manual', parentId: 'newswire', status: 'Closed', stageDate: new Date('2026-10-24T00:00:00.000Z'), createdAt: new Date('2026-10-24T09:00:00.000Z') });

  assert.equal(isEarlierStageDay(manual.stageDate, newswire.stageDate), false);
  assert.equal(isEarlierStageDay(new Date('2026-10-23T00:00:00.000Z'), newswire.stageDate), true);
  // Same day, so the later-entered manual stage is the latest one.
  assert.equal(latestLifecycleStage([newswire, manual])?.id, 'manual');
  assert.equal(coarseStatusForStages([newswire, manual]), 'Closed');
  assert.equal(latestLifecycleStage([newswire], new Date('2026-10-24T00:00:00.000Z'))?.id, 'newswire');
});
