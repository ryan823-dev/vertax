const { PrismaClient } = require('./src/generated/prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.radarCandidate.findMany({
    where: {
      tenantId: 'cmmanspb30000anfp2ldflrov',
      status: { in: ['QUALIFIED', 'NEW'] },
    },
    orderBy: [
      { qualifyTier: 'asc' },
      { qualifyScore: 'desc' },
    ],
    select: {
      id: true,
      displayName: true,
      industry: true,
      country: true,
      website: true,
      phone: true,
      description: true,
      qualifyTier: true,
      qualifyScore: true,
      status: true,
      sourceName: true,
      sourceUrl: true,
      createdAt: true,
    },
  });

  // 按等级分组
  const tierA = candidates.filter(c => c.qualifyTier === 'A');
  const tierB = candidates.filter(c => c.qualifyTier === 'B');
  const tierC = candidates.filter(c => c.qualifyTier === 'C');
  const noTier = candidates.filter(c => !c.qualifyTier);

  let md = `# 获客雷达候选客户清单

> 生成时间：${new Date().toLocaleString('zh-CN')}
> 总数：${candidates.length} 个
> A级：${tierA.length} | B级：${tierB.length} | C级：${tierC.length} | 未评级：${noTier.length}

---

`;

  const formatCandidate = (c, idx) => {
    return `### ${idx + 1}. ${c.displayName}

| 属性 | 值 |
|------|-----|
| 等级 | **${c.qualifyTier || '未评级'}** (${c.qualifyScore || 0}分) |
| 行业 | ${c.industry || '未知'} |
| 国家 | ${c.country || '未知'} |
| 网站 | ${c.website ? `[${c.website}](${c.website})` : '无'} |
| 电话 | ${c.phone || '无'} |
| 来源 | ${c.sourceName || '未知'} |
| 状态 | ${c.status} |

${c.description ? `**简介：** ${c.description.slice(0, 200)}${c.description.length > 200 ? '...' : ''}` : ''}

---

`;
  };

  if (tierA.length > 0) {
    md += `## 🔥 A级客户 (${tierA.length}个)\n\n`;
    tierA.forEach((c, i) => {
      md += formatCandidate(c, i);
    });
  }

  if (tierB.length > 0) {
    md += `## ⭐ B级客户 (${tierB.length}个)\n\n`;
    tierB.forEach((c, i) => {
      md += formatCandidate(c, i);
    });
  }

  if (tierC.length > 0) {
    md += `## 📋 C级客户 (${tierC.length}个)\n\n`;
    tierC.forEach((c, i) => {
      md += formatCandidate(c, i);
    });
  }

  if (noTier.length > 0) {
    md += `## 📝 未评级 (${noTier.length}个)\n\n`;
    noTier.forEach((c, i) => {
      md += formatCandidate(c, i);
    });
  }

  fs.writeFileSync('e:/2026工作/获客雷达候选客户.md', md, 'utf8');
  console.log(`已导出 ${candidates.length} 个候选到 获客雷达候选客户.md`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
