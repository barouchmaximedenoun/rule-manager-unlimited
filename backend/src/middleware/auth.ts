import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

import { Request, Response,  NextFunction} from "express";

interface MyTokenPayload extends jwt.JwtPayload {
    tenantId: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    if (typeof decoded === 'object' && decoded.tenantId) {
      req.tenantId = decoded.tenantId;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token payload' });
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
} 