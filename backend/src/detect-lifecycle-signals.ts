/**
 * Lifecycle Signal Detection CLI
 * Checks ClassActions.com.au newswire coverage against cases already
 * tracked (matched by their Source.url pointing at the same matter page),
 * and logs an unverified Event proposing a lifecycle status update when
 * coverage reports settlement, dismissal, closure, or a failed settlement.
 *
 * This never writes to Case.caseLifecycleStatus directly - a human
 * confirms the change through the lifecycle review admin page.
 * Run: npx ts-node src/detect-lifecycle-signals.ts
 */

import axios from 'axios';
import { prisma } from './db';
import { extractNewswireItems, latestNewswireItemsByMatter } from './case-ingestor';
import { LIFECYCLE_EVENT_TYPE, planLifecycleSignalUpdates, type TrackedMatter } from './lifecycle-signals';

const NEWSWIRE_URL = 'https://classactions.com.au/newswire';

async function main() {
  try {
    console.log('\nFetching ClassActions.com.au newswire for lifecycle signals...');
    const response = await axios.get(NEWSWIRE_URL, { timeout: 15000 });
    const items = extractNewswireItems(response.data, NEWSWIRE_URL);
    const latest = latestNewswireItemsByMatter(items, NEWSWIRE_URL);

    const matterUrls = [...latest.keys()].filter((key) => key.startsWith('http'));
    if (matterUrls.length === 0) {
      console.log('No matter links found on the newswire page.');
      return;
    }

    const sources = await prisma.source.findMany({
      where: { url: { in: matterUrls } },
      include: { case: true },
    });

    if (sources.length === 0) {
      console.log('No newswire matters match a tracked case yet.');
      return;
    }

    // Every detector event on the tracked cases, in one query: unverified
    // ones are the pending suggestions to update in place, reviewed ones are
    // coverage that must not be proposed again.
    const detectorEvents = await prisma.event.findMany({
      where: {
        caseId: { in: sources.map((source) => source.caseId) },
        eventType: LIFECYCLE_EVENT_TYPE,
      },
      select: { id: true, caseId: true, verificationStatus: true, suggestedLifecycleStatus: true, description: true },
    });
    const pendingByCase = new Map(
      detectorEvents.filter((event) => event.verificationStatus === 'Unverified').map((event) => [event.caseId, event])
    );
    const reviewedSignals = detectorEvents.filter((event) => event.verificationStatus !== 'Unverified');

    const trackedMatters: TrackedMatter[] = sources.map((source) => ({
      caseId: source.caseId,
      sourceId: source.id,
      matterUrl: source.url,
      currentLifecycleStatus: source.case.caseLifecycleStatus,
      hasPendingSignal: pendingByCase.has(source.caseId),
    }));

    const updates = planLifecycleSignalUpdates(latest, trackedMatters, reviewedSignals);
    console.log(`Checked ${trackedMatters.length} tracked matter(s); found ${updates.length} possible lifecycle change(s).`);

    let logged = 0;
    let updated = 0;
    let skipped = 0;

    // At most one unverified lifecycle event is kept per case at a time. If a
    // case already has one pending review and a later run detects a further
    // change (e.g. an in-principle settlement that later fell through), the
    // pending event is updated in place with the newest coverage rather than
    // left stale alongside a second, possibly contradictory, event.
    for (const update of updates) {
      const pendingEvent = pendingByCase.get(update.caseId);

      if (pendingEvent) {
        // Same suggestion from the same article text; compared by text rather
        // than date, since an undated card gets a new fallback date each run.
        const isUnchanged = pendingEvent.suggestedLifecycleStatus === update.detectedStatus
          && pendingEvent.description === update.description;

        if (isUnchanged) {
          skipped++;
          continue;
        }

        const updatedEvent = await prisma.event.update({
          where: { id: pendingEvent.id },
          data: {
            eventDate: update.eventDate,
            title: update.title,
            description: update.description,
            sourceId: update.sourceId,
            suggestedLifecycleStatus: update.detectedStatus,
          },
        });

        pendingByCase.set(update.caseId, updatedEvent);
        updated++;
        console.log(`   Updated pending event for case ${update.caseId}: now suggests ${update.detectedStatus}`);
        continue;
      }

      const createdEvent = await prisma.event.create({
        data: {
          caseId: update.caseId,
          eventDate: update.eventDate,
          eventType: LIFECYCLE_EVENT_TYPE,
          title: update.title,
          description: update.description,
          sourceId: update.sourceId,
          verificationStatus: 'Unverified',
          suggestedLifecycleStatus: update.detectedStatus,
        },
      });

      pendingByCase.set(update.caseId, createdEvent);
      logged++;
      console.log(`   Logged unverified event for case ${update.caseId}: possible move to ${update.detectedStatus}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Lifecycle Signal Detection Complete:');
    console.log(`   New unverified events logged: ${logged}`);
    console.log(`   Pending events updated with newer coverage: ${updated}`);
    console.log(`   Unchanged, skipped: ${skipped}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
