import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, Mail, ShieldCheck } from 'lucide-react';
import {
  GoldBadge,
  MarketingPageWrapper,
  SurfacePanel,
} from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'Terms of Service | VertaX',
  description:
    'Terms of Service for VertaX, an AI-powered global growth workspace for creating, managing, and publishing business content.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | VertaX',
    description:
      'Terms of Service for using VertaX products, services, and publishing workflows.',
    type: 'website',
    url: 'https://vertax.top/terms',
  },
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'These Terms of Service govern your access to and use of VertaX websites, applications, APIs, and related services.',
      'By accessing or using VertaX, you agree to these Terms. If you use VertaX on behalf of an organization, you represent that you are authorized to accept these Terms for that organization.',
    ],
  },
  {
    title: '2. About VertaX',
    body: [
      'VertaX provides an AI-powered workspace for business teams to organize company knowledge, create marketing and sales content, manage social media workflows, and support global growth operations.',
      'Some features may allow authorized users to connect third-party accounts and publish or schedule content to external platforms, including social media channels, subject to each platform\'s own rules and permissions.',
    ],
  },
  {
    title: '3. User Accounts and Responsibilities',
    body: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      'You agree to provide accurate information, keep your account information up to date, and use VertaX only for lawful business purposes.',
      'You are responsible for reviewing content before publishing it and for ensuring that your content complies with applicable laws, platform policies, and the rights of third parties.',
    ],
  },
  {
    title: '4. Content and Publishing',
    body: [
      'You retain ownership of the content, materials, files, and data that you submit to VertaX.',
      'You grant VertaX a limited right to host, process, transmit, display, and otherwise use your content only as needed to provide and improve the services you request.',
      'When you publish content through a connected third-party platform, the publication is also governed by that platform\'s terms, developer policies, and user permissions.',
    ],
  },
  {
    title: '5. Acceptable Use',
    body: [
      'You may not use VertaX to create, upload, transmit, or publish unlawful, harmful, deceptive, infringing, or abusive content.',
      'You may not attempt to bypass security controls, access accounts or systems without authorization, interfere with service operations, or misuse APIs and automation features.',
      'We may suspend or restrict access if we reasonably believe your use violates these Terms, applicable law, or third-party platform requirements.',
    ],
  },
  {
    title: '6. Third-Party Services',
    body: [
      'VertaX may integrate with third-party services such as authentication providers, storage providers, analytics tools, email services, and social media platforms.',
      'Your use of third-party services is subject to the terms and privacy policies of those services. VertaX is not responsible for third-party services that it does not control.',
    ],
  },
  {
    title: '7. Data and Privacy',
    body: [
      'We process personal information and business data in accordance with our privacy practices and applicable data protection laws.',
      'You are responsible for having the necessary rights, consents, and permissions for any personal information or business materials you submit to VertaX.',
    ],
  },
  {
    title: '8. Service Availability and Changes',
    body: [
      'We work to keep VertaX reliable, but we do not guarantee uninterrupted or error-free service.',
      'We may update, modify, suspend, or discontinue features from time to time, including to improve security, comply with platform policies, or maintain service quality.',
    ],
  },
  {
    title: '9. Disclaimers and Limitation of Liability',
    body: [
      'VertaX is provided on an "as is" and "as available" basis, to the extent permitted by law.',
      'We do not guarantee specific business outcomes, search rankings, social media performance, lead generation results, or platform approval decisions.',
      'To the maximum extent permitted by law, VertaX will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the services.',
    ],
  },
  {
    title: '10. Contact',
    body: [
      'If you have questions about these Terms, please contact us at contact@vertax.top.',
    ],
  },
];

export default function TermsPage() {
  return (
    <MarketingPageWrapper>
      <section className="px-4 pb-14 pt-14 sm:px-6 sm:pb-16 sm:pt-16" style={{ background: colors.bg.heroGradient }}>
        <div className="mx-auto max-w-4xl">
          <Link
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium"
            href="/"
            style={{ color: 'rgba(248, 251, 255, 0.76)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to VertaX
          </Link>
          <GoldBadge icon={<FileText className="h-3.5 w-3.5" />}>Legal</GoldBadge>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            These Terms explain the rules for using VertaX products, websites,
            connected publishing workflows, and related services.
          </p>
          <p className="mt-6 text-sm text-slate-400">Last updated: April 25, 2026</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16" style={{ background: colors.bg.primary }}>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-4">
            <SurfacePanel>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: colors.border.glow,
                    border: `1px solid ${colors.border.brand}`,
                  }}
                >
                  <ShieldCheck className="h-5 w-5" style={{ color: colors.brand.primary }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    VertaX Limited
                  </p>
                  <p className="mt-1 text-xs" style={{ color: colors.text.muted }}>
                    Official service terms
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7" style={{ color: colors.text.secondary }}>
                This page is intended to provide users and platform reviewers with
                a clear public reference for how VertaX services may be used.
              </p>
            </SurfacePanel>

            <SurfacePanel>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" style={{ color: colors.brand.primary }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Questions
                  </p>
                  <a className="mt-1 block text-sm" href="mailto:contact@vertax.top" style={{ color: colors.text.brand }}>
                    contact@vertax.top
                  </a>
                </div>
              </div>
            </SurfacePanel>
          </aside>

          <SurfacePanel>
            <div className="space-y-9">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-bold" style={{ color: colors.text.primary }}>
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {section.body.map((paragraph) => (
                      <p className="text-sm leading-7 sm:text-base" key={paragraph} style={{ color: colors.text.secondary }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </section>
    </MarketingPageWrapper>
  );
}
