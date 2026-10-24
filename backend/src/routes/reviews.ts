import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';
import { normaliseSourceVerificationStatus, normaliseSourceConfidence } from '../api-helpers';

const router = Router();

// === REVIEW LLM ANALYSIS ===
router.post('/llm-analyses/:id/review', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { decision, reviewerName, reviewerNotes } = req.body;

    if (!['accepted', 'rejected'].includes(String(decision))) {
      return res.status(400).json({ error: 'decision must be accepted or rejected' });
    }

    const existingAnalysis = await prisma.llmAnalysis.findUnique({
      where: { id },
      include: { case: true },
    });

    if (!existingAnalysis) {
      return res.status(404).json({ error: 'LLM analysis not found' });
    }

    const nextAnalysisStatus = decision === 'accepted' ? 'human-reviewed' : 'rejected';
    const nextCaseStatus = decision === 'accepted' ? 'Human reviewed' : 'Needs review';
    const nextReviewStatus = decision === 'accepted' ? 'Human reviewed' : 'Rejected';

    const [updatedAnalysis, updatedCase] = await prisma.$transaction([
      prisma.llmAnalysis.update({
        where: { id },
        data: {
          status: nextAnalysisStatus,
          humanDecision: String(decision),
          reviewerName: reviewerName ? String(reviewerName) : null,
          reviewerNotes: reviewerNotes ? String(reviewerNotes) : null,
          reviewedAt: new Date(),
        },
      }),
      prisma.case.update({
        where: { id: existingAnalysis.caseId },
        data: {
          statusInternal: nextCaseStatus,
          reviewStatus: nextReviewStatus,
        },
      }),
    ]);

    res.json({ analysis: updatedAnalysis, case: updatedCase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to review LLM analysis' });
  }
});

// === VERIFY SOURCE ===
router.post('/sources/:id/verification', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      verificationStatus,
      sourceConfidence,
      verifiedBy,
      archivedUrl,
      retrievalNotes,
    } = req.body;

    const source = await prisma.source.findUnique({
      where: { id },
      include: { case: true },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const nextVerificationStatus = normaliseSourceVerificationStatus(verificationStatus);
    const updatedSource = await prisma.source.update({
      where: { id },
      data: {
        verificationStatus: nextVerificationStatus,
        sourceConfidence: normaliseSourceConfidence(sourceConfidence),
        verifiedBy: verifiedBy ? String(verifiedBy) : null,
        archivedUrl: archivedUrl ? String(archivedUrl) : null,
        retrievalNotes: retrievalNotes ? String(retrievalNotes) : null,
        lastCheckedAt: new Date(),
      },
    });

    res.json({ source: updatedSource, case: source.case });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update source verification' });
  }
});

export default router;
