#!/usr/bin/env tsx

import {
  createContactEnrichmentEngine,
  type ContactEnrichmentResult,
  type CRMContactOutput,
  type ContactSourceType,
} from '../lib/osint/contact-enrichment';
import { buildRadarContactEnrichmentOverrides } from '../lib/radar/contact-enrichment-strategy';

type ScenarioExpectation = {
  officialEmail?: boolean;
  inferredEmail?: boolean;
  bestChannel?: 'form' | 'email' | 'phone' | 'linkedin';
  minContactForms?: number;
};

type SmokeScenario = {
  key: string;
  description: string;
  target: {
    companyName: string;
    domain: string;
    country?: string;
    city?: string;
    industry?: string;
  };
  expectation: ScenarioExpectation;
};

const DEFAULT_SCENARIOS: SmokeScenario[] = [
  {
    key: 'official-email',
    description: 'Official site is expected to expose a directly sourced business email.',
    target: {
      companyName: 'KUKA',
      domain: 'kuka.com',
      country: 'DE',
      industry: 'Industrial Automation',
    },
    expectation: {
      officialEmail: true,
      minContactForms: 1,
    },
  },
  {
    key: 'form-priority',
    description: 'Official forms should win as the safest outreach channel when public email is scarce.',
    target: {
      companyName: 'FANUC America',
      domain: 'fanucamerica.com',
      country: 'US',
      industry: 'Industrial Automation',
    },
    expectation: {
      bestChannel: 'form',
      minContactForms: 1,
    },
  },
  {
    key: 'inferred-fallback',
    description: 'When no reliable public email is found, inferred role mailboxes should be considered.',
    target: {
      companyName: 'Yaskawa',
      domain: 'yaskawa.com',
      country: 'JP',
      industry: 'Industrial Automation',
    },
    expectation: {
      inferredEmail: true,
    },
  },
];

