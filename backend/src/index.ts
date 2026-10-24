import express, { Request, Response } from 'express';
import cors from 'cors';
import { Prisma, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { LLM_MODEL_NAME, LLM_PROMPT_VERSION, analyzeCaseWithLLM, normaliseAiRole } from './llm-processor';
import type { CaseData } from './case-ingestor';
import { LIFECYCLE_STAGE_TYPES, buildLifecycleStageTree, coarseStatusForStages, isLifecycleStageType, latestLifecycleStage } from './lifecycle-stages';
import { LIFECYCLE_EVENT_TYPE } from './lifecycle-signals';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const materialityScoreByLevel: Record<string, number> = {
  Low: 2,
  Medium: 5,
  High: 8,
};

const sourceVerificationStatuses = ['Unverified', 'Verified', 'Needs checking', 'Broken'] as const;
const sourceConfidenceLevels = ['Official court source', 'Official regulator publication', 'Court-adjacent source', 'Secondary source', 'Unknown'] as const;
const caseLifecycleStatuses = ['Active', 'Pending', 'Settled', 'Dismissed', 'Closed'] as const;

function normaliseMaterialityLevel(value: unknown) {
  const level = String(value || 'Low');
  return ['Low', 'Medium', 'High'].includes(level) ? level : 'Low';
}

function scoreFromMateriality(value: unknown) {
  const level = normaliseMaterialityLevel(value);
  return materialityScoreByLevel[level] ?? 2;
}

function normaliseSourceVerificationStatus(value: unknown) {
  const status = String(value || 'Unverified');
  return sourceVerificationStatuses.includes(status as typeof sourceVerificationStatuses[number]) ? status : 'Unverified';
}

function normaliseCaseLifecycleStatus(value: unknown) {
  const status = String(value || 'Active');
  return caseLifecycleStatuses.includes(status as typeof caseLifecycleStatuses[number]) ? status : 'Active';
}

function normaliseSourceConfidence(value: unknown) {
  const confidence = String(value || 'Unknown');
  return sourceConfidenceLevels.includes(confidence as typeof sourceConfidenceLevels[number]) ? confidence : 'Unknown';
}

function normaliseMatchedKeywords(value: unknown) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.filter((keyword): keyword is string => typeof keyword === 'string'));
  }

  return String(value);
}

function normaliseOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();

    if (normalised === 'true') {
      return true;
    }

    if (normalised === 'false') {
      return false;
    }
  }

  return null;
}

function normaliseOptionalScore(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 1) {
    return null;
  }

  return score;
}

function slugifyCaseName(caseName: string) {
  return caseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 100);
}

// Re-derives Case.caseLifecycleStatus from the case's whole stage tree, so
// the mirrored status follows the latest-dated stage rather than whichever
// stage happened to be entered last.
async function syncCaseLifecycleStatus(tx: Prisma.TransactionClient, caseId: string) {
  const stages = await tx.lifecycleStage.findMany({ where: { caseId } });
  const caseLifecycleStatus = coarseStatusForStages(stages);

  return tx.case.update({ where: { id: caseId }, data: caseLifecycleStatus ? { caseLifecycleStatus } : {} });
}

