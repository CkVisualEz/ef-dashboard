import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export function generateToken(userId: string, username: string): string {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { id: string; username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}

// Optional: Make auth optional for development
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

