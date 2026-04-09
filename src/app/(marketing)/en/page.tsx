import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import {
  ArrowRight, Target, TrendingUp, Send,
  Brain, Megaphone, Radar,
  Globe,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'VertaX - GTM Intelligence OS for Industrial Exporters',
  description:
    'VertaX helps Chinese manufacturers and industrial companies discover, engage, and convert overseas buyers through AI-powered ICP intelligence, content generation, and outbound execution.',
  keywords: [
    'B2B lead generation',
    'industrial export',
    'overseas marketing',
    'GTM intelligence',
    'AEO',
    'GEO',
    'SEO for manufacturers',
  ],
  openGraph: {
    title: 'VertaX - GTM Intelligence OS for Industrial Exporters',
    description:
      'AI-powered global growth engine for Chinese industrial companies going overseas.',
    type: 'website',
    locale: 'en_US',
  },
  alternates: {
    languages: { 'zh-CN': '/' },
  },
};

const capabilities = [
  {
    icon: Brain,
    title: 'Knowledge Engine',
    desc: 'Ingest product docs, certifications, and case studies. AI builds a deep understanding of your capabilities.',
  },
  {
    icon: Target,
    title: 'ICP Intelligence',
    desc: 'Automatically identify ideal overseas buyer profiles — by region, industry, company size, and buying signals.',
  },
  {
    icon: TrendingUp,
    title: 'Inbound Growth',
    desc: 'Generate SEO/AEO/GEO-optimized content in multiple languages. Get discovered by buyers searching for solutions.',
  },
  {
    icon: Radar,
    title: 'Acquisition Radar',
    desc: 'Scan global business networks for companies matching your ICP. Score, rank, and surface the best opportunities.',
  },
  {
    icon: Megaphone,
    title: 'Brand Station',
    desc: 'Manage social media presence across LinkedIn, Twitter, YouTube. AI adapts content to each platform.',
  },
  {
    icon: Send,
    title: 'Outbound Execution',
    desc: 'From prospect discovery to personalized outreach emails — automate the entire pipeline with human oversight.',
  },
];

const stats = [
  { value: '11', label: 'Global Regions', desc: 'Systematic market coverage from NA to SEA' },
  { value: '6', label: 'Core Modules', desc: 'End-to-end growth loop, fully integrated' },
  { value: '24/7', label: 'AI Agent Online', desc: 'Always scanning for opportunities worldwide' },
  { value: '<1min', label: 'Docs to ICP', desc: 'Upload materials, get buyer profiles instantly' },
];

export default function EnglishLandingPage() {
  return (
    <div
      className="min-h-screen bg-[#0a0a14] text-gray-100"
      style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">VertaX</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> 中文
            </Link>
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-cyan-500 text-xs font-semibold tracking-widest uppercase mb-4">
            GTM Intelligence OS
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Turn Your Industrial Expertise
            <br />
            <span className="text-cyan-400">Into Global Pipeline</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            VertaX helps Chinese manufacturers and technology companies systematically discover,
            engage, and convert overseas buyers — powered by AI that truly understands your products.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/contact"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              Book a Demo <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/features"
              className="border border-white/10 text-gray-300 hover:text-white hover:border-white/20 px-6 py-3 rounded-lg transition-colors text-sm"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Why Most Industrial Exporters Struggle with Overseas Growth
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
            You have world-class products and manufacturing capabilities. But finding the right overseas
            buyers, creating localized content, and managing outreach across time zones and languages —
            that requires a system, not just effort.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-cyan-500 font-semibold tracking-widest uppercase mb-3">
            Core Capabilities
          </p>
          <h2 className="text-2xl font-bold text-center mb-10">
            Six Modules. One Growth Loop.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => (
              <div key={i} className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
                <c.icon className="w-6 h-6 text-cyan-400 mb-3" />
                <h3 className="text-base font-bold mb-2">{c.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center p-5 bg-[#111111] border border-white/[0.06] rounded-xl">
                <div className="text-3xl font-bold text-cyan-400 mb-1">{s.value}</div>
                <p className="text-sm font-medium text-white mb-0.5">{s.label}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to Build Your Global Growth Engine?</h2>
          <p className="text-gray-400 mb-8">
            Book a 30-minute demo. We&apos;ll show you how VertaX works with your actual product materials.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Book a Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-500 rounded flex items-center justify-center">
                <span className="text-black font-bold text-xs">V</span>
              </div>
              <span className="text-sm font-medium">VertaX</span>
            </Link>
            <span className="text-xs text-gray-600 ml-2">&copy; {new Date().getFullYear()} VERTAX LIMITED</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>contact@vertax.top</span>
            <Link href="/" className="hover:text-gray-300 transition-colors flex items-center gap-1">
              <Globe className="w-3 h-3" /> 中文版
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
