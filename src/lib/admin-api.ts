import { getSessionUser } from "@/lib/auth/session";

export async function getApiAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function requestAuditContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null
  };
}
