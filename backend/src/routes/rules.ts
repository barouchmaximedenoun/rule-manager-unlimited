import { Router, Request, Response } from "express";

import { prisma, Prisma } from '../db'; 
import { bulkSaveRules } from "../services/ruleServices";
import { DEFAULT_PRIORITY } from "../types/rules";

const router = Router();

router.get('/rules', async (req: Request, res: Response) => {
  const tenantId = req.tenantId; // ✅ now available

  if (!tenantId) {
    return res.status(403).json({ error: 'Missing tenantId' });
  }

  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 25;

    const startTotal = process.hrtime.bigint();

    const startQuery = process.hrtime.bigint();
    const whereCondition =
      tenantId === 'admin'
        ? {} // admin voit tout
        : {
            OR: [{ tenantId }, { tenantId: null }],
          };

    // Fetch paginated rules
    const rulesWithoutIncludes = await prisma.rule.findMany({
      where: whereCondition,
      orderBy: { priority: 'asc' },
      skip,
      take,
    });
    // Count total number of rules (for pagination)
    const totalCount = await prisma.rule.count({
      where: whereCondition,
    });
    const endQuery = process.hrtime.bigint();

    const startIncludes = process.hrtime.bigint();
    const rules = await Promise.all(rulesWithoutIncludes.map(async (rule) => {
      const sources = await prisma.source.findMany({ where: { ruleId: rule.id } });
      const destinations = await prisma.destination.findMany({ where: { ruleId: rule.id } });
      return { ...rule, sources, destinations };
    }));
    const endIncludes = process.hrtime.bigint();

    const endTotal = process.hrtime.bigint();

    console.log(`Requête rules: ${(Number(endQuery - startQuery) / 1_000_000).toFixed(3)} ms`);
    console.log(`Chargement includes: ${(Number(endIncludes - startIncludes) / 1_000_000).toFixed(3)} ms`);
    console.log(`Temps total: ${(Number(endTotal - startTotal) / 1_000_000).toFixed(3)} ms`);
    console.log(JSON.stringify(rules[0]).length);
    console.log(JSON.stringify(rules));
    res.removeHeader('ETag');
    res.setHeader('Cache-Control', 'no-store');
    res.json({rules, totalCount});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/rules/bulk-save', async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(403).json({ error: 'Missing tenantId' });
  }

  const modifiedRules = req.body.modifiedRules;
  if (!Array.isArray(modifiedRules)) {
    return res.status(400).json({ error: 'Invalid modifiedRules payload' });
  }

  // Vérification des priorités interdites
  for (const rule of modifiedRules) {
    if (rule.priority >= DEFAULT_PRIORITY) {
      return res
        .status(400)
        .json({ error: 'Modification or creation of the default rule is not allowed' });
    }
  }

  try {
    const result = await bulkSaveRules(modifiedRules, tenantId);
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
