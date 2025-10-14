import type { Request } from "express";

export function tenantWhere(req: Request) {
  const roles = (req as any).user?.roles || [];
  if (roles.includes("ADMIN") || roles.includes("OPS"))
    return { sql: "", params: [] };
  const clientId = (req as any).user?.client_id;
  if (!clientId) return { sql: " AND 1=0 ", params: [] }; // no access
  return { sql: " AND client_id = ? ", params: [clientId] };
}
