import { Router, type Request, type Response } from 'express';
import { prisma } from '../db';

const router = Router();

// === GET ISSUES ===
router.get('/issues', async (req: Request, res: Response) => {
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
router.get('/legal-areas', async (req: Request, res: Response) => {
  try {
    const areas = await prisma.legalArea.findMany({ orderBy: { name: 'asc' } });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(areas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tracking domains' });
  }
});

export default router;
