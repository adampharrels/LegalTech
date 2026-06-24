import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { analyzeCaseWithLLM } from './llm-processor';
import type { CaseData } from './case-ingestor';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === GET CASES ===
app.get('/api/cases', async (req: Request, res: Response) => {
  try {
    const { jurisdiction, issueSlug, legalAreaSlug, query, materialityScore, statusPublic, dateFrom, dateTo, sort } = req.query;
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

    if (materialityScore) {
      where.materialityScore = { in: String(materialityScore).split(',') };
    }

    if (statusPublic) {
      where.statusPublic = { in: String(statusPublic).split(',') };
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
        events: { orderBy: { eventDate: 'desc' } },
        sources: { orderBy: [{ isPrimary: 'desc' }, { publishedAt: 'desc' }] },
        relatedTo: { include: { relatedCase: true } },
        relatedFrom: { include: { case: true } }
      }
    });
    
    if (!caseData) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(caseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// === GET ISSUES ===
app.get('/api/issues', async (req: Request, res: Response) => {
  try {
    const issues = await prisma.issue.findMany({ orderBy: { name: 'asc' } });
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
      materialityScore,
      filingDate,
      summaryShort,
      summaryLong,
      whyItMatters,
      sourceTitle,
      sourceUrl,
      sourceType,
      sourcePublisher,
      sourcePublishedAt
    } = req.body;

    if (!caseName) return res.status(400).json({ error: 'caseName required' });

    const slug = caseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const casePayload = {
      caseName,
      slug,
      jurisdiction: jurisdiction || 'Unknown',
      country: country || 'Unknown',
      courtName: courtName || 'Unknown',
      courtLevel: courtLevel || 'Trial',
      neutralCitation: neutralCitation || null,
      docketNumber: docketNumber || null,
      statusPublic: statusPublic || 'Pending',
      statusInternal: 'Review',
      materialityScore: materialityScore || 'Low',
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

    await prisma.$transaction([
      prisma.caseIssue.deleteMany({ where: { caseId: id } }),
      prisma.caseLegalArea.deleteMany({ where: { caseId: id } }),
      prisma.case.update({
        where: { id },
        data: {
          isAiRelated: analysis.isAiRelated,
          summaryShort: analysis.summaryShort,
          summaryLong: analysis.summaryLong,
          whyItMatters: analysis.whyItMatters,
          statusInternal: 'LLM reviewed',
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
    ]);

    const updated = await prisma.case.findUnique({
      where: { id },
      include: {
        issues: { include: { issue: true } },
        legalAreas: { include: { legalArea: true } },
        sources: { orderBy: [{ isPrimary: 'desc' }, { publishedAt: 'desc' }] },
      },
    });

    res.json({
      case: updated,
      analysis,
      unmatchedIssues: analysis.issues.filter((slug) => !issues.some((issue) => issue.slug === slug)),
      unmatchedLegalAreas: analysis.legalAreas.filter((slug) => !legalAreas.some((area) => area.slug === slug)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze case' });
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
