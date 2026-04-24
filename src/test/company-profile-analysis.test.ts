import { describe, expect, it } from "vitest";
import {
  composeCompanyProfileAnalysisContext,
  selectCompanyProfileAnalysisAssets,
  selectCompanyProfileAnalysisEvidenceSeeds,
  type CompanyProfileAnalysisAssetCandidate,
} from "@/lib/knowledge/company-profile-analysis";

function makeAsset(
  id: string,
  {
    name,
    path,
    description,
    chunkCount = 4,
    fileSize = 48000,
  }: {
    name: string;
    path: string;
    description?: string;
    chunkCount?: number;
    fileSize?: number;
  },
): CompanyProfileAnalysisAssetCandidate {
  return {
    id,
    originalName: name,
    title: name,
    description: description ?? null,
    storageKey: `web://https://machrio.com${path}`,
    mimeType: "text/html",
    fileCategory: "document",
    fileSize,
    tags: ["web-import"],
    metadata: {
      sourceUrl: `https://machrio.com${path}`,
      chunkCount,
    },
    createdAt: new Date("2026-04-24T10:00:00.000Z"),
  };
}

describe("selectCompanyProfileAnalysisAssets", () => {
  it("keeps every asset instead of capping the analysis set", () => {
    const assets = Array.from({ length: 18 }, (_, index) =>
      makeAsset(`asset-${index + 1}`, {
        name: `Asset ${index + 1}`,
        path: `/page-${index + 1}`,
      }),
    );

    const selected = selectCompanyProfileAnalysisAssets(assets);

    expect(selected).toHaveLength(18);
    expect(selected.map((asset) => asset.id)).toEqual(
      assets.map((asset) => asset.id),
    );
  });
});

describe("composeCompanyProfileAnalysisContext", () => {
  it("builds context from more than ten assets when budget allows", () => {
    const assets = Array.from({ length: 14 }, (_, index) =>
      makeAsset(`asset-${index + 1}`, {
        name: `Capability Page ${index + 1}`,
        path: `/capabilities/page-${index + 1}`,
      }),
    );

    const chunks = assets.map((asset, index) => ({
      assetId: asset.id,
      chunkIndex: 0,
      content: `MachRio capability page ${index + 1} describes factory capacity, OEM support, export workflow, ISO certification, DDP shipping, and product coverage for global industrial buyers.`,
    }));

    const context = composeCompanyProfileAnalysisContext({
      assets,
      chunks,
      maxContextChars: 32000,
    });

    expect(context.stats.assetCount).toBe(14);
    expect(context.stats.selectedAssetCount).toBe(14);
    expect(context.sections.join("\n")).toContain("已综合素材数: 14");
  });

  it("prioritizes strategic pages and structured evidence when context is tight", () => {
    const assets = [
      makeAsset("home", { name: "MachRio", path: "/" }),
      makeAsset("about", { name: "About Us", path: "/about-us" }),
      makeAsset("products", { name: "Products", path: "/products" }),
      makeAsset("privacy", { name: "Privacy Policy", path: "/privacy-policy" }),
    ];

    const chunks = [
      {
        assetId: "home",
        chunkIndex: 0,
        content:
          "MachRio is a B2B industrial sourcing platform with OEM, ODM, DDP logistics, and export-ready MRO supply for overseas factories.",
      },
      {
        assetId: "about",
        chunkIndex: 0,
        content:
          "About MachRio: Hong Kong registered team, China supply chain integration, quality systems, and global delivery capability.",
      },
      {
        assetId: "products",
        chunkIndex: 0,
        content:
          "Products include tools, spare parts, safety consumables, and industrial maintenance supplies for manufacturing buyers.",
      },
      {
        assetId: "privacy",
        chunkIndex: 0,
        content:
          "Privacy policy, cookies, account registration, and legal disclaimer for website visitors.",
      },
    ];

    const context = composeCompanyProfileAnalysisContext({
      assets,
      chunks,
      evidences: [
        {
          id: "e1",
          assetId: "products",
          title: "ISO-backed sourcing",
          content: "MachRio coordinates ISO-compliant factories and supports global export paperwork.",
          type: "claim",
          updatedAt: new Date("2026-04-24T10:00:00.000Z"),
        },
      ],
      maxContextChars: 1400,
    });

    const combined = context.sections.join("\n");
    expect(combined).toContain("结构化证据摘录");
    expect(combined).toContain("About Us");
    expect(combined).toContain("Products");
    expect(combined).not.toContain("[低价值页面] Privacy Policy");
  });
});

describe("selectCompanyProfileAnalysisEvidenceSeeds", () => {
  it("prefers strategic chunks and skips utility pages for evidence materialization", () => {
    const assets = [
      makeAsset("home", { name: "MachRio", path: "/" }),
      makeAsset("about", { name: "About Us", path: "/about-us" }),
      makeAsset("products", { name: "Products", path: "/products" }),
      makeAsset("privacy", { name: "Privacy Policy", path: "/privacy-policy" }),
    ];

    const seeds = selectCompanyProfileAnalysisEvidenceSeeds({
      assets,
      chunks: [
        {
          id: "chunk-home",
          assetId: "home",
          chunkIndex: 0,
          content:
            "MachRio supports OEM supply, DDP shipping, export documentation, and factory audits for global industrial buyers.",
        },
        {
          id: "chunk-about",
          assetId: "about",
          chunkIndex: 0,
          content:
            "About MachRio: integrated sourcing team, quality workflow, and response coverage for overseas procurement teams.",
        },
        {
          id: "chunk-products",
          assetId: "products",
          chunkIndex: 0,
          content:
            "Products include MRO parts, safety consumables, and maintenance tooling backed by audited supplier networks.",
        },
        {
          id: "chunk-privacy",
          assetId: "privacy",
          chunkIndex: 0,
          content:
            "Privacy policy, cookies, login, account registration, and legal terms for website visitors.",
        },
      ],
      maxCandidates: 3,
    });

    expect(seeds).toHaveLength(3);
    expect(seeds.map((seed) => seed.assetId)).toEqual([
      "home",
      "about",
      "products",
    ]);
    expect(seeds.some((seed) => seed.assetId === "privacy")).toBe(false);
  });
});
