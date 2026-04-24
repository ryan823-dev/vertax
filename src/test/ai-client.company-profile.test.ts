import { describe, expect, it, vi } from "vitest";
import { parseCompanyProfileAnalysisResponse } from "@/lib/ai-client";

describe("parseCompanyProfileAnalysisResponse", () => {
  it("parses JSON wrapped in prose and markdown fences", async () => {
    const parsed = await parseCompanyProfileAnalysisResponse(
      `分析结果如下：

\`\`\`json
{"companyName":"MachRio","companyIntro":"工业品供应商","coreProducts":[]}
\`\`\`

请查收。`,
      async (raw) => raw,
    );

    expect(parsed).toMatchObject({
      companyName: "MachRio",
      companyIntro: "工业品供应商",
      coreProducts: [],
    });
  });

  it("extracts the first balanced JSON object from mixed output", async () => {
    const parsed = await parseCompanyProfileAnalysisResponse(
      `这是整理后的企业档案 {"companyName":"MachRio","targetRegions":[{"region":"欧洲","countries":["Germany"],"rationale":"现有资料显示欧洲询盘较多"}]} 结束`,
      async (raw) => raw,
    );

    expect(parsed).toMatchObject({
      companyName: "MachRio",
      targetRegions: [
        {
          region: "欧洲",
          countries: ["Germany"],
        },
      ],
    });
  });

  it("falls back to the repair callback when initial JSON is invalid", async () => {
    const repair = vi.fn(async () => `{"companyName":"MachRio","coreProducts":[]}`);

    const parsed = await parseCompanyProfileAnalysisResponse(
      `{"companyName":"MachRio","coreProducts":[,]}`,
      repair,
    );

    expect(repair).toHaveBeenCalledOnce();
    expect(parsed).toMatchObject({
      companyName: "MachRio",
      coreProducts: [],
    });
  });

  it("throws when both the raw output and repaired output stay invalid", async () => {
    await expect(
      parseCompanyProfileAnalysisResponse(
        `companyName = MachRio`,
        async () => `still not json`,
      ),
    ).rejects.toThrow("AI 返回的分析结果格式异常，请重试");
  });
});
