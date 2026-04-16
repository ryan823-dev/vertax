import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTopicClusterDraft } from "@/lib/knowledge-sync";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { focusSegment?: string };
    const version = await createTopicClusterDraft(session.user.tenantId, session.user.id, {
      focusSegment: body.focusSegment,
    });

    return NextResponse.json({
      success: true,
      topicClusterVersionId: version.id,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[sync-marketing] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
