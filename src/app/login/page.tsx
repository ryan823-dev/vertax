"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Zap, ExternalLink, CheckCircle2 } from "lucide-react";

// Base domain for cross-platform authentication
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

function isValidVertaxRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (hostname.endsWith(`.${BASE_DOMAIN}`) && !hostname.startsWith("tower.")) {
      return true;
    }
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getTenantSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
      const subdomain = hostname.slice(0, -(BASE_DOMAIN.length + 1));
      if (subdomain && subdomain !== "tower" && subdomain !== "www") {
        return subdomain;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, []);

  const isExternalRedirect = redirectUrl && isValidVertaxRedirect(redirectUrl);
  const targetTenant = redirectUrl ? getTenantSlugFromUrl(redirectUrl) : null;

  const handleCrossDomainRedirect = useCallback(async () => {
    if (!redirectUrl || !isExternalRedirect) return;
    try {
      const response = await fetch("/api/auth/cross-platform-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: redirectUrl }),
      });
      if (response.ok) {
        const { token } = await response.json();
        const separator = redirectUrl.includes("?") ? "&" : "?";
        window.location.href = `${redirectUrl}${separator}token=${token}`;
      } else {
        window.location.href = redirectUrl;
      }
    } catch {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl, isExternalRedirect]);

  useEffect(() => {
    if (status === "authenticated" && session?.user && isExternalRedirect) {
      handleCrossDomainRedirect();
    }
  }, [status, session, isExternalRedirect, handleCrossDomainRedirect]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("邮箱或密码错误");
      setLoading(false);
    } else {
      // 登录成功，使用硬跳转强制刷新页面，让 middleware 正确检测认证状态
      if (isExternalRedirect) {
        await handleCrossDomainRedirect();
      } else {
        // 安全获取 view mode，处理可能的换行符
        const viewMode = (process.env.NEXT_PUBLIC_VIEW_MODE || '').trim().toLowerCase();
        const targetPath = viewMode === 'customer' ? '/customer/home' : '/dashboard';
        window.location.href = targetPath;
      }
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0B1220 0%, #1a1a2e 50%, #0B1220 100%)' }}>
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(212,175,55,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-[rgba(212,175,55,0.1)]" />
        <div className="absolute top-40 left-40 w-48 h-48 rounded-full border border-[rgba(212,175,55,0.08)]" />
        <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full border border-[rgba(212,175,55,0.05)]" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C5A030 100%)', boxShadow: '0 8px 32px -8px rgba(212,175,55,0.4)' }}>
                <Zap className="w-8 h-8" style={{ color: '#0B1220' }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#D4AF37' }}>VertaX</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>GTM Intelligence OS</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight" style={{ color: '#ffffff' }}>
              工业出海
              <br />
              <span style={{ color: '#D4AF37' }}>增长智能系统</span>
            </h2>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
              把海外获客做成「可计算、可复制、可审计」的增长系统
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              'AI 驱动的目标客户发现',
              '多语言内容智能生成',
              '全球市场情报分析',
              '决策驾驶舱实时洞察',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: '#D4AF37' }} />
                <span className="text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)' }} />
        
        <div className="w-full max-w-md relative z-10">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C5A030 100%)' }}>
                <Zap className="w-6 h-6" style={{ color: '#0B1220' }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#D4AF37' }}>VertaX</h1>
            </div>
          </div>

          <Card className="border-0 shadow-2xl" style={{ 
            background: 'rgba(255,255,255,0.03)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <CardHeader className="text-center pb-2">
              <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>欢迎回来</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>登录您的 VertaX 工作台</p>
            </CardHeader>
            
            <CardContent className="pt-4">
              {isExternalRedirect && targetTenant && (
                <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      登录后将跳转到 <span style={{ color: '#D4AF37' }}>{targetTenant}</span> 工作台
                    </span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>邮箱</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="h-12"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>密码</label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="h-12"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium"
                  disabled={loading}
                  style={{ 
                    background: 'linear-gradient(135deg, #D4AF37 0%, #C5A030 100%)',
                    color: '#0B1220',
                    boxShadow: '0 8px 24px -8px rgba(212,175,55,0.4)',
                    border: 'none',
                  }}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            还没有账户？{' '}
            <Link
              href="/zh-CN/register"
              className="font-medium hover:underline"
              style={{ color: '#D4AF37' }}
            >
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
