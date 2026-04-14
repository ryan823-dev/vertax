import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPlatformAdminRoleName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

async function getPlatformAdminUser(userId?: string) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !isPlatformAdminRoleName(user.role.name)) {
    return null;
  }

  return user;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getPlatformAdminUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.apiKeyConfig.findMany({
      orderBy: [{ category: "asc" }, { service: "asc" }],
    });

    const safeConfigs = configs.map((config) => ({
      ...config,
      apiKey: config.apiKey ? "************" : null,
      apiSecret: config.apiSecret ? "************" : null,
    }));

    return NextResponse.json({ configs: safeConfigs });
  } catch (error) {
    console.error("Failed to fetch API key configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getPlatformAdminUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { service, apiKey, apiSecret, monthlyLimit, notes } = body;

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
        { status: 400 }
      );
    }

    const validServices = [
      "dashscope",
      "openrouter",
      "gemini",
      "brave_search",
      "tavily",
      "exa",
      "firecrawl",
      "serper",
      "google_places",
      "hunter",
      "pdl",
      "apollo",
      "skrapp",
      "sam_gov",
      "ungm",
    ];

    if (!validServices.includes(service)) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    const serviceCategories: Record<string, string> = {
      dashscope: "AI Provider",
      openrouter: "AI Provider",
      gemini: "AI Provider",
      brave_search: "Search API",
      tavily: "Search API",
      exa: "Search API",
      serper: "Search API",
      google_places: "Business Data",
      hunter: "Business Data",
      pdl: "Business Data",
      apollo: "Business Data",
      skrapp: "Business Data",
      sam_gov: "Government Procurement",
      ungm: "Government Procurement",
      firecrawl: "Web Scraping",
    };

    const category = serviceCategories[service] || "Other";

    const config = await prisma.apiKeyConfig.upsert({
      where: { service },
      create: {
        service,
        category,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        monthlyLimit: monthlyLimit || null,
        notes: notes || null,
        isEnabled: true,
      },
      update: {
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        monthlyLimit: monthlyLimit || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Failed to save API key config:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getPlatformAdminUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { service, isEnabled } = body;

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
        { status: 400 }
      );
    }

    const config = await prisma.apiKeyConfig.update({
      where: { service },
      data: { isEnabled },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Failed to update API key config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getPlatformAdminUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service");

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
        { status: 400 }
      );
    }

    await prisma.apiKeyConfig.delete({
      where: { service },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key config:", error);
    return NextResponse.json(
      { error: "Failed to delete config" },
      { status: 500 }
    );
  }
}
