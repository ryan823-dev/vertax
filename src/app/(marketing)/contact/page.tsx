'use client';

import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone, Send, Sparkles } from 'lucide-react';
import {
  GoldBadge,
  GoldButton,
  MarketingPageWrapper,
  MetricBand,
  OutlineButton,
  SurfacePanel,
  colors,
} from '@/components/marketing/design-system';

const responseSignals = [
  {
    label: 'Response time',
    value: '1 个工作日内',
    detail: '收到表单后会尽快安排沟通。',
  },
  {
    label: 'Preparation',
    value: '按行业准备演示',
    detail: '会结合目标市场和业务场景做定向准备。',
  },
  {
    label: 'Conversation style',
    value: '先看问题，再谈方案',
    detail: '不套标准话术，先把真实需求讲清楚。',
  },
];

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <MarketingPageWrapper>
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20" style={{ background: colors.bg.heroGradient }}>
        <div className="mx-auto max-w-4xl text-center">
          <GoldBadge icon={<Sparkles className="h-3.5 w-3.5" />}>Contact VertaX</GoldBadge>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            预约演示，直接讨论你们的出海增长系统
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            我们会围绕你们的目标市场、当前流程和组织能力，给出更贴合业务的系统建议，而不是一套标准话术。
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <MetricBand dark items={responseSignals} />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: colors.bg.primary }}>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SurfacePanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.brand.primary }}>
                  Request demo
                </p>
                <h2 className="mt-3 text-2xl font-bold" style={{ color: colors.text.primary }}>
                  留下信息，我们来准备一次更像样的演示
                </h2>
              </div>
              <div
                className="hidden h-11 w-11 items-center justify-center rounded-2xl lg:flex"
                style={{
                  background: colors.border.glow,
                  border: `1px solid ${colors.border.brand}`,
                }}
              >
                <Send className="h-5 w-5" style={{ color: colors.brand.primary }} />
              </div>
            </div>

            {submitted ? (
              <div
                className="mt-6 rounded-[24px] border p-8 text-center"
                style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  borderColor: 'rgba(16, 185, 129, 0.18)',
                }}
              >
                <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: colors.data.positive }} />
                <h3 className="mt-4 text-xl font-semibold" style={{ color: colors.text.primary }}>
                  已收到你的预约信息
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: colors.text.secondary }}>
                  我们会在 1 个工作日内联系你，并根据你填写的信息提前准备行业路径样板和演示重点。
                </p>
                <button
                  className="mt-5 text-sm font-medium"
                  onClick={() => setSubmitted(false)}
                  style={{ color: colors.brand.primary }}
                  type="button"
                >
                  继续提交新的需求
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="姓名"
                    name="name"
                    onChange={handleChange}
                    placeholder="你的姓名"
                    required
                    value={formData.name}
                  />
                  <Field
                    label="公司名称"
                    name="company"
                    onChange={handleChange}
                    placeholder="公司全称"
                    required
                    value={formData.company}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="工作邮箱"
                    name="email"
                    onChange={handleChange}
                    placeholder="name@company.com"
                    required
                    type="email"
                    value={formData.email}
                  />
                  <Field
                    label="联系电话"
                    name="phone"
                    onChange={handleChange}
                    placeholder="手机或座机"
                    value={formData.phone}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="所属行业"
                    name="industry"
                    onChange={handleChange}
                    options={['制造业', '机器人 / 自动化', '工业设备', '新能源', '医疗器械', '电子 / 半导体', '其他']}
                    value={formData.industry}
                  />
                  <SelectField
                    label="团队规模"
                    name="teamSize"
                    onChange={handleChange}
                    options={['1-10 人', '11-50 人', '51-200 人', '201-500 人', '500+ 人']}
                    value={formData.teamSize}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="message" style={{ color: colors.text.primary }}>
                    你们最希望解决的问题
                  </label>
                  <textarea
                    className="min-h-[148px] w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition-colors"
                    id="message"
                    name="message"
                    onChange={handleChange}
                    placeholder="例如：目标市场、线索质量、官网内容、团队协同，或者你们希望董事会看到什么样的系统能力。"
                    style={{
                      background: colors.bg.secondary,
                      borderColor: colors.border.light,
                      color: colors.text.primary,
                    }}
                    value={formData.message}
                  />
                </div>

                <GoldButton className="w-full" icon={<Send className="h-4 w-4" />} size="large" type="submit">
                  提交预约
                </GoldButton>
                <p className="text-xs leading-6" style={{ color: colors.text.muted }}>
                  提交即表示你同意我们基于上述信息安排沟通与演示，我们不会将你的信息用于无关用途。
                </p>
              </form>
            )}
          </SurfacePanel>

          <SurfacePanel className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                你将得到什么
              </h3>
              <div className="mt-5 space-y-3">
                {[
                  '结合你们行业的 GTM 路径样板',
                  '一份更贴近当前阶段的产品与组织建议',
                  '关于部署方式、节奏与合作范围的直接判断',
                ].map((item) => (
                  <div className="flex items-start gap-2 text-sm leading-7" key={item} style={{ color: colors.text.secondary }}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: colors.data.positive }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6" style={{ borderColor: colors.border.light }}>
              <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                联系方式
              </h3>
              <div className="mt-5 space-y-4">
                <InfoItem icon={Mail} label="邮箱" value="contact@vertax.top" />
                <InfoItem icon={Phone} label="电话" value="工作日 9:00 - 18:00，预约后提供" />
                <InfoItem icon={MapPin} label="地址" value="上海，具体沟通地点在确认会议后提供" />
              </div>
            </div>

            <div
              className="rounded-[22px] border px-5 py-5"
              style={{
                background: colors.bg.tertiary,
                borderColor: colors.border.light,
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                如果你们还在评估阶段
              </h3>
              <p className="mt-3 text-sm leading-7" style={{ color: colors.text.secondary }}>
                也可以先从功能页和合作方式开始看。把方向想清楚之后，我们再进入更具体的演示和实施讨论。
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <OutlineButton dark={false} href="/features">
                  产品能力
                </OutlineButton>
                <OutlineButton dark={false} href="/pricing">
                  合作方式
                </OutlineButton>
              </div>
            </div>
          </SurfacePanel>
        </div>
      </section>
    </MarketingPageWrapper>
  );
}

function fieldBaseStyle(): React.CSSProperties {
  return {
    background: colors.bg.secondary,
    borderColor: colors.border.light,
    color: colors.text.primary,
  };
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor={name} style={{ color: colors.text.primary }}>
        {label}
      </label>
      <input
        className="w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition-colors"
        id={name}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={fieldBaseStyle()}
        type={type}
        value={value}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor={name} style={{ color: colors.text.primary }}>
        {label}
      </label>
      <select
        className="w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition-colors"
        id={name}
        name={name}
        onChange={onChange}
        style={fieldBaseStyle()}
        value={value}
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{
          background: colors.border.glow,
          border: `1px solid ${colors.border.brand}`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: colors.brand.primary }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
          {label}
        </p>
        <p className="mt-1 text-sm leading-7" style={{ color: colors.text.secondary }}>
          {value}
        </p>
      </div>
    </div>
  );
}
