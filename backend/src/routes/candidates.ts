import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';
import { normaliseMaterialityLevel, scoreFromMateriality, normaliseSourceConfidence, normaliseMatchedKeywords, normaliseOptionalBoolean, normaliseOptionalScore, createUniqueCaseSlug, buildCandidateWhere } from '../api-helpers';
import { normaliseAiRole } from '../llm-processor';

const router = Router();

// === GET CASE CANDIDATES ===
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.caseCandidate.findMany({
      where: buildCandidateWhere(req.query.status),
      orderBy: [
        { candidateStatus: 'asc' },
        { discoveredAt: 'desc' },
      ],
    });

    res.json(candidates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// === CREATE CASE CANDIDATE ===
router.post('/candidates', async (req: Request, res: Response) => {
  try {
    const {
      caseName,
      neutralCitation,
      docketNumber,
      jurisdiction,
      country,
      courtName,
      courtLevel,
      sourceTitle,
      sourceUrl,
      sourcePublisher,
      sourceType,
      sourcePublishedAt,
      sourceConfidence,
      sourceAdapterName,
      sourceCategory,
      extractionMethod,
      matchedKeywords,
      llmScreeningStatus,
      llmScreeningReason,
      aiRelevant,
      relevanceScore,
      relevanceReason,
      aiRole,
      duplicateCheckResult,
      fetchedAt,
      aiRelevanceStatus,
      materialityLevel,
      summaryShort,
      summaryLong,
      reviewerNotes,
    } = req.body;

    if (!caseName) {
      return res.status(400).json({ error: 'caseName required' });
    }

    if (!sourceTitle && !sourceUrl) {
      return res.status(400).json({ error: 'sourceTitle or sourceUrl required' });
    }

    const normalisedAiRelevant = normaliseOptionalBoolean(aiRelevant);
    const normalisedRelevanceScore = normaliseOptionalScore(relevanceScore);

    if (
      relevanceScore !== undefined &&
      relevanceScore !== null &&
      relevanceScore !== '' &&
      normalisedRelevanceScore === null
    ) {
      return res.status(400).json({ error: 'relevanceScore must be a number between 0 and 1' });
    }

    const duplicate = sourceUrl
      ? await prisma.caseCandidate.findFirst({
        where: {
          sourceUrl: String(sourceUrl),
          candidateStatus: { notIn: ['Rejected'] },
        },
      })
      : null;

    if (duplicate) {
      return res.status(409).json({ error: 'Candidate already exists for this source URL', candidate: duplicate });
    }

    const candidate = await prisma.caseCandidate.create({
      data: {
        caseName,
        neutralCitation: neutralCitation || null,
        docketNumber: docketNumber || null,
        jurisdiction: jurisdiction || 'Unknown',
        country: country || 'Unknown',
        courtName: courtName || 'Unknown',
        courtLevel: courtLevel || 'Trial',
        candidateStatus: 'Needs human triage',
        sourceTitle: sourceTitle || caseName,
        sourceUrl: sourceUrl || null,
        sourcePublisher: sourcePublisher || null,
        sourceType: sourceType || 'Court record',
        sourcePublishedAt: sourcePublishedAt ? new Date(sourcePublishedAt) : null,
        sourceConfidence: sourceConfidence || 'Unknown',
        sourceAdapterName: sourceAdapterName || null,
        sourceCategory: sourceCategory || 'Manual',
        extractionMethod: extractionMethod || 'Manual',
        matchedKeywords: normaliseMatchedKeywords(matchedKeywords),
        llmScreeningStatus: llmScreeningStatus || 'Not screened',
        llmScreeningReason: llmScreeningReason || null,
        aiRelevant: normalisedAiRelevant,
        relevanceScore: normalisedRelevanceScore,
        relevanceReason: relevanceReason || null,
        aiRole: aiRole ? normaliseAiRole(aiRole, normalisedAiRelevant ?? true) : null,
        duplicateCheckResult: duplicateCheckResult || 'Manual candidate; duplicate check deferred to acceptance.',
        fetchedAt: fetchedAt ? new Date(fetchedAt) : new Date(),
        aiRelevanceStatus: aiRelevanceStatus || 'Unknown',
        materialityLevel: normaliseMaterialityLevel(materialityLevel),
        summaryShort: summaryShort || null,
        summaryLong: summaryLong || null,
        reviewerNotes: reviewerNotes || null,
      },
    });

    res.status(201).json(candidate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// === ACCEPT CASE CANDIDATE ===
router.post('/candidates/:id/accept', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { reviewerNotes } = req.body;
    const candidate = await prisma.caseCandidate.findUnique({ where: { id } });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (candidate.acceptedCaseId) {
      const existingAcceptedCase = await prisma.case.findUnique({ where: { id: candidate.acceptedCaseId } });
      return res.json({ candidate, case: existingAcceptedCase });
    }

    const duplicateFilters = [
      ...(candidate.neutralCitation ? [{ neutralCitation: candidate.neutralCitation }] : []),
      ...(candidate.docketNumber ? [{ docketNumber: candidate.docketNumber }] : []),
      ...(candidate.sourceUrl ? [{ sources: { some: { url: candidate.sourceUrl } } }] : []),
    ];

    const existingCase = duplicateFilters.length > 0
      ? await prisma.case.findFirst({ where: { OR: duplicateFilters } })
      : null;

    if (existingCase) {
      const updatedCandidate = await prisma.caseCandidate.update({
        where: { id },
        data: {
          candidateStatus: 'Rejected',
          rejectionReason: 'Duplicate',
          reviewerNotes: reviewerNotes ? String(reviewerNotes) : candidate.reviewerNotes,
          reviewedAt: new Date(),
          acceptedCaseId: existingCase.id,
        },
      });

      return res.json({ duplicate: true, candidate: updatedCandidate, case: existingCase });
    }

    const materialityLevel = normaliseMaterialityLevel(candidate.materialityLevel);
    const slug = await createUniqueCaseSlug(candidate.caseName);

    const caseData = {
      slug,
      caseName: candidate.caseName,
      neutralCitation: candidate.neutralCitation,
      docketNumber: candidate.docketNumber,
      jurisdiction: candidate.jurisdiction,
      country: candidate.country,
      courtName: candidate.courtName,
      courtLevel: candidate.courtLevel,
      statusPublic: 'Active',
      statusInternal: 'Triage accepted',
      caseLifecycleStatus: 'Active',
      reviewStatus: 'Unreviewed',
      aiRelevanceStatus: candidate.aiRelevanceStatus,
      materialityLevel,
      materialityScore: materialityLevel,
      materialityScoreValue: scoreFromMateriality(materialityLevel),
      filingDate: candidate.sourcePublishedAt,
      summaryShort: candidate.summaryShort || 'Candidate accepted from triage queue.',
      summaryLong: candidate.summaryLong,
      whyItMatters: null,
      isAiRelated: candidate.aiRelevanceStatus === 'Relevant',
      ...(candidate.sourceUrl
        ? {
          sources: {
          create: {
            title: candidate.sourceTitle,
            url: candidate.sourceUrl,
            sourceType: candidate.sourceType,
            publisher: candidate.sourcePublisher,
            publishedAt: candidate.sourcePublishedAt,
            isPrimary: candidate.sourceConfidence === 'Official court source',
            sourceConfidence: normaliseSourceConfidence(candidate.sourceConfidence),
            notes: candidate.reviewerNotes,
          },
          },
        }
        : {}),
    };

    const createdCase = await prisma.case.create({
      data: caseData,
    });

    const updatedCandidate = await prisma.caseCandidate.update({
      where: { id },
      data: {
        candidateStatus: 'Accepted',
        reviewerNotes: reviewerNotes ? String(reviewerNotes) : candidate.reviewerNotes,
        reviewedAt: new Date(),
        acceptedCaseId: createdCase.id,
      },
    });

    res.status(201).json({ candidate: updatedCandidate, case: createdCase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept candidate' });
  }
});

// === REJECT CASE CANDIDATE ===
router.post('/candidates/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { rejectionReason, reviewerNotes } = req.body;

    const candidate = await prisma.caseCandidate.update({
      where: { id },
      data: {
        candidateStatus: 'Rejected',
        rejectionReason: rejectionReason || 'Other',
        reviewerNotes: reviewerNotes ? String(reviewerNotes) : null,
        reviewedAt: new Date(),
      },
    });

    res.json(candidate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
});

export default router;
