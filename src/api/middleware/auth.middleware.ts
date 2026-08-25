import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET as string;

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = payload;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
