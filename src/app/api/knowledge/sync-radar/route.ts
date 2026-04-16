import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTargetingSpecDraft } from "@/lib/knowledge-sync";

export const maxDuration = 60;

export async function POST() {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const version = await createTargetingSpecDraft(session.user.tenantId, session.user.id);

    return NextResponse.json({
      success: true,
      targetingSpecVersionId: version.id,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[sync-radar] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
