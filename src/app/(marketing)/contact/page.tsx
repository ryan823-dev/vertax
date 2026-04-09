'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    teamSize: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold tracking-tight">VertaX</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">首页</Link>
            <a href="/features" className="text-gray-400 hover:text-white transition-colors">功能</a>
            <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">合作方案</a>
            <a href="/about" className="text-gray-400 hover:text-white transition-colors">关于</a>
            <a href="/contact" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
              预约演示
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            联系<span className="text-cyan-400">我们</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            预约演示，获取您行业的 GTM 路径样板与 ICP 示例。
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold mb-6">预约演示</h2>
            {submitted ? (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">提交成功</h3>
                <p className="text-gray-400 mb-6">
                  感谢您的咨询！我们会在 1 个工作日内与您联系，安排产品演示与商务洽谈。
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  提交新的咨询
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    姓名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="您的姓名"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium mb-2">
                    公司名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="公司全称"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      工作邮箱 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">
                      联系电话
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="手机号码"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium mb-2">
                      所属行业
                    </label>
                    <select
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    >
                      <option value="">请选择行业</option>
                      <option value="manufacturing">制造业</option>
                      <option value="robotics">机器人/自动化</option>
                      <option value="industrial">工业设备</option>
                      <option value="energy">新能源</option>
                      <option value="medical">医疗器械</option>
                      <option value="electronics">电子/半导体</option>
                      <option value="automotive">汽车零部件</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="teamSize" className="block text-sm font-medium mb-2">
                      团队规模
                    </label>
                    <select
                      id="teamSize"
                      name="teamSize"
                      value={formData.teamSize}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    >
                      <option value="">请选择</option>
                      <option value="1-10">1-10 人</option>
                      <option value="11-50">11-50 人</option>
                      <option value="51-200">51-200 人</option>
                      <option value="201-500">201-500 人</option>
                      <option value="500+">500+ 人</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    需求描述
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                    placeholder="请简要描述您的需求，如目标市场、当前获客挑战、期望解决的问题等"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  提交 <Send className="w-4 h-4" />
                </button>
                <p className="text-xs text-gray-500 text-center">
                  提交即表示您同意我们的隐私政策，我们不会泄露您的个人信息。
                </p>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-bold mb-6">联系方式</h2>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-bold mb-1">邮箱</h3>
                  <p className="text-sm text-gray-400">contact@vertax.top</p>
                  <p className="text-xs text-gray-500 mt-1">商务咨询、产品演示、技术支持</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-bold mb-1">电话</h3>
                  <p className="text-sm text-gray-400">400-xxx-xxxx（工作日 9:00-18:00）</p>
                  <p className="text-xs text-gray-500 mt-1">紧急需求请拨打</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-bold mb-1">地址</h3>
                  <p className="text-sm text-gray-400">
                    上海市青浦区<br />
                    （具体地址预约后提供）
                  </p>
                </div>
              </div>
            </div>

            {/* What to Expect */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-base font-bold mb-4">预约后您将获得</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>30-45 分钟产品演示，了解 VertaX 核心功能</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>您行业的 GTM 路径样板与 ICP 示例</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>定制化配置方案与报价</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>14 天试用账号（如适用）</span>
                </li>
              </ul>
            </div>
          </div>
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
            <span className="text-xs text-gray-600 ml-2">© {new Date().getFullYear()} VERTAX LIMITED</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>contact@vertax.top</span>
            <a href="https://tower.vertax.top" className="hover:text-gray-300 transition-colors">管理后台</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
