import { NextResponse } from "next/server";
import { getRuntimeHealthSnapshot } from "@/lib/runtime-check";

export async function GET() {
  const snapshot = getRuntimeHealthSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