async function createUniqueCaseSlug(caseName: string) {
  const baseSlug = slugifyCaseName(caseName) || 'case';
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.case.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function buildCandidateWhere(status: unknown) {
  if (!status) {
    return {};
  }

  return {
    candidateStatus: {
      in: String(status).split(','),
    },
  };
}

// === GET CASE CANDIDATES ===
app.get('/api/candidates', async (req: Request, res: Response) => {
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
app.post('/api/candidates', async (req: Request, res: Response) => {
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
app.post('/api/candidates/:id/accept', async (req: Request, res: Response) => {
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
app.post('/api/candidates/:id/reject', async (req: Request, res: Response) => {
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

// === GET CASES ===
app.get('/api/cases', async (req: Request, res: Response) => {
  try {
    const {
      jurisdiction,
      issueSlug,
      legalAreaSlug,
      query,
      materialityScore,
      materialityLevel,
      statusPublic,
      caseLifecycleStatus,
      reviewStatus,
      aiRelevanceStatus,
      dateFrom,
      dateTo,
      sort,
      hideNotRelevant
    } = req.query;
    const where: any = {};
    const sortValue = String(sort || 'newest');
    const orderBy =
      sortValue === 'oldest'
        ? { filingDate: 'asc' as const }
        : sortValue === 'recently-updated'
          ? { lastUpdated: 'desc' as const }
          : sortValue === 'name'
            ? { caseName: 'asc' as const }
            : { filingDate: 'desc' as const };
    
    if (jurisdiction) {
      where.jurisdiction = { in: String(jurisdiction).split(',') };
    }
    
    if (issueSlug) {
      where.issues = {
        some: { issue: { slug: { in: String(issueSlug).split(',') } } }
      };
    }

    if (legalAreaSlug) {
      where.legalAreas = {
        some: { legalArea: { slug: { in: String(legalAreaSlug).split(',') } } }
      };
    }

    if (materialityLevel || materialityScore) {
      where.materialityLevel = { in: String(materialityLevel || materialityScore).split(',') };
    }

    if (caseLifecycleStatus || statusPublic) {
      where.caseLifecycleStatus = { in: String(caseLifecycleStatus || statusPublic).split(',') };
    }

    if (reviewStatus) {
      where.reviewStatus = { in: String(reviewStatus).split(',') };
    }

    if (aiRelevanceStatus) {
      where.aiRelevanceStatus = { in: String(aiRelevanceStatus).split(',') };
    } else if (hideNotRelevant === 'true') {
      where.aiRelevanceStatus = { not: 'Not relevant' };
    }

    if (dateFrom || dateTo) {
      where.filingDate = {};
      if (dateFrom) where.filingDate.gte = new Date(String(dateFrom));
      if (dateTo) where.filingDate.lte = new Date(String(dateTo));
    }

    if (query) {
      where.OR = [
        { caseName: { contains: String(query) } },
        { summaryShort: { contains: String(query) } },
        { summaryLong: { contains: String(query) } }
      ];
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        issues: { include: { issue: true } },
        legalAreas: { include: { legalArea: true } }
      },
      orderBy
    });

    res.json(cases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// === GET CASE BY SLUG ===
app.get('/api/cases/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const caseData = await prisma.case.findUnique({
      where: { slug },
      include: {
        parties: true,
        issues: { include: { issue: true } },
        legalAreas: { include: { legalArea: true } },
        // Confirmed detector events already live on as stages in the
        // lifecycle tree below, so they aren't repeated in the timeline.
        events: {
          where: { verificationStatus: 'Verified', eventType: { not: LIFECYCLE_EVENT_TYPE } },
          orderBy: { eventDate: 'desc' },
        },
        sources: { orderBy: [{ isPrimary: 'desc' }, { publishedAt: 'desc' }] },
        llmAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
        relatedTo: { include: { relatedCase: true } },
        relatedFrom: { include: { case: true } },
        lifecycleStages: true,
      }
    });
    
    if (!caseData) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ ...caseData, lifecycleStages: buildLifecycleStageTree(caseData.lifecycleStages) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// === GET ISSUES ===
app.get('/api/issues', async (req: Request, res: Response) => {
  try {
    const issues = await prisma.issue.findMany({ orderBy: { name: 'asc' } });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// === GET LEGAL AREAS ===
app.get('/api/legal-areas', async (req: Request, res: Response) => {
  try {
    const areas = await prisma.legalArea.findMany({ orderBy: { name: 'asc' } });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(areas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tracking domains' });
  }
});

// === CREATE CASE ===
app.post('/api/cases', async (req: Request, res: Response) => {
  try {
    const {
      caseName,
      neutralCitation,
      docketNumber,
      jurisdiction,
      country,
      courtName,
      courtLevel,
      statusPublic,
      caseLifecycleStatus,
      materialityScore,
      materialityLevel,
      filingDate,
      summaryShort,
      summaryLong,
      whyItMatters,
      sourceTitle,
      sourceUrl,
      sourceType,
      sourcePublisher,
      sourcePublishedAt,
      sourceConfidence
    } = req.body;

    if (!caseName) return res.status(400).json({ error: 'caseName required' });

    const slug = await createUniqueCaseSlug(String(caseName));
    
    const resolvedLifecycleStatus = normaliseCaseLifecycleStatus(caseLifecycleStatus || statusPublic);
    const resolvedMaterialityLevel = normaliseMaterialityLevel(materialityLevel || materialityScore);
    const resolvedMaterialityScoreValue = scoreFromMateriality(resolvedMaterialityLevel);

    const casePayload = {
      caseName,
      slug,
      jurisdiction: jurisdiction || 'Unknown',
      country: country || 'Unknown',
      courtName: courtName || 'Unknown',
      courtLevel: courtLevel || 'Trial',
      neutralCitation: neutralCitation || null,
      docketNumber: docketNumber || null,
      statusPublic: resolvedLifecycleStatus,
      statusInternal: 'Review',
      caseLifecycleStatus: resolvedLifecycleStatus,
      reviewStatus: 'Unreviewed',
      // A case added by hand to an AI litigation tracker is AI-related by
      // the curator's own judgement; LLM analysis can still revise this.
      aiRelevanceStatus: 'Relevant',
      materialityLevel: resolvedMaterialityLevel,
      materialityScore: resolvedMaterialityLevel,
      materialityScoreValue: resolvedMaterialityScoreValue,
      filingDate: filingDate ? new Date(filingDate) : null,
      summaryShort: summaryShort || 'No summary provided.',
      summaryLong: summaryLong || null,
      whyItMatters: whyItMatters || null,
      isAiRelated: true,
      ...(sourceUrl
        ? {
          sources: {
          create: {
            title: sourceTitle || 'Primary source',
            url: sourceUrl,
            sourceType: sourceType || 'Court record',
            publisher: sourcePublisher || null,
            publishedAt: sourcePublishedAt ? new Date(sourcePublishedAt) : null,
            isPrimary: true,
            sourceConfidence: normaliseSourceConfidence(sourceConfidence),
          }
          }
        }
        : {}),
    };

    const created = await prisma.case.create({
      data: casePayload
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// === ANALYZE CASE WITH LLM ===
app.post('/api/cases/:id/analyze', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const id = String(req.params.id);
    const existingCase = await prisma.case.findUnique({
      where: { id },
      include: {
        sources: { orderBy: [{ isPrimary: 'desc' }, { publishedAt: 'desc' }] },
      },
    });

    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const sourceText = existingCase.sources
      .map((source) => `${source.title}${source.publisher ? ` (${source.publisher})` : ''}: ${source.notes || source.url}`)
      .join('\n');

    const caseData: CaseData = {
      caseName: existingCase.caseName,
      citation: existingCase.neutralCitation || existingCase.docketNumber || '',
      court: existingCase.courtName,
      url: existingCase.sources[0]?.url || '',
      year: (existingCase.filingDate || existingCase.decisionDate || existingCase.createdAt).getFullYear(),
      summary: existingCase.summaryLong || existingCase.summaryShort,
      fullText: sourceText || null,
      publishedDate: existingCase.filingDate || existingCase.decisionDate || existingCase.createdAt,
      source: existingCase.sources[0]?.publisher || existingCase.sources[0]?.sourceType || 'Manual case record',
    };

    const analysis = await analyzeCaseWithLLM(caseData);

    if (!analysis) {
      return res.status(502).json({ error: 'LLM analysis failed' });
    }

    const [issues, legalAreas] = await Promise.all([
      prisma.issue.findMany({ where: { slug: { in: analysis.issues } } }),
      prisma.legalArea.findMany({ where: { slug: { in: analysis.legalAreas } } }),
    ]);

    const unmatchedIssues = analysis.issues.filter((slug) => !issues.some((issue) => issue.slug === slug));
    const unmatchedLegalAreas = analysis.legalAreas.filter((slug) => !legalAreas.some((area) => area.slug === slug));

    await prisma.$transaction([
      prisma.caseIssue.deleteMany({ where: { caseId: id } }),
      prisma.caseLegalArea.deleteMany({ where: { caseId: id } }),
      prisma.case.update({
        where: { id },
        data: {
          isAiRelated: analysis.isAiRelated,
          aiRelevanceStatus: analysis.isAiRelated ? 'Relevant' : 'Not relevant',
          summaryShort: analysis.summaryShort,
          summaryLong: analysis.summaryLong,
          whyItMatters: analysis.whyItMatters,
          statusInternal: 'LLM reviewed',
          reviewStatus: 'LLM analysed',
          issues: {
            create: issues.map((issue) => ({
              issue: { connect: { id: issue.id } },
            })),
          },
          legalAreas: {
            create: legalAreas.map((legalArea) => ({
              legalArea: { connect: { id: legalArea.id } },
            })),
          },
        },
      }),
      prisma.llmAnalysis.create({
        data: {
          caseId: id,
          modelName: LLM_MODEL_NAME,
          promptVersion: LLM_PROMPT_VERSION,
          status: 'applied',
          isAiRelated: analysis.isAiRelated,
          summaryShort: analysis.summaryShort,
          summaryLong: analysis.summaryLong,
          whyItMatters: analysis.whyItMatters,
          issueSlugs: JSON.stringify(analysis.issues),
          legalAreaSlugs: JSON.stringify(analysis.legalAreas),
          unmatchedIssues: unmatchedIssues.length > 0 ? JSON.stringify(unmatchedIssues) : null,
          unmatchedLegalAreas: unmatchedLegalAreas.length > 0 ? JSON.stringify(unmatchedLegalAreas) : null,
          rawResponseJson: JSON.stringify(analysis),
        },
      }),
    ]);

    const updated = await prisma.case.findUnique({
      where: { id },
      include: {
        issues: { include: { issue: true } },
        legalAreas: { include: { legalArea: true } },
        sources: { orderBy: [{ isPrimary: 'desc' }, { publishedAt: 'desc' }] },
        llmAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    res.json({
      case: updated,
      analysis,
      unmatchedIssues,
      unmatchedLegalAreas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyse case' });
  }
});

// === REVIEW LLM ANALYSIS ===
app.post('/api/llm-analyses/:id/review', async (req: Request, res: Response) => {
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
app.post('/api/sources/:id/verification', async (req: Request, res: Response) => {
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

// === GET LIFECYCLE / TIMELINE EVENTS ===
app.get('/api/events', async (req: Request, res: Response) => {
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
app.post('/api/events/:id/verify', async (req: Request, res: Response) => {
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
app.post('/api/events/:id/dismiss', async (req: Request, res: Response) => {
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
app.get('/api/cases/:id/lifecycle-stages', async (req: Request, res: Response) => {
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
app.post('/api/cases/:id/lifecycle-stages', async (req: Request, res: Response) => {
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

      if (parentStage.stageDate.getTime() > parsedDate.getTime()) {
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

// === DELETE CASE ===
app.delete('/api/cases/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.case.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete case' });
  }
});

// === CASE INGESTION ===
// Note: Case ingestion is handled by the case-ingestor.ts module
// Run: npm run ingest

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