function parseArgs(argv: string[]) {
  const selectedScenarioKeys: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--scenario') {
      const key = argv[index + 1];
      if (!key) {
        throw new Error('Missing value after --scenario');
      }
      selectedScenarioKeys.push(key);
      index += 1;
      continue;
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    if (token === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return {
    selectedScenarioKeys,
    json,
  };
}

function printUsage() {
  console.log('Usage: npx tsx src/scripts/smoke-test-enrichment.ts [--scenario <key>] [--json]');
  console.log('');
  console.log('Available scenarios:');
  for (const scenario of DEFAULT_SCENARIOS) {
    console.log(`  - ${scenario.key}: ${scenario.description}`);
  }
}

function selectScenarios(keys: string[]): SmokeScenario[] {
  if (!keys.length) {
    return DEFAULT_SCENARIOS;
  }

  const selected = keys.map(key => DEFAULT_SCENARIOS.find(scenario => scenario.key === key)).filter(Boolean);
  if (selected.length !== keys.length) {
    const missing = keys.filter(key => !DEFAULT_SCENARIOS.some(scenario => scenario.key === key));
    throw new Error(`Unknown scenario key(s): ${missing.join(', ')}`);
  }

  return selected as SmokeScenario[];
}

function isOfficialSource(source: ContactSourceType): boolean {
  return source.startsWith('official_');
}

function summarizeResult(result: ContactEnrichmentResult, crmOutput: CRMContactOutput) {
  const bestChannel = result.recommendedChannels[0] || null;
  const officialEmails = result.emails.filter(email => email.sources.some(isOfficialSource));
  const inferredEmails = result.emails.filter(email => email.sources.includes('email_format_inferred'));

  return {
    company: crmOutput.company,
    website: crmOutput.official_website,
    primaryEmail: crmOutput.primary_email?.value || null,
    primaryEmailSources: crmOutput.primary_email?.sources || [],
    primaryPhone: crmOutput.primary_phone?.value || null,
    bestChannelType: bestChannel?.type || null,
    bestChannelValue: bestChannel?.value || null,
    contactForms: result.contactForms.length,
    officialEmailCount: officialEmails.length,
    inferredEmailCount: inferredEmails.length,
    allEmailValues: result.emails.map(email => ({
      value: email.value,
      confidence: email.confidence,
      sources: email.sources,
      mxValid: Boolean(email.mxValid),
    })),
    complianceNote: crmOutput.compliance_note,
    durationMs: result.duration,
  };
}

function evaluateScenario(
  scenario: SmokeScenario,
  result: ContactEnrichmentResult
) {
  const failures: string[] = [];
  const bestChannel = result.recommendedChannels[0] || null;
  const hasOfficialEmail = result.emails.some(email => email.sources.some(isOfficialSource));
  const hasInferredEmail = result.emails.some(email => email.sources.includes('email_format_inferred'));

  if (scenario.expectation.officialEmail && !hasOfficialEmail) {
    failures.push('Expected at least one official-source email.');
  }

  if (scenario.expectation.inferredEmail && !hasInferredEmail) {
    failures.push('Expected at least one inferred role-mailbox email.');
  }

  if (
    scenario.expectation.bestChannel &&
    bestChannel?.type !== scenario.expectation.bestChannel
  ) {
    failures.push(
      `Expected best channel ${scenario.expectation.bestChannel}, received ${bestChannel?.type || 'none'}.`
    );
  }

  if (
    typeof scenario.expectation.minContactForms === 'number' &&
    result.contactForms.length < scenario.expectation.minContactForms
  ) {
    failures.push(
      `Expected at least ${scenario.expectation.minContactForms} contact forms, received ${result.contactForms.length}.`
    );
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

async function runScenario(
  scenario: SmokeScenario,
  index: number,
  total: number
) {
  const engine = createContactEnrichmentEngine();
  const overrides = buildRadarContactEnrichmentOverrides({
    country: scenario.target.country,
    city: scenario.target.city,
    industry: scenario.target.industry,
    workingWebsite: scenario.target.domain,
  });

  console.log(`[${index}/${total}] ${scenario.key}`);
  console.log(`  Target: ${scenario.target.companyName} (${scenario.target.domain})`);
  console.log(`  Goal:   ${scenario.description}`);

  const result = await engine.deepEnrich(
    scenario.target.companyName,
    scenario.target.domain,
    overrides
  );
  const crmOutput = engine.generateCRMOutput(result);
  const evaluation = evaluateScenario(scenario, result);
  const summary = summarizeResult(result, crmOutput);

  console.log(`  Status: ${evaluation.ok ? 'PASS' : 'FAIL'}`);
  console.log(`  Best:   ${summary.bestChannelType || 'none'} -> ${summary.bestChannelValue || 'n/a'}`);
  console.log(`  Email:  ${summary.primaryEmail || 'none'} (${summary.primaryEmailSources.join(', ') || 'n/a'})`);
  console.log(`  Forms:  ${summary.contactForms}`);
  console.log(`  Flags:  officialEmail=${summary.officialEmailCount} inferredEmail=${summary.inferredEmailCount}`);
  console.log(`  Time:   ${summary.durationMs}ms`);

  if (!evaluation.ok) {
    for (const failure of evaluation.failures) {
      console.log(`  Issue:  ${failure}`);
    }
  }

  console.log('');

  return {
    scenario: scenario.key,
    ok: evaluation.ok,
    evaluation,
    summary,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarios = selectScenarios(args.selectedScenarioKeys);

  console.log('Contact enrichment smoke matrix');
  console.log('='.repeat(60));
  console.log('');

  const results = [];
  for (let index = 0; index < scenarios.length; index += 1) {
    results.push(await runScenario(scenarios[index], index + 1, scenarios.length));
  }

  const failed = results.filter(result => !result.ok);

  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Scenarios: ${results.length}`);
  console.log(`Passed:    ${results.length - failed.length}`);
  console.log(`Failed:    ${failed.length}`);

  if (failed.length) {
    console.log('');
    console.log('Failures');
    for (const failure of failed) {
      console.log(`- ${failure.scenario}: ${failure.evaluation.failures.join(' | ')}`);
    }
  }

  if (args.json) {
    console.log('');
    console.log(JSON.stringify(results, null, 2));
  }

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Smoke run failed:', error);
  process.exit(1);
});
