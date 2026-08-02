import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";
import { prisma } from "@/lib/db";

const schema = z.object({ role: z.nativeEnum(UserRole) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  if (parsed.data.role === UserRole.USER && (target.id === actor.id || isConfiguredAdminEmail(target.email))) {
    return NextResponse.json({ error: "PROTECTED_ADMIN" }, { status: 409 });
  }
  const auditContext = requestAuditContext(request);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { role: parsed.data.role } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: "ROLE_CHANGED", targetType: "User", targetId: id,
        summary: `${target.email} yetkisi ${target.role} → ${parsed.data.role} olarak değiştirildi.`,
        details: { before: target.role, after: parsed.data.role }, ...auditContext
      }
    })
  ]);
  return NextResponse.json({ ok: true, role: parsed.data.role });
}
