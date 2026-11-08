import express, { Router, type Request, type Response } from 'express';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { prisma } from '../db';
import { checkDocument } from '../citation-check';
import { openCorpus } from '../corpus';
import { COURT_RULES, DOCUMENT_TYPES, checklistFor, type DocumentType } from '../court-rules';

// The draft is only held in memory for the length of the request: never stored or logged.
const router = Router();

router.get('/check/options', (_req: Request, res: Response) => {
  const corpus = openCorpus();
  res.json({
    courts: COURT_RULES.map((r) => r.court),
    documentTypes: DOCUMENT_TYPES,
    dataset: corpus && { decisions: corpus.decisionCount, cutoffDate: corpus.cutoffDate },
  });
});

/** Stages recorded after the stage that mentions a citation, on cases tracked in this app. */
async function laterStages(citation: string): Promise<string[]> {
  const mentions = await prisma.lifecycleStage.findMany({ where: { notes: { contains: citation } } });
  const later = await Promise.all(
    mentions.map((stage) =>
      prisma.lifecycleStage.findMany({ where: { caseId: stage.caseId, stageDate: { gt: stage.stageDate } }, orderBy: { stageDate: 'asc' } }),
    ),
  );
  return later.flat().map((s) => `${s.status}, ${s.stageDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}${s.notes ? `. ${s.notes}` : '.'}`);
}

router.post('/check', async (req: Request, res: Response) => {
  const corpus = openCorpus();
  if (!corpus) return res.status(503).json({ error: 'The citation index is not installed. Run npm run corpus:download in backend.' });

  const { text, court, documentType } = req.body as { text?: string; court?: string; documentType?: DocumentType };
  if (!text?.trim()) return res.status(400).json({ error: 'Paste a document or upload a file to check.' });

  try {
    const result = await checkDocument(text, corpus, laterStages);
    res.json({ ...result, checklist: court && documentType ? checklistFor(court, documentType) ?? null : null });
  } catch (error) {
    console.error('Citation check failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'The check failed. Try again.' });
  }
});

// Word and PDF files arrive as raw bytes, with the file name in a header.
router.post('/check/extract-text', express.raw({ type: 'application/octet-stream', limit: '20mb' }), async (req: Request, res: Response) => {
  const name = String(req.headers['x-file-name'] ?? '').toLowerCase();
  const data = req.body as Buffer;
  try {
    if (name.endsWith('.docx')) return res.json({ text: (await mammoth.extractRawText({ buffer: data })).value });
    if (name.endsWith('.pdf')) return res.json({ text: (await new PDFParse({ data }).getText()).text });
    if (name.endsWith('.txt')) return res.json({ text: data.toString('utf8') });
    res.status(400).json({ error: 'Upload a .docx, .pdf or .txt file.' });
  } catch {
    res.status(400).json({ error: "Couldn't read that file. Try pasting the text instead." });
  }
});

export default router;
