/**
 * Compares newswire coverage against cases already being tracked, and
 * proposes lifecycle status updates when coverage reports a terminal
 * stage (Settled, Dismissed, Closed) that differs from the case's
 * current status. Pure planning logic only - callers are responsible
 * for fetching the newswire page, looking up tracked matters, and
 * writing the resulting updates as (unverified) Events.
 */

import { detectLifecycleStage, type NewswireItem } from './case-ingestor';

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

export function planLifecycleSignalUpdates(
  latestItemsByMatter: Map<string, NewswireItem>,
  trackedMatters: TrackedMatter[]
): LifecycleSignalUpdate[] {
  const trackedByUrl = new Map(trackedMatters.map((matter) => [matter.matterUrl, matter]));
  const updates: LifecycleSignalUpdate[] = [];

  for (const [matterUrl, item] of latestItemsByMatter) {
    const tracked = trackedByUrl.get(matterUrl);
    if (!tracked) {
      continue;
    }

    const detectedStatus = detectLifecycleStage(`${item.headline} ${item.excerpt}`);
    if (!detectedStatus || detectedStatus === tracked.currentLifecycleStatus) {
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
