import assert from 'node:assert/strict';
import test from 'node:test';
import { describeNewswireItem, planLifecycleSignalUpdates, type TrackedMatter } from './lifecycle-signals';
import type { NewswireItem } from './case-ingestor';

function makeItem(overrides: Partial<NewswireItem> = {}): NewswireItem {
  return {
    headline: 'Clearview class action reaches settlement',
    excerpt: 'The parties have reached an in-principle settlement.',
    matterName: 'Clearview Facial Recognition Class Action',
    matterUrl: 'https://classactions.com.au/matters/clearview-class-action',
    articleUrl: 'https://example-news.test/clearview-settlement',
    publishedDate: new Date('2026-05-20T00:00:00.000Z'),
    ...overrides,
  };
}

function makeTracked(overrides: Partial<TrackedMatter> = {}): TrackedMatter {
  return {
    caseId: 'case-1',
    sourceId: 'source-1',
    matterUrl: 'https://classactions.com.au/matters/clearview-class-action',
    currentLifecycleStatus: 'Active',
    hasPendingSignal: false,
    ...overrides,
  };
}

test('planLifecycleSignalUpdates proposes an update when coverage reports a new terminal stage', () => {
  const latest = new Map([[makeItem().matterUrl!, makeItem()]]);
  const updates = planLifecycleSignalUpdates(latest, [makeTracked()]);

  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.caseId, 'case-1');
  assert.equal(updates[0]?.sourceId, 'source-1');
  assert.equal(updates[0]?.detectedStatus, 'Settled');
  assert.equal(updates[0]?.eventDate.toISOString(), '2026-05-20T00:00:00.000Z');
  assert.match(updates[0]?.title || '', /Settled/);
  assert.match(updates[0]?.description || '', /Reported by: https:\/\/example-news\.test\/clearview-settlement/);
});

test('planLifecycleSignalUpdates skips matters with no newswire coverage', () => {
  const latest = new Map<string, NewswireItem>();
  const updates = planLifecycleSignalUpdates(latest, [makeTracked()]);

  assert.equal(updates.length, 0);
});

test('planLifecycleSignalUpdates skips coverage with no detectable stage change', () => {
  const item = makeItem({ headline: 'Trial date set for next year', excerpt: 'A hearing has been listed.' });
  const latest = new Map([[item.matterUrl!, item]]);
  const updates = planLifecycleSignalUpdates(latest, [makeTracked()]);

  assert.equal(updates.length, 0);
});

test('planLifecycleSignalUpdates skips when the case already reflects the detected status', () => {
  const latest = new Map([[makeItem().matterUrl!, makeItem()]]);
  const updates = planLifecycleSignalUpdates(latest, [makeTracked({ currentLifecycleStatus: 'Settled' })]);

  assert.equal(updates.length, 0);
});

test('planLifecycleSignalUpdates ignores newswire items for matters that are not tracked', () => {
  const untrackedItem = makeItem({
    matterUrl: 'https://classactions.com.au/matters/some-other-matter',
  });
  const latest = new Map([[untrackedItem.matterUrl!, untrackedItem]]);
  const updates = planLifecycleSignalUpdates(latest, [makeTracked()]);

  assert.equal(updates.length, 0);
});

test('planLifecycleSignalUpdates proposes a failed settlement only when it changes the stored status', () => {
  const item = makeItem({ headline: 'Clearview settlement collapses', excerpt: 'The settlement fell through.' });
  const latest = new Map([[item.matterUrl!, item]]);

  const fromSettled = planLifecycleSignalUpdates(latest, [makeTracked({ currentLifecycleStatus: 'Settled' })]);
  assert.equal(fromSettled.length, 1);
  assert.equal(fromSettled[0]?.detectedStatus, 'Settlement failed');

  assert.equal(planLifecycleSignalUpdates(latest, [makeTracked({ currentLifecycleStatus: 'Active' })]).length, 0);
});

test('planLifecycleSignalUpdates does not re-propose coverage a person already reviewed, whatever its date', () => {
  const reviewed = [{ caseId: 'case-1', description: describeNewswireItem(makeItem()), suggestedLifecycleStatus: 'Settled' }];

  // Same article, but a card with no machine-readable date gets a new
  // fallback date on every run - it must still count as already reviewed.
  const sameCoverage = new Map([[makeItem().matterUrl!, makeItem({ publishedDate: new Date('2026-07-01T00:00:00.000Z') })]]);
  assert.equal(planLifecycleSignalUpdates(sameCoverage, [makeTracked()], reviewed).length, 0);

  const newerCoverage = new Map([[makeItem().matterUrl!, makeItem({ excerpt: 'The court has approved the settlement.' })]]);
  assert.equal(planLifecycleSignalUpdates(newerCoverage, [makeTracked()], reviewed).length, 1);
});

test('planLifecycleSignalUpdates still replaces a pending suggestion when newer coverage matches the stored status', () => {
  // A pending "Settled" is awaiting review on an Active case, then the
  // settlement collapses: Settlement failed maps to Active, but the stale
  // pending suggestion must still be updated rather than left to be confirmed.
  const item = makeItem({ headline: 'Clearview settlement collapses', excerpt: 'The settlement fell through.' });
  const latest = new Map([[item.matterUrl!, item]]);

  const updates = planLifecycleSignalUpdates(latest, [makeTracked({ hasPendingSignal: true })]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.detectedStatus, 'Settlement failed');
});
