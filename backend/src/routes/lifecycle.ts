import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';
import { syncCaseLifecycleStatus } from '../api-helpers';
import { LIFECYCLE_STAGE_TYPES, buildLifecycleStageTree, isEarlierStageDay, isLifecycleStageType, latestLifecycleStage } from '../lifecycle-stages';

const router = Router();

// === GET LIFECYCLE / TIMELINE EVENTS ===
router.get('/events', async (req: Request, res: Response) => {
  try {
    const verificationStatus = req.query.verificationStatus;
    const where = verificationStatus
      ? { verificationStatus: { in: String(verificationStatus).split(',') } }
      : {};

    const events = await prisma.event.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      include: {
        case: { select: { id: true, slug: true, caseName: true, caseLifecycleStatus: true } },
      },
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// === VERIFY A REPORTED LIFECYCLE EVENT ===
// Confirms an auto-detected event and adds it to the case's lifecycle stage
// tree, attached as a child of the latest stage dated on or before the
// event. This is the only place a stage gets added as a result of automated
// newswire detection - always by a human clicking confirm, never by the
// detector.
router.post('/events/:id/verify', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { lifecycleStatus } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.verificationStatus !== 'Unverified') {
      return res.status(409).json({ error: `Event has already been reviewed (${event.verificationStatus})` });
    }

    const requestedStatus = lifecycleStatus ?? event.suggestedLifecycleStatus;
    if (!isLifecycleStageType(requestedStatus)) {
      return res.status(400).json({ error: `lifecycleStatus must be one of ${LIFECYCLE_STAGE_TYPES.join(', ')}` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Claim the event before adding the stage, so a double submit (or a
      // dismiss racing a confirm) can't add the stage twice.
      const claimed = await tx.event.updateMany({
        where: { id, verificationStatus: 'Unverified' },
        data: { verificationStatus: 'Verified', title: `Confirmed move to ${requestedStatus}` },
      });
      if (claimed.count === 0) {
        return null;
      }

      const existingStages = await tx.lifecycleStage.findMany({ where: { caseId: event.caseId } });
      const parent = latestLifecycleStage(existingStages, event.eventDate);

      const stage = await tx.lifecycleStage.create({
        data: {
          caseId: event.caseId,
          parentId: parent?.id ?? null,
          status: requestedStatus,
          stageDate: event.eventDate,
          notes: event.description,
          source: 'Newswire detector',
        },
      });

      const updatedCase = await syncCaseLifecycleStatus(tx, event.caseId);
      const updatedEvent = await tx.event.findUnique({ where: { id } });

      return { event: updatedEvent, stage, case: updatedCase };
    });

    if (!result) {
      return res.status(409).json({ error: 'Event has already been reviewed' });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify event' });
  }
});

// === DISMISS A REPORTED LIFECYCLE EVENT ===
router.post('/events/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const dismissed = await prisma.event.updateMany({
      where: { id, verificationStatus: 'Unverified' },
      data: { verificationStatus: 'Rejected' },
    });
    if (dismissed.count === 0) {
      return res.status(409).json({ error: `Event has already been reviewed (${event.verificationStatus})` });
    }

    res.json({ event: await prisma.event.findUnique({ where: { id } }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to dismiss event' });
  }
});

// === GET A CASE'S LIFECYCLE STAGE TREE ===
// latestStageId is the stage a new entry attaches to by default.
router.get('/cases/:id/lifecycle-stages', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const stages = await prisma.lifecycleStage.findMany({ where: { caseId: id } });

    res.json({ tree: buildLifecycleStageTree(stages), latestStageId: latestLifecycleStage(stages)?.id ?? null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lifecycle stages' });
  }
});

// === ADD A STAGE TO A CASE'S LIFECYCLE TREE ===
// The manual counterpart to the newswire-driven verify endpoint above: a
// person who already knows a case's status can record it directly, attached
// to any existing stage (usually the latest one, but any stage to support
// branches like an appeal off an earlier judgment).
router.post('/cases/:id/lifecycle-stages', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { parentId, status, stageDate, notes } = req.body;

    if (!isLifecycleStageType(status)) {
      return res.status(400).json({ error: `status must be one of ${LIFECYCLE_STAGE_TYPES.join(', ')}` });
    }

    const parsedDate = stageDate ? new Date(String(stageDate)) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'stageDate is not a valid date' });
    }

    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (parentId) {
      const parentStage = await prisma.lifecycleStage.findUnique({ where: { id: String(parentId) } });
      if (!parentStage || parentStage.caseId !== id) {
        return res.status(400).json({ error: 'parentId must be an existing stage on this case' });
      }

      if (isEarlierStageDay(parsedDate, parentStage.stageDate)) {
        return res.status(400).json({ error: 'stageDate cannot be earlier than the stage it is attached after' });
      }
    }

    const { stage, updatedCase } = await prisma.$transaction(async (tx) => {
      const stage = await tx.lifecycleStage.create({
        data: {
          caseId: id,
          parentId: parentId ? String(parentId) : null,
          status,
          stageDate: parsedDate,
          notes: notes ? String(notes) : null,
          source: 'Manual',
        },
      });

      return { stage, updatedCase: await syncCaseLifecycleStatus(tx, id) };
    });

    res.status(201).json({ stage, case: updatedCase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add lifecycle stage' });
  }
});

export default router;
