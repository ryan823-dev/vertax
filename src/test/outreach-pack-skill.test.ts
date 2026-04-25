import { describe, expect, it } from 'vitest';
import { outreachPackSkill } from '@/lib/skills/radar/outreach-pack';

describe('outreach pack skill', () => {
  it('injects prospect dossier and contact execution context into the prompt', () => {
    const input = {
      persona: {
        companyName: 'Acme Automation',
        industry: 'Industrial equipment',
        country: 'United States',
      },
      tier: 'A',
      prospectDossier: {
        dossier: {
          companyOverview: {
            summary: 'Acme is expanding a powder coating line in Texas.',
          },
          decisionMakerAnalysis: {
            contacts: [
              {
                name: 'Dana Lee',
                role: 'Operations Director',
                approachAngle: 'Ask about paint line downtime during expansion.',
              },
            ],
          },
          recommendedApproach: {
            talkingPoints: ['Reduce coating downtime during line expansion'],
            avoidTopics: ['Do not claim a specific output increase.'],
          },
        },
      },
      contacts: [
        {
          name: 'Dana Lee',
          role: 'Operations Director',
          email: 'dana@acme.example',
          phone: '+1 555 0100',
          source: 'radar_snapshot',
        },
      ],
      contactProfile: {
        recommendedContact: {
          type: 'email',
          value: 'dana@acme.example',
          label: 'email: dana@acme.example',
          confidence: 92,
        },
        complianceNote: 'Only public business contact points were used.',
      },
      matchReasons: ['Industrial coating expansion signal'],
      approachAngle: 'Lead with downtime reduction during expansion.',
    };

    const parsed = outreachPackSkill.inputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const prompt = outreachPackSkill.buildUserPrompt({
      input,
      mode: 'generate',
    });

    expect(prompt).toContain('Prospect Dossier (primary personalization source)');
    expect(prompt).toContain('Acme is expanding a powder coating line in Texas.');
    expect(prompt).toContain('Contact Execution Context (C1)');
    expect(prompt).toContain('Only public business contact points were used.');
    expect(prompt).toContain('Fill nested evidenceIds with D1-D7/C1 labels');
  });
});
