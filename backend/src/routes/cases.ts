import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';
import { normaliseMaterialityLevel, scoreFromMateriality, normaliseCaseLifecycleStatus, normaliseSourceConfidence, createUniqueCaseSlug } from '../api-helpers';
import type { CaseData } from '../case-ingestor';
import { LLM_MODEL_NAME, LLM_PROMPT_VERSION, analyzeCaseWithLLM } from '../llm-processor';
import { buildLifecycleStageTree } from '../lifecycle-stages';
import { LIFECYCLE_EVENT_TYPE } from '../lifecycle-signals';

const router = Router();

// === GET CASES ===
router.get('/cases', async (req: Request, res: Response) => {
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
router.get('/cases/:slug', async (req: Request, res: Response) => {
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

// === CREATE CASE ===
router.post('/cases', async (req: Request, res: Response) => {
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
router.post('/cases/:id/analyze', async (req: Request, res: Response) => {
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

// === DELETE CASE ===
router.delete('/cases/:id', async (req: Request, res: Response) => {
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

export default router;
