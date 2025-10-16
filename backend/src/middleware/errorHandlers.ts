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
  // Log everything helpful on the server
  console.error("❌ ERROR:", {
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
    sql: err?.sql,
    sqlMessage: err?.sqlMessage,
  });

  if (err?.code === "ER_DUP_ENTRY")
    return res.status(409).json({ error: "Duplicate record" });

  const status = Number(err?.status || err?.statusCode || 500);
  res.status(status).json({ error: err?.message || "Server error" });
}
