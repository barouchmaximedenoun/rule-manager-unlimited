import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

import { Router, Request, Response } from "express";

const router = Router();

router.post('/api/login', async(req: Request, res: Response) => {
  console.log("in Login")
  const { tenantId, password } = req.body;
  console.log('Login attempt:', { tenantId, password, SECRET });
  if (!tenantId || password !== '1234') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = jwt.sign({ tenantId }, SECRET, { expiresIn: '12h' });
  console.log('Login token:', { token });
  // res.json({ token });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', //true,         // obligatoire en production (HTTPS)
    sameSite: 'lax',      // ou 'strict' selon tes besoins
    maxAge: 3600000  * 12     // 12h par exemple
  });
  res.json({ success: true });
});

router.get('/api/me', (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    res.json({ tenantId: decoded.tenantId });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', //true,   // pareil que dans le login
    sameSite: 'lax',
  });
  res.sendStatus(200);
});

export default router;
