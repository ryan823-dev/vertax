'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { CheckCircle2, Globe, Menu, Shield, Users, X } from 'lucide-react';
import { colors, fonts, gradients, shadows } from '@/lib/design-tokens';

export { colors, gradients, shadows };

type MetricBandItem = {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
};

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:');
}

function renderAction(
  href: string | undefined,
  className: string,
  style: React.CSSProperties,
  children: React.ReactNode,
  onClick?: () => void,
  buttonType: 'button' | 'submit' = 'button'
) {
  if (href) {
    if (isExternalHref(href)) {
      return (
        <a className={className} href={href} rel="noreferrer" style={style} target={href.startsWith('http') ? '_blank' : undefined}>
          {children}
        </a>
      );
    }

    return (
      <Link className={className} href={href} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} style={style} type={buttonType}>
      {children}
    </button>
  );
}

function getMetricColumnsClass(count: number) {
  if (count >= 4) {
    return 'md:grid-cols-2 xl:grid-cols-4';
  }

  if (count === 3) {
    return 'md:grid-cols-3';
  }

  return 'md:grid-cols-2';
}

export function MarketingNav({ showEnLink = true }: { showEnLink?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(246, 249, 252, 0.84)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border.light}`,
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-3" href="/">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black"
            style={{
              background: colors.brand.gradient,
              boxShadow: shadows.glow,
              color: colors.text.inverse,
            }}
          >
            V
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight" style={{ color: colors.text.primary }}>
              VertaX
            </span>
            <span
              className="ml-2 hidden rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:inline"
              style={{
                background: colors.border.glow,
                border: `1px solid ${colors.border.brand}`,
                color: colors.brand.primary,
              }}
            >
              Calm Intelligence
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-7 text-sm md:flex" style={{ color: colors.text.secondary }}>
          <Link className="transition-colors hover:text-[#0F172A]" href="/features">
            产品能力
          </Link>
          <Link className="transition-colors hover:text-[#0F172A]" href="/solutions">
            解决方案
          </Link>
          <Link className="transition-colors hover:text-[#0F172A]" href="/cases">
            客户案例
          </Link>
          <Link className="transition-colors hover:text-[#0F172A]" href="/about/what-is-vertax">
            关于我们
          </Link>
          <Link className="transition-colors hover:text-[#0F172A]" href="/faq">
            FAQ
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {showEnLink ? (
            <Link
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors sm:flex"
              href="/en"
              style={{ color: colors.text.secondary }}
            >
              <Globe className="h-4 w-4" />
              EN
            </Link>
          ) : null}
          <Link
            className="hidden rounded-full px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 sm:inline-flex"
            href="/contact"
            style={{
              background: colors.brand.gradient,
              boxShadow: shadows.glow,
              color: colors.text.inverse,
            }}
          >
            预约演示
          </Link>
          <button
            aria-label="打开导航菜单"
            className="rounded-full p-2 md:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            style={{ color: colors.text.primary }}
            type="button"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t px-4 py-4 md:hidden" style={{ background: colors.bg.secondary, borderColor: colors.border.light }}>
          <div className="space-y-1">
            {[
              { href: '/features', label: '产品能力' },
              { href: '/solutions', label: '解决方案' },
              { href: '/cases', label: '客户案例' },
              { href: '/about/what-is-vertax', label: '关于我们' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contact', label: '预约演示' },
            ].map((item) => (
              <Link
                className="block rounded-2xl px-3 py-3 text-sm"
                href={item.href}
                key={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: colors.text.primary }}
              >
                {item.label}
              </Link>
            ))}
            {showEnLink ? (
              <Link
                className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm"
                href="/en"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  borderColor: colors.border.light,
                  color: colors.text.secondary,
                }}
              >
                <Globe className="h-4 w-4" />
                English Version
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer
      className="px-4 py-12 sm:px-6"
      style={{
        background: colors.bg.secondary,
        borderTop: `1px solid ${colors.border.light}`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div
          className="mb-10 grid gap-8 rounded-[30px] p-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
          style={{
            background: colors.bg.elevated,
            border: `1px solid ${colors.border.light}`,
            boxShadow: shadows.sm,
          }}
        >
          <div className="space-y-4">
            <Link className="flex items-center gap-3" href="/">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black"
                style={{
                  background: colors.brand.gradient,
                  color: colors.text.inverse,
                }}
              >
                V
              </div>
              <div>
                <span className="block text-base font-bold" style={{ color: colors.text.primary }}>
                  VertaX
                </span>
                <span className="text-xs" style={{ color: colors.text.secondary }}>
                  Intelligence operating layer for global growth
                </span>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-6" style={{ color: colors.text.secondary }}>
              把知识、内容、机会发现和团队协同组织成一套真正可持续工作的增长系统。
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
              产品
            </p>
            <Link className="block" href="/features" style={{ color: colors.text.secondary }}>
              产品能力
            </Link>
            <Link className="block" href="/features/modules" style={{ color: colors.text.secondary }}>
              六大模块
            </Link>
            <Link className="block" href="/pricing" style={{ color: colors.text.secondary }}>
              合作方式
            </Link>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
              资源
            </p>
            <Link className="block" href="/solutions" style={{ color: colors.text.secondary }}>
              解决方案
            </Link>
            <Link className="block" href="/cases" style={{ color: colors.text.secondary }}>
              客户案例
            </Link>
            <Link className="block" href="/faq" style={{ color: colors.text.secondary }}>
              常见问题
            </Link>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.muted }}>
                联系
              </p>
              <p className="mt-3" style={{ color: colors.text.secondary }}>
                contact@vertax.top
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Image alt="微信公众号二维码" className="h-14 w-14 rounded-xl" height={56} src="/wechat-qr.jpg" width={56} />
                <p className="mt-2 text-[10px]" style={{ color: colors.text.muted }}>
                  公众号
                </p>
              </div>
              <div className="text-center">
                <Image alt="业务联系二维码" className="h-14 w-14 rounded-xl" height={56} src="/contact-wechat.jpg" width={56} />
                <p className="mt-2 text-[10px]" style={{ color: colors.text.muted }}>
                  业务联系
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between" style={{ color: colors.text.muted }}>
          <p>&copy; {new Date().getFullYear()} VERTAX LIMITED</p>
          <div className="flex items-center gap-4">
            <Link href="/about/what-is-vertax">关于 VertaX</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/en">English</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPageWrapper({
  children,
  showEnLink = true,
}: {
  children: React.ReactNode;
  showEnLink?: boolean;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: colors.bg.primary,
        color: colors.text.primary,
        fontFamily: fonts.primary,
      }}
    >
      <MarketingNav showEnLink={showEnLink} />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function DarkSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 py-16 sm:px-6 sm:py-20 ${className}`} style={{ background: colors.bg.darkGradient }}>
      {children}
    </section>
  );
}

