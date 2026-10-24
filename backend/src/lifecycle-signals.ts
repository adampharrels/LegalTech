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
  // Whether the case already has an unverified detector event awaiting review.
  hasPendingSignal: boolean;
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
 * article is never proposed again for that case, otherwise a dismissed
 * suggestion would come back on every run. See coverageIdentity for how an
 * article is recognised.
 */
export interface ReviewedSignal {
  caseId: string;
  description: string | null;
}

const REPORTED_BY_PREFIX = 'Reported by: ';

export function describeNewswireItem(item: NewswireItem) {
  return [item.headline, item.excerpt, item.articleUrl ? `${REPORTED_BY_PREFIX}${item.articleUrl}` : null]
    .filter(Boolean)
    .join('\n\n');
}

export function planLifecycleSignalUpdates(
  latestItemsByMatter: Map<string, NewswireItem>,
  trackedMatters: TrackedMatter[],
  reviewedSignals: ReviewedSignal[] = []
): LifecycleSignalUpdate[] {
  const trackedByUrl = new Map(trackedMatters.map((matter) => [matter.matterUrl, matter]));
  const reviewedKeys = new Set(reviewedSignals.map((signal) => signalKey(signal.caseId, signal.description)));
  const updates: LifecycleSignalUpdate[] = [];

  for (const [matterUrl, item] of latestItemsByMatter) {
    const tracked = trackedByUrl.get(matterUrl);
    if (!tracked) {
      continue;
    }

    const detectedStatus = detectLifecycleStage(`${item.headline} ${item.excerpt}`);
    if (!detectedStatus) {
      continue;
    }

    // Compared at the coarse level the case actually stores: a failed
    // settlement on a case that is already Active changes nothing - unless
    // a pending suggestion is waiting for review, in which case newer
    // coverage still has to replace it (e.g. a pending "Settled" whose
    // settlement has since collapsed).
    if (coarseStatusForStage(detectedStatus) === tracked.currentLifecycleStatus && !tracked.hasPendingSignal) {
      continue;
    }

    const description = describeNewswireItem(item);
    if (reviewedKeys.has(signalKey(tracked.caseId, description))) {
      continue;
    }

    updates.push({
      caseId: tracked.caseId,
      sourceId: tracked.sourceId,
      matterUrl,
      detectedStatus,
      eventDate: item.publishedDate,
      title: `Newswire reports possible move to ${detectedStatus}`,
      description,
    });
  }

  return updates;
}

/**
 * Recognises the same article across runs from a stored event description:
 * its article link when there is one, otherwise its headline. Not its date
 * (an undated card falls back to the time of the run), not the excerpt (it
 * can be lightly edited), and not the detected stage (detection rules can
 * change, and a reviewed article stays reviewed).
 */
export function coverageIdentity(description: string | null) {
  const paragraphs = (description || '').split('\n\n');
  const reportedBy = paragraphs.find((paragraph) => paragraph.startsWith(REPORTED_BY_PREFIX));
  return reportedBy ? reportedBy.slice(REPORTED_BY_PREFIX.length) : paragraphs[0] || '';
}

function signalKey(caseId: string, description: string | null) {
  return `${caseId}|${coverageIdentity(description)}`;
}
