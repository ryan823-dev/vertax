"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPlatformAdminRoleName } from "@/lib/permissions";
import {
  isLocalDevelopmentHostname,
  normalizeHostname,
} from "@/lib/tenant-resolver";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

function isValidVertaxRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = normalizeHostname(parsed.hostname);

    if (hostname.endsWith(`.${BASE_DOMAIN}`) && !hostname.startsWith("tower.")) {
      return true;
    }

    if (isLocalDevelopmentHostname(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resolveInternalCallback = useCallback((value: string | null) => {
    if (!value) return null;

    try {
      if (value.startsWith("/")) {
        return value;
      }

      const parsed = new URL(value);
      if (
        typeof window !== "undefined" &&
        parsed.origin === window.location.origin
      ) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const { redirectUrl, callbackPath } = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        redirectUrl: null,
        callbackPath: null,
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      redirectUrl: params.get("redirect"),
      callbackPath: resolveInternalCallback(params.get("callbackUrl")),
    };
  }, [resolveInternalCallback]);

  const isExternalRedirect = redirectUrl && isValidVertaxRedirect(redirectUrl);
  const isPlatformAdmin = isPlatformAdminRoleName(session?.user?.roleName);

  const getDefaultPostLoginUrl = useCallback(() => {
    return isPlatformAdmin ? "/tower" : "/customer/home";
  }, [isPlatformAdmin]);

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

  const navigateAfterLogin = useCallback(async () => {
    if (isExternalRedirect) {
      await handleCrossDomainRedirect();
      return;
    }

    window.location.href = callbackPath || getDefaultPostLoginUrl();
  }, [
    callbackPath,
    getDefaultPostLoginUrl,
    handleCrossDomainRedirect,
    isExternalRedirect,
  ]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    void navigateAfterLogin();
  }, [navigateAfterLogin, session, status]);

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
      setError("邮箱或密码错误，请检查后重试。");
      setLoading(false);
      return;
    }

    if (isExternalRedirect) {
      await navigateAfterLogin();
    }
  }

  return (
    <div className="customer-theme min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.16),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(15,159,110,0.08),transparent_18%),linear-gradient(180deg,var(--ci-bg)_0%,var(--ci-bg-soft)_42%,#eef5fb_100%)] text-[var(--ci-text)]">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_36%)]" />
      <div className="absolute left-[-5rem] top-[18%] h-48 w-48 rounded-full bg-[rgba(79,141,246,0.08)] blur-3xl" />
      <div className="absolute bottom-[-4rem] right-[-3rem] h-56 w-56 rounded-full bg-[rgba(15,159,110,0.07)] blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-[980px] gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-10">
          <section className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-4 self-start rounded-[28px] border border-[var(--ci-border)] bg-white/70 px-5 py-4 shadow-[0_24px_60px_-38px_rgba(15,23,38,0.22)] backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-white shadow-[0_20px_40px_-20px_rgba(79,141,246,0.72)]">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="ci-kicker">Calm Intelligence OS</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ci-text)]">
                  VertaX Workspace
                </h1>
              </div>
            </div>

            <div className="mt-8 hidden max-w-xl lg:block">
              <h2 className="text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--ci-text)]">
                欢迎回来。
              </h2>
              <p className="mt-5 text-lg leading-8 text-[var(--ci-text-secondary)]">
                登录后继续你的工作内容与 AI 协作。
              </p>
            </div>
          </section>

          <section className="ci-panel-strong rounded-[32px] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-3 py-1 text-xs font-semibold text-[var(--ci-accent-strong)]">
                  Sign In
                </span>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ci-text)]">
                  欢迎回来
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--ci-text-secondary)]">
                  输入账号信息以继续进入工作台。
                </p>
              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/82 text-[var(--ci-accent-strong)] shadow-[0_16px_34px_-22px_rgba(79,141,246,0.45)] sm:flex">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            {isExternalRedirect ? (
              <div className="ci-focus-panel mt-6 rounded-[24px] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/78 text-[var(--ci-accent-strong)]">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ci-text)]">
                      登录后将继续前往工作台
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ci-text-secondary)]">
                      认证完成后会自动回到你刚才访问的页面。
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error ? (
                <div className="rounded-[20px] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-[var(--ci-danger)]">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2.5">
                <label
                  className="text-sm font-medium text-[var(--ci-text)]"
                  htmlFor="email"
                >
                  邮箱
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="h-12 rounded-2xl border-[var(--ci-border)] bg-white/78 text-[var(--ci-text)] shadow-[0_14px_30px_-24px_rgba(15,23,38,0.18)] placeholder:text-[var(--ci-text-muted)] focus-visible:border-[var(--ci-accent)] focus-visible:ring-[rgba(79,141,246,0.18)]"
                />
              </div>

              <div className="space-y-2.5">
                <label
                  className="text-sm font-medium text-[var(--ci-text)]"
                  htmlFor="password"
                >
                  密码
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="输入你的账户密码"
                  required
                  className="h-12 rounded-2xl border-[var(--ci-border)] bg-white/78 text-[var(--ci-text)] shadow-[0_14px_30px_-24px_rgba(15,23,38,0.18)] placeholder:text-[var(--ci-text-muted)] focus-visible:border-[var(--ci-accent)] focus-visible:ring-[rgba(79,141,246,0.18)]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-base font-medium text-white shadow-[0_22px_46px_-22px_rgba(79,141,246,0.62)] transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-100"
              >
                {loading ? "正在进入工作台..." : "登录并进入工作台"}
              </Button>
            </form>

            <div className="mt-8 border-t border-[var(--ci-border)] pt-5">
              <p className="text-center text-sm text-[var(--ci-text-secondary)]">
                还没有账户？{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[var(--ci-accent-strong)] transition-colors hover:text-[var(--ci-accent)]"
                >
                  获取使用资格
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