export function LightSection({
  children,
  className = '',
  bg = 'primary',
}: {
  children: React.ReactNode;
  className?: string;
  bg?: 'primary' | 'secondary';
}) {
  return (
    <section
      className={`px-4 py-16 sm:px-6 sm:py-20 ${className}`}
      style={{ background: bg === 'primary' ? colors.bg.primary : colors.bg.tertiary }}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = 'center',
  dark = false,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  dark?: boolean;
}) {
  const textAlign = align === 'center' ? 'text-center' : 'text-left';
  const widthClass = align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-3xl';

  return (
    <div className={`${textAlign} mb-12 ${widthClass}`}>
      <span
        className="mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          background: dark ? 'rgba(248, 251, 255, 0.08)' : colors.border.glow,
          border: `1px solid ${dark ? 'rgba(248, 251, 255, 0.12)' : colors.border.brand}`,
          color: dark ? colors.text.inverse : colors.brand.primary,
        }}
      >
        {badge}
      </span>
      <h2 className="text-2xl font-bold sm:text-3xl lg:text-[2.2rem]" style={{ color: dark ? colors.text.inverse : colors.text.primary }}>
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-3 text-sm leading-7 sm:text-base ${align === 'center' ? 'mx-auto' : ''}`}
          style={{ color: dark ? 'rgba(248, 251, 255, 0.68)' : colors.text.secondary }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function GoldButton({
  children,
  href,
  onClick,
  className = '',
  size = 'default',
  icon,
  type = 'button',
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: 'default' | 'large';
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
}) {
  const sizeClasses = size === 'large' ? 'px-7 py-3.5 text-base rounded-2xl' : 'px-5 py-2.5 text-sm rounded-full';

  return renderAction(
    href,
    `inline-flex items-center justify-center gap-2 font-semibold transition-all hover:-translate-y-0.5 ${sizeClasses} ${className}`,
    {
      background: colors.brand.gradient,
      boxShadow: size === 'large' ? shadows.glowLg : shadows.glow,
      color: colors.text.inverse,
    },
    <>
      {children}
      {icon}
    </>,
    onClick,
    type
  );
}

export function OutlineButton({
  children,
  href,
  onClick,
  className = '',
  dark = true,
  type = 'button',
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  dark?: boolean;
  type?: 'button' | 'submit';
}) {
  return renderAction(
    href,
    `inline-flex items-center justify-center gap-2 border font-medium transition-all hover:-translate-y-0.5 px-5 py-2.5 text-sm rounded-full ${className}`,
    {
      background: dark ? 'rgba(248, 251, 255, 0.04)' : 'rgba(255, 255, 255, 0.76)',
      borderColor: dark ? 'rgba(248, 251, 255, 0.18)' : colors.border.medium,
      boxShadow: dark ? undefined : shadows.sm,
      color: dark ? colors.text.inverse : colors.text.primary,
    },
    children,
    onClick,
    type
  );
}

export function Card({
  children,
  className = '',
  dark = false,
  glowBorder = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  glowBorder?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-6 ${className}`}
      style={{
        background: dark ? 'rgba(248, 251, 255, 0.06)' : colors.bg.elevated,
        borderColor: glowBorder ? colors.border.brand : dark ? 'rgba(248, 251, 255, 0.12)' : colors.border.light,
        boxShadow: dark ? shadows.card : shadows.sm,
      }}
    >
      {children}
    </div>
  );
}

