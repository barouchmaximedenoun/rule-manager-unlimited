import { Router, Request, Response } from "express";

import { prisma, Prisma } from '../db'; 
import { bulkSaveRules } from "../services/ruleServices";

const router = Router();

router.get('/rules', async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 25;

    const rules = await prisma.rule.findMany({
      orderBy: { priority: 'asc' },
      skip,
      take,
      include: {
        sources: true,
        destinations: true,
      },
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/rules/bulk-save', async (req: Request, res: Response) => {
  const modifiedRules = req.body.modifiedRules;
  if (!Array.isArray(modifiedRules)) {
    return res.status(400).json({ error: 'Invalid modifiedRules payload' });
  }

  const DEFAULT_PRIORITY = 1_000_000_000;

  // Vérification des priorités interdites
  for (const rule of modifiedRules) {
    if (rule.priority >= DEFAULT_PRIORITY) {
      return res
        .status(400)
        .json({ error: 'Modification or creation of the default rule is not allowed' });
    }
  }

  try {
    const result = await bulkSaveRules(modifiedRules);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma known error:', error.message);
      res.status(500).json({ error: error.message || 'Failed to save rules' });
    } else if (error instanceof Error) {
      console.error('Generic error:', error.message);
      res.status(500).json({ error: error.message || 'Failed to save rules' });
    } else {
      console.error('Unknown error:', error);
      res.status(500).json({ error: 'Failed to save rules' });
    }
  }
});

export default router;
