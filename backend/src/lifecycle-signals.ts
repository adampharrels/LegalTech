/**
 * Compares newswire coverage against cases already being tracked, and
 * proposes lifecycle status updates when coverage reports a stage
 * (Settled, Dismissed, Closed, or a failed settlement) that would change
 * the case's current status. Pure planning logic only - callers are
 * responsible for fetching the newswire page, looking up tracked matters,
 * and writing the resulting updates as (unverified) Events.
 */

import { detectLifecycleStage, type NewswireItem } from './case-ingestor';
import { coarseStatusForStage } from './lifecycle-stages';

export const LIFECYCLE_EVENT_TYPE = 'Reported lifecycle change';

export interface TrackedMatter {
  caseId: string;
  sourceId: string;
  matterUrl: string;
  currentLifecycleStatus: string;
}

export interface LifecycleSignalUpdate {
  caseId: string;
  sourceId: string;
  matterUrl: string;
  detectedStatus: string;
  eventDate: Date;
  title: string;
  description: string;
}

/**
 * A detector event a person has already confirmed or dismissed. The same
 * coverage (same case, date, and suggested stage) is never proposed again,
 * otherwise a dismissed suggestion would come back on every run.
 */
export interface ReviewedSignal {
  caseId: string;
  eventDate: Date;
  suggestedLifecycleStatus: string | null;
}

export function planLifecycleSignalUpdates(
  latestItemsByMatter: Map<string, NewswireItem>,
  trackedMatters: TrackedMatter[],
  reviewedSignals: ReviewedSignal[] = []
): LifecycleSignalUpdate[] {
  const trackedByUrl = new Map(trackedMatters.map((matter) => [matter.matterUrl, matter]));
  const reviewedKeys = new Set(reviewedSignals.map((signal) => reviewedSignalKey(signal.caseId, signal.eventDate, signal.suggestedLifecycleStatus)));
  const updates: LifecycleSignalUpdate[] = [];

  for (const [matterUrl, item] of latestItemsByMatter) {
    const tracked = trackedByUrl.get(matterUrl);
    if (!tracked) {
      continue;
    }

    const detectedStatus = detectLifecycleStage(`${item.headline} ${item.excerpt}`);
    // Compared at the coarse level the case actually stores: a failed
    // settlement on a case that is already Active changes nothing.
    if (!detectedStatus || coarseStatusForStage(detectedStatus) === tracked.currentLifecycleStatus) {
      continue;
    }

    if (reviewedKeys.has(reviewedSignalKey(tracked.caseId, item.publishedDate, detectedStatus))) {
      continue;
    }

    updates.push({
      caseId: tracked.caseId,
      sourceId: tracked.sourceId,
      matterUrl,
      detectedStatus,
      eventDate: item.publishedDate,
      title: `Newswire reports possible move to ${detectedStatus}`,
      description: [item.headline, item.excerpt, item.articleUrl ? `Reported by: ${item.articleUrl}` : null]
        .filter(Boolean)
        .join('\n\n'),
    });
  }

  return updates;
}

function reviewedSignalKey(caseId: string, eventDate: Date, status: string | null) {
  return `${caseId}|${eventDate.getTime()}|${status}`;
}