export function SurfacePanel({
  children,
  className = '',
  dark = false,
  glowBorder = false,
  padding = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  glowBorder?: boolean;
  padding?: 'default' | 'compact';
}) {
  const paddingClass = padding === 'compact' ? 'p-4 sm:p-5' : 'p-6 sm:p-7';

  return (
    <div
      className={`rounded-[30px] border ${paddingClass} ${className}`}
      style={{
        background: dark ? 'rgba(248, 251, 255, 0.06)' : colors.bg.elevated,
        borderColor: glowBorder ? colors.border.brand : dark ? 'rgba(248, 251, 255, 0.12)' : colors.border.light,
        boxShadow: dark ? shadows.card : shadows.md,
      }}
    >
      {children}
    </div>
  );
}

export function MetricBand({
  items,
  className = '',
  dark = false,
}: {
  items: MetricBandItem[];
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`grid overflow-hidden rounded-[26px] border ${getMetricColumnsClass(items.length)} ${className}`}
      style={{
        background: dark ? 'rgba(248, 251, 255, 0.06)' : colors.bg.elevated,
        borderColor: dark ? 'rgba(248, 251, 255, 0.12)' : colors.border.light,
        boxShadow: dark ? shadows.card : shadows.sm,
      }}
    >
      {items.map((item, index) => (
        <div
          className={`px-5 py-5 sm:px-6 ${index > 0 ? 'border-t md:border-t-0 md:border-l' : ''}`}
          key={`${item.label}-${index}`}
          style={{
            borderColor: dark ? 'rgba(248, 251, 255, 0.1)' : colors.border.light,
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: dark ? 'rgba(248, 251, 255, 0.55)' : colors.text.muted }}
          >
            {item.label}
          </p>
          <div className="mt-3 text-lg font-semibold sm:text-xl" style={{ color: dark ? colors.text.inverse : colors.text.primary }}>
            {item.value}
          </div>
          {item.detail ? (
            <p className="mt-2 text-sm leading-6" style={{ color: dark ? 'rgba(248, 251, 255, 0.72)' : colors.text.secondary }}>
              {item.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function GoldBadge({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
      style={{
        background: colors.border.glow,
        border: `1px solid ${colors.border.brand}`,
        color: colors.brand.primary,
      }}
    >
      {icon}
      {children}
    </div>
  );
}

export function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: colors.text.secondary }}>
      <span className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" style={{ color: colors.data.positive }} />
        面向制造业与工业品企业
      </span>
      <span className="flex items-center gap-2">
        <Shield className="h-4 w-4" style={{ color: colors.brand.secondary }} />
        数据安全与协同可控
      </span>
      <span className="flex items-center gap-2">
        <Users className="h-4 w-4" style={{ color: colors.brand.primary }} />
        用系统化方式替代零散增长动作
      </span>
    </div>
  );
}

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: gradients.mesh }}>
      <div
        className="absolute inset-0"
        style={{
          background: gradients.grid,
          backgroundSize: '56px 56px',
          opacity: 0.75,
        }}
      />
    </div>
  );
}

export function GlowEffect({ color = 'primary' }: { color?: 'primary' | 'accent' }) {
  return (
    <div
      className="absolute h-44 w-44 rounded-full blur-3xl"
      style={{
        background: color === 'primary' ? colors.brand.glow : colors.brand.glowAccent,
        opacity: 0.18,
      }}
    />
  );
}
