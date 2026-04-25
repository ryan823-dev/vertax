import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Database, Mail, ShieldCheck } from 'lucide-react';
import {
  GoldBadge,
  MarketingPageWrapper,
  SurfacePanel,
} from '@/components/marketing/design-system';
import { colors } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'Privacy Policy | VertaX',
  description:
    'Privacy Policy for VertaX, including how we collect, use, protect, and share information when users access VertaX services.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | VertaX',
    description:
      'How VertaX handles account information, business content, connected publishing workflows, and service data.',
    type: 'website',
    url: 'https://vertax.top/privacy',
  },
};

const sections = [
  {
    title: '1. Overview',
    body: [
      'This Privacy Policy explains how VertaX collects, uses, stores, and protects information when you visit our website, create an account, use our applications, connect third-party services, or interact with our support team.',
      'VertaX provides an AI-powered workspace for business teams to organize company knowledge, create marketing and sales content, manage social media workflows, and support global growth operations.',
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      'Account information, such as your name, email address, company name, role, login credentials, and account settings.',
      'Business content and files that you upload, import, generate, edit, schedule, or publish through VertaX, including documents, images, videos, drafts, brand materials, campaign information, and company knowledge assets.',
      'Connected service information, such as authorization tokens, account identifiers, profile metadata, permission scopes, publishing settings, and platform responses from third-party services that you choose to connect.',
      'Usage and technical data, such as browser type, device information, IP address, pages visited, feature usage, timestamps, logs, diagnostics, and security events.',
      'Communications data, such as messages you send to us, support requests, demo requests, feedback, and related contact history.',
    ],
  },
  {
    title: '3. How We Use Information',
    body: [
      'To provide, operate, maintain, secure, and improve VertaX products and services.',
      'To authenticate users, manage accounts, provide customer support, and communicate service-related information.',
      'To process uploaded materials, generate drafts, analyze business context, prepare publishing workflows, and perform actions that users request.',
      'To connect with third-party platforms, request user-authorized permissions, and publish or schedule content only when an authorized user initiates or configures that workflow.',
      'To monitor reliability, prevent abuse, troubleshoot issues, enforce our Terms of Service, and comply with applicable legal obligations.',
    ],
  },
  {
    title: '4. Social Media and Publishing Integrations',
    body: [
      'If you connect a social media or publishing account, VertaX uses the permissions granted by you only to provide the connected feature, such as retrieving account information, preparing post options, uploading media, publishing content, or checking publishing status.',
      'We do not publish content to a third-party platform unless an authorized user has configured, approved, scheduled, or otherwise initiated that publishing action in VertaX.',
      'You can revoke access through the relevant third-party platform settings or by disconnecting the integration in VertaX when available.',
    ],
  },
  {
    title: '5. AI Processing',
    body: [
      'VertaX may use AI models and related processing services to summarize materials, generate content drafts, classify information, support research workflows, and assist with marketing or sales operations.',
      'User-provided materials may be processed only as needed to deliver the requested functionality, maintain service quality, improve reliability, and protect against misuse.',
      'Users are responsible for reviewing AI-assisted outputs before publishing, sending, or relying on them in business decisions.',
    ],
  },
  {
    title: '6. How We Share Information',
    body: [
      'We may share information with service providers that help us operate VertaX, such as hosting, storage, database, analytics, authentication, email, security, and AI infrastructure providers.',
      'We may share information with third-party platforms that you choose to connect, only as needed to perform the action you request or authorize.',
      'We may disclose information if required by law, legal process, security obligations, or to protect the rights, safety, and integrity of VertaX, our users, or others.',
      'We do not sell personal information.',
    ],
  },
  {
    title: '7. Data Retention',
    body: [
      'We retain information for as long as needed to provide the services, maintain business records, resolve disputes, enforce agreements, meet legal obligations, and support security or audit requirements.',
      'Users may request deletion of certain account information or business content, subject to legal, security, backup, and operational limitations.',
    ],
  },
  {
    title: '8. Security',
    body: [
      'We use technical, administrative, and organizational measures designed to protect information from unauthorized access, loss, misuse, alteration, or disclosure.',
      'No internet-based service can guarantee absolute security. Users should protect their login credentials and promptly notify us of suspected unauthorized access.',
    ],
  },
  {
    title: '9. International Use',
    body: [
      'VertaX may process and store information in countries or regions where we or our service providers operate.',
      'When information is transferred internationally, we take steps intended to protect it in accordance with applicable law and this Privacy Policy.',
    ],
  },
  {
    title: '10. Your Choices',
    body: [
      'You may update account information, disconnect integrations, manage publishing permissions, or contact us to request access, correction, export, or deletion of certain information.',
      'Some information may be retained where required for legal, security, fraud prevention, backup, or legitimate business purposes.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. If we make material changes, we will update the date on this page and may provide additional notice where appropriate.',
    ],
  },
  {
    title: '12. Contact',
    body: [
      'If you have questions about this Privacy Policy or our privacy practices, please contact us at contact@vertax.top.',
    ],
  },
];

export default function PrivacyPage() {
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
          <GoldBadge icon={<ShieldCheck className="h-3.5 w-3.5" />}>Privacy</GoldBadge>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            This policy explains how VertaX handles account information,
            uploaded business materials, connected publishing workflows, and
            service data.
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
                  <Database className="h-5 w-5" style={{ color: colors.brand.primary }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    VertaX Limited
                  </p>
                  <p className="mt-1 text-xs" style={{ color: colors.text.muted }}>
                    Official privacy policy
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7" style={{ color: colors.text.secondary }}>
                This page is the public privacy reference for users, partners,
                and platform reviewers evaluating VertaX integrations.
              </p>
            </SurfacePanel>

            <SurfacePanel>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" style={{ color: colors.brand.primary }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Privacy contact
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
