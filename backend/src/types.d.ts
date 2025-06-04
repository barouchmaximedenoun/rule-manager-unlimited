import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string; // or `string` if always set
    }
  }
}
