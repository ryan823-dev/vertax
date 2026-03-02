"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createTenantWithAdmin } from "@/actions/admin";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/[\u4e00-\u9fff]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "";
}

export function CreateTenantDialog() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!slugManual) {
      setSlug(generateSlug(companyName));
    }
  }, [companyName, slugManual]);

  function resetForm() {
    setCompanyName("");
    setSlug("");
    setPlan("free");
    setAdminName("");
    setAdminEmail("");
    setPassword("");
    setError("");
    setSlugManual(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!companyName.trim() || companyName.trim().length < 2) {
      setError("公司名称至少 2 个字符");
      return;
    }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      setError("标识只能包含小写字母、数字和连字符");
      return;
    }
    if (!adminName.trim()) {
      setError("请输入管理员姓名");
      return;
    }
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 个字符");
      return;
    }

    setLoading(true);
    try {
      const result = await createTenantWithAdmin({
        companyName: companyName.trim(),
        slug: slug.trim(),
        plan,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        toast.success(t("createSuccess"));
        setOpen(false);
        resetForm();
      } else {
        const errorMessages: Record<string, string> = {
          emailExists: t("emailExists"),
          slugExists: t("slugExists"),
          roleNotFound: "系统角色未找到",
        };
        setError(errorMessages[result.error || ""] || t("createError"));
      }
    } catch {
      setError(t("createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("createTenant")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTenant")}</DialogTitle>
          <DialogDescription>{t("createTenantDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t("tenantName")}</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("companyNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t("tenantSlug")}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder={t("slugPlaceholder")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">{t("tenantPlan")}</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">{t("planFree")}</SelectItem>
                <SelectItem value="pro">{t("planPro")}</SelectItem>
                <SelectItem value="enterprise">{t("planEnterprise")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("adminInfo")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminName">{t("adminName")}</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">{t("adminEmail")}</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="password">{t("initialPassword")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tc("loading") : tc("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
