#!/usr/bin/env tsx
// ==================== 企业背调自动化脚本 ====================
// CLI工具，用于执行企业背调调查

import { createInvestigationEngine, deepInvestigation, standardInvestigation, quickInvestigation } from '../lib/osint';
import type { CompanyInvestigationReport, CompanyInvestigationQuery } from '../lib/osint';

// ==================== CLI参数解析 ====================

interface CLIArgs {
  company: string;
  domain?: string;
  country?: string;
  depth: 'basic' | 'standard' | 'deep';
  output: 'json' | 'markdown' | 'summary';
  outputFile?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);

  const result: CLIArgs = {
    company: '',
    depth: 'standard',
    output: 'summary',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--company' || arg === '-c') {
      result.company = args[++i];
    } else if (arg === '--domain' || arg === '-d') {
      result.domain = args[++i];
    } else if (arg === '--country' || arg === '--co') {
      result.country = args[++i];
    } else if (arg === '--depth') {
      result.depth = args[++i] as 'basic' | 'standard' | 'deep';
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i] as 'json' | 'markdown' | 'summary';
    } else if (arg === '--file' || arg === '-f') {
      result.outputFile = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!result.company && !arg.startsWith('--')) {
      result.company = arg;
    }
  }

  if (!result.company) {
    console.error('错误: 必须指定企业名称');
    printHelp();
    process.exit(1);
  }

  return result;
}

function printHelp(): void {
  console.log(`
企业背调OSINT工具

用法:
  tsx osint-investigation.ts <企业名称> [选项]

选项:
  -c, --company <名称>    目标企业名称 (必需)
  -d, --domain <域名>     已知域名 (可选)
  --country <国家>        所在国家ISO代码 (可选)
  --depth <深度>          调查深度: basic | standard | deep (默认: standard)
  -o, --output <格式>     输出格式: json | markdown | summary (默认: summary)
  -f, --file <路径>       输出文件路径 (可选)
  -h, --help              显示帮助信息

调查深度说明:
  basic     - 身份层 + 注册层 (快速验证)
  standard  - 身份层 + 注册层 + 风险层 (常规背调)
  deep      - 全5层调查 (深度背调)

示例:
  # 快速背调
  tsx osint-investigation.ts "Acme Corporation"

  # 深度背调指定域名和国家
  tsx osint-investigation.ts "Acme Corp" --domain acme.com --country US --depth deep

  # 输出JSON格式
  tsx osint-investigation.ts "Acme Corp" --output json --file report.json
`);
}

// ==================== 报告生成 ====================

function generateSummary(report: CompanyInvestigationReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('企业背调报告摘要');
  lines.push('='.repeat(60));
  lines.push('');

  // 基本信息
  lines.push(`目标企业: ${report.query.companyName}`);
  if (report.query.domain) {
    lines.push(`已知域名: ${report.query.domain}`);
  }
  if (report.query.country) {
    lines.push(`所在国家: ${report.query.country}`);
  }
  lines.push(`调查深度: ${report.query.depth}`);
  lines.push(`生成时间: ${report.generatedAt.toISOString()}`);
  lines.push(`调查耗时: ${report.duration}ms`);
  lines.push('');

  // 综合评分
  lines.push('-'.repeat(40));
  lines.push('综合评估');
  lines.push('-'.repeat(40));
  lines.push(`真实性评分: ${report.authenticityScore}/100`);
  lines.push(`风险等级: ${report.overallRisk}`);
  lines.push('');

  // 关键发现
  if (report.keyFindings.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('关键发现');
    lines.push('-'.repeat(40));
    for (const finding of report.keyFindings) {
      const icon = finding.type === 'POSITIVE' ? '[+] ' :
                   finding.type === 'NEGATIVE' ? '[-] ' :
                   finding.type === 'WARNING' ? '[!] ' : '[*] ';
      lines.push(`${icon}${finding.category}: ${finding.title}`);
      if (finding.description) {
        lines.push(`    ${finding.description}`);
      }
    }
    lines.push('');
  }

  // 可疑信号
  if (report.suspiciousSignals.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('可疑信号');
    lines.push('-'.repeat(40));
    for (const signal of report.suspiciousSignals) {
      lines.push(`[?] ${signal}`);
    }
    lines.push('');
  }

  // 建议
  if (report.recommendations.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('建议行动');
    lines.push('-'.repeat(40));
    for (const rec of report.recommendations) {
      lines.push(`> ${rec}`);
    }
    lines.push('');
  }

  // 数据来源
  lines.push('-'.repeat(40));
  lines.push('数据来源');
  lines.push('-'.repeat(40));
  for (const source of report.dataSources) {
    lines.push(`- ${source}`);
  }

  return lines.join('\n');
}

