"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, ExternalLink } from "lucide-react";

// Base domain for cross-platform authentication
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

/**
 * Check if a redirect URL is a valid Vertax subdomain
 */
function isValidVertaxRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    // Allow subdomains of the base domain (but not tower.*)
    if (hostname.endsWith(`.${BASE_DOMAIN}`) && !hostname.startsWith("tower.")) {
      return true;
    }
    
    // Allow localhost for development
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract tenant slug from a Vertax subdomain URL
 */
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
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect");
  const isExternalRedirect = redirectUrl && isValidVertaxRedirect(redirectUrl);
  const targetTenant = redirectUrl ? getTenantSlugFromUrl(redirectUrl) : null;

  // If already logged in and there's a valid redirect, handle it
  useEffect(() => {
    if (status === "authenticated" && session?.user && isExternalRedirect) {
      // User is already logged in, redirect to target with token
      handleCrossDomainRedirect();
    }
  }, [status, session, isExternalRedirect]);

  async function handleCrossDomainRedirect() {
    if (!redirectUrl || !isExternalRedirect) return;
    
    try {
      // Generate cross-platform token via API
      const response = await fetch("/api/auth/cross-platform-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: redirectUrl }),
      });
      
      if (response.ok) {
        const { token } = await response.json();
        // Redirect with token in query parameter (will be exchanged for cookie on Vertax side)
        const separator = redirectUrl.includes("?") ? "&" : "?";
        window.location.href = `${redirectUrl}${separator}token=${token}`;
      } else {
        // Fallback: redirect without token (will prompt login again on Vertax)
        window.location.href = redirectUrl;
      }
    } catch {
      // Fallback: redirect without token
      window.location.href = redirectUrl;
    }
  }

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
      setError(t("invalidCredentials"));
      setLoading(false);
    } else {
      // Successfully logged in
      if (isExternalRedirect) {
        // Cross-domain redirect to Vertax subdomain
        await handleCrossDomainRedirect();
      } else {
        // Determine redirect based on current domain
        const hostname = window.location.hostname;
        const isTowerDomain = hostname === "tower.vertax.top" || hostname === "tower.vertax.cn";
        const isVercelPreview = hostname.includes("vercel.app");
        const isCustomerDomain = hostname.endsWith(".vertax.top") && !isTowerDomain;
        
        // Customer view → /c/home, Operations view (tower or vercel preview) → /dashboard
        const targetPath = isCustomerDomain ? "/zh-CN/c/home" : "/zh-CN/dashboard";
        router.push(targetPath);
        router.refresh();
      }
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Show redirect notice if redirecting to Vertax */}
        {isExternalRedirect && targetTenant && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>
                {t("redirectNotice") || `登录后将跳转到 ${targetTenant} 工作台`}
              </span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("loginButton")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/zh-CN/register"
          className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("register")}
        </Link>
      </CardFooter>
    </Card>
  );
}
