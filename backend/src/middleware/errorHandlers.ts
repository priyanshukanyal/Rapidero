import type { Request, Response, NextFunction } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  if (err?.code === "ER_DUP_ENTRY")
    return res.status(409).json({ error: "Duplicate record" });
  res.status(err.status || 500).json({ error: err.message || "Server error" });
}