function generateMarkdown(report: CompanyInvestigationReport): string {
  const lines: string[] = [];

  lines.push('# 企业背调报告');
  lines.push('');
  lines.push(`> **目标企业**: ${report.query.companyName}`);
  if (report.query.domain) {
    lines.push(`> **已知域名**: ${report.query.domain}`);
  }
  lines.push(`> **生成时间**: ${report.generatedAt.toISOString()}`);
  lines.push(`> **调查耗时**: ${report.duration}ms`);
  lines.push('');

  // 综合评估
  lines.push('## 综合评估');
  lines.push('');
  lines.push(`| 指标 | 结果 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 真实性评分 | **${report.authenticityScore}/100** |`);
  lines.push(`| 风险等级 | **${report.overallRisk}** |`);
  lines.push('');

  // 身份层
  if (report.identity) {
    lines.push('## 身份层结果');
    lines.push('');

    if (report.identity.website) {
      lines.push('### 官网信息');
      lines.push(`- URL: ${report.identity.website.url}`);
      lines.push(`- 状态: ${report.identity.website.status}`);
      if (report.identity.website.contactInfo?.emails?.length) {
        lines.push(`- 邮箱: ${report.identity.website.contactInfo.emails.join(', ')}`);
      }
      lines.push('');
    }

    if (report.identity.linkedin) {
      lines.push('### LinkedIn信息');
      lines.push(`- URL: ${report.identity.linkedin.url || '未找到'}`);
      lines.push(`- 验证: ${report.identity.linkedin.verified ? '已验证' : '未验证'}`);
      if (report.identity.linkedin.employeeCount) {
        lines.push(`- 员工数: ${report.identity.linkedin.employeeCount}`);
      }
      lines.push('');
    }
  }

  // 注册层
  if (report.registration) {
    lines.push('## 注册层结果');
    lines.push('');

    const primary = report.registration.primary;
    lines.push('### 主要注册信息');
    lines.push(`| 字段 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 注册号 | ${primary.registrationNumber} |`);
    lines.push(`| 法定名称 | ${primary.legalName} |`);
    lines.push(`| 注册国家 | ${primary.country} |`);
    lines.push(`| 经营状态 | ${primary.status} |`);
    if (primary.incorporationDate) {
      lines.push(`| 成立日期 | ${primary.incorporationDate.toISOString().split('T')[0]} |`);
    }
    if (primary.registeredCapital) {
      lines.push(`| 注册资本 | ${primary.registeredCapital.amount} ${primary.registeredCapital.currency} |`);
    }
    lines.push('');
  }

  // 风险层
  if (report.risk) {
    lines.push('## 风险层结果');
    lines.push('');

    lines.push(`### 风险评分: ${report.risk.riskScore}/100`);
    lines.push('');

    if (report.risk.records.length > 0) {
      lines.push('### 风险记录');
      lines.push('');
      for (const record of report.risk.records) {
        lines.push(`#### ${record.title}`);
        lines.push(`- 类型: ${record.type}`);
        lines.push(`- 严重程度: ${record.severity}`);
        if (record.description) {
          lines.push(`- 描述: ${record.description}`);
        }
        lines.push('');
      }
    }
  }

  // 关键发现
  if (report.keyFindings.length > 0) {
    lines.push('## 关键发现');
    lines.push('');

    for (const finding of report.keyFindings) {
      const typeEmoji = finding.type === 'POSITIVE' ? '✅' :
                        finding.type === 'NEGATIVE' ? '❌' :
                        finding.type === 'WARNING' ? '⚠️' : '📌';

      lines.push(`### ${typeEmoji} ${finding.category}: ${finding.title}`);
      if (finding.description) {
        lines.push(finding.description);
      }
      lines.push('');
    }
  }

  // 建议
  if (report.recommendations.length > 0) {
    lines.push('## 建议');
    lines.push('');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ==================== 主函数 ====================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(`开始调查: ${args.company}`);
  console.log(`调查深度: ${args.depth}`);
  console.log('');

  try {
    // 执行调查
    let report: CompanyInvestigationReport;

    switch (args.depth) {
      case 'basic':
        report = await quickInvestigation(args.company, args.domain, args.country);
        break;
      case 'standard':
        report = await standardInvestigation(args.company, args.domain, args.country);
        break;
      case 'deep':
        report = await deepInvestigation(args.company, args.domain, args.country);
        break;
      default:
        report = await standardInvestigation(args.company, args.domain, args.country);
    }

    // 生成输出
    let output: string;

    switch (args.output) {
      case 'json':
        output = JSON.stringify(report, null, 2);
        break;
      case 'markdown':
        output = generateMarkdown(report);
        break;
      case 'summary':
        output = generateSummary(report);
        break;
      default:
        output = generateSummary(report);
    }

    // 输出结果
    if (args.outputFile) {
      const fs = await import('fs/promises');
      await fs.writeFile(args.outputFile, output, 'utf-8');
      console.log(`报告已保存至: ${args.outputFile}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error('调查失败:', error);
    process.exit(1);
  }
}

// 执行
main();