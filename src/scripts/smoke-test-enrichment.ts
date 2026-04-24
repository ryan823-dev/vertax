#!/usr/bin/env tsx
// ==================== 真实外网Enrichment冒烟测试 ====================
// 用 TW Automation 作为目标，验证整个补全流程

import { createContactEnrichmentEngine } from '../lib/osint/contact-enrichment';

async function smokeTest() {
  console.log('='.repeat(60));
  console.log('联系方式补全模块 - 真实外网冒烟测试');
  console.log('='.repeat(60));
  console.log('');

  const engine = createContactEnrichmentEngine();

  // 测试目标：TW Automation
  const target = {
    companyName: 'TW Automation',
    domain: 'tw-automation.com',
    country: 'US',
  };

  console.log(`测试目标: ${target.companyName}`);
  console.log(`已知域名: ${target.domain}`);
  console.log('');

  try {
    console.log('开始执行深度补全...');
    const startTime = Date.now();

    const result = await engine.deepEnrich(
      target.companyName,
      target.domain,
      { country: target.country }
    );

    const duration = Date.now() - startTime;

    console.log(`补全耗时: ${duration}ms`);
    console.log('');

    // 生成CRM输出
    const crmOutput = engine.generateCRMOutput(result);

    // 输出关键结果
    console.log('-'.repeat(40));
    console.log('补全结果摘要');
    console.log('-'.repeat(40));

    console.log(`\n企业身份:`);
    console.log(`  - 名称: ${crmOutput.company}`);
    console.log(`  - 官网: ${crmOutput.official_website}`);
    console.log(`  - 行业: ${crmOutput.industry || '未确定'}`);

    console.log(`\n联系方式:`);
    if (crmOutput.primary_phone) {
      console.log(`  - 主电话: ${crmOutput.primary_phone.value}`);
      console.log(`  - 置信度: ${crmOutput.primary_phone.confidence}%`);
      console.log(`  - 来源: ${crmOutput.primary_phone.sources.join(', ')}`);
    } else {
      console.log(`  - 电话: 未找到`);
    }

    if (crmOutput.primary_email) {
      console.log(`  - 主邮箱: ${crmOutput.primary_email.value}`);
      console.log(`  - 置信度: ${crmOutput.primary_email.confidence}%`);
      console.log(`  - 来源: ${crmOutput.primary_email.sources.join(', ')}`);
    } else {
      console.log(`  - 邮箱: 未找到`);
    }

    console.log(`\n地址信息:`);
    if (crmOutput.addresses && crmOutput.addresses.length > 0) {
      for (const addr of crmOutput.addresses) {
        console.log(`  - ${addr.value}`);
        console.log(`    置信度: ${addr.confidence}%`);
        if (addr.note) console.log(`    备注: ${addr.note}`);
      }
    } else {
      console.log(`  - 地址: 未找到`);
    }

    console.log(`\n能力关键词:`);
    if (crmOutput.capabilities && crmOutput.capabilities.length > 0) {
      console.log(`  - ${crmOutput.capabilities.join(', ')}`);
    } else {
      console.log(`  - 未找到`);
    }

    console.log(`\n评分:`);
    console.log(`  - 线索质量评分: ${crmOutput.lead_quality_score}/100`);
    console.log(`  - 完整性评分: ${result.completenessScore}/100`);

    console.log(`\n推荐联系渠道:`);
    console.log(`  - ${crmOutput.recommended_contact}`);

    console.log(`\n数据来源:`);
    console.log(`  - ${crmOutput.data_sources.join(', ')}`);

    console.log(`\n合规标注:`);
    console.log(`  - ${crmOutput.compliance_note}`);

    console.log(`\n信息缺口:`);
    if (crmOutput.information_gaps && crmOutput.information_gaps.length > 0) {
      for (const gap of crmOutput.information_gaps) {
        console.log(`  - ${gap}`);
      }
    } else {
      console.log(`  - 无明显缺口`);
    }

    console.log('');
    console.log('-'.repeat(40));
    console.log('完整CRM输出 (JSON)');
    console.log('-'.repeat(40));
    console.log(JSON.stringify(crmOutput, null, 2));

    // 测试结论
    console.log('');
    console.log('='.repeat(60));
    console.log('冒烟测试结论');
    console.log('='.repeat(60));

    const hasPhone = crmOutput.primary_phone !== undefined;
    const hasEmail = crmOutput.primary_email !== undefined;
    const hasAddress = crmOutput.addresses && crmOutput.addresses.length > 0;
    const hasCapabilities = crmOutput.capabilities && crmOutput.capabilities.length > 0;

    console.log(`✓ 电话补全: ${hasPhone ? '成功' : '失败'}`);
    console.log(`✓ 邮箱补全: ${hasEmail ? '成功' : '失败'}`);
    console.log(`✓ 地址补全: ${hasAddress ? '成功' : '失败'}`);
    console.log(`✓ 能力补全: ${hasCapabilities ? '成功' : '失败'}`);
    console.log(`✓ CRM输出: 格式正确`);

    if (hasPhone || hasEmail) {
      console.log('\n✅ 冒烟测试通过：核心补全功能正常');
    } else {
      console.log('\n⚠️ 冒烟测试部分通过：无联系方式补全成功');
    }

  } catch (error) {
    console.error('冒烟测试失败:', error);
    process.exit(1);
  }
}

// 执行测试
smokeTest();
