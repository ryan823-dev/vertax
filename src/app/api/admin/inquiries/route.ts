import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlatformAdminRoleName } from "@/lib/permissions";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  return Boolean(user && isPlatformAdminRoleName(user.role.name));
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiries = await db.inquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ inquiries });
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, note } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (status) data.status = status;
  if (note !== undefined) data.note = note;

  const inquiry = await db.inquiry.update({
    where: { id },
    data,
  });

  return NextResponse.json({ inquiry });
}
