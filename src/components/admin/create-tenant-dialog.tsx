"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createTenantWithAdmin } from "@/actions/admin";
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

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/[\u4e00-\u9fff]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || ""
  );
}

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [successData, setSuccessData] = useState<{
    loginUrl: string;
    email: string;
  } | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [domain, setDomain] = useState("");
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
    setDomain("");
    setAdminName("");
    setAdminEmail("");
    setPassword("");
    setError("");
    setSlugManual(false);
    setSuccessData(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!companyName.trim() || companyName.trim().length < 2) {
      setError("公司名称至少 2 个字符");
      return;
    }

    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      setError("租户标识只能包含小写字母、数字和连字符");
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
        domain: domain.trim() || undefined,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        toast.success("租户创建成功");
        if (result.loginUrl) {
          setSuccessData({
            loginUrl: result.loginUrl,
            email: adminEmail.trim().toLowerCase(),
          });
        } else {
          setOpen(false);
          resetForm();
        }
        return;
      }

      const errorMessages: Record<string, string> = {
        emailExists: "该邮箱已被使用",
        slugExists: "该租户标识已被使用",
        roleNotFound: "系统管理员角色未找到",
      };
      setError(errorMessages[result.error || ""] || "创建失败");
    } catch {
      setError("创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          创建租户
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建租户</DialogTitle>
          <DialogDescription>
            创建新的租户账户并设置管理员。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">租户名称</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="输入公司名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">租户标识</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  );
                }}
                placeholder="company-name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">套餐</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">免费版</SelectItem>
                <SelectItem value="pro">专业版</SelectItem>
                <SelectItem value="enterprise">企业版</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">外贸网站域名，可选</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) =>
                setDomain(
                  e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "")
                )
              }
              placeholder="example.com"
            />
            <p className="text-xs text-muted-foreground">
              用于记录客户官网配置以及后续站点接入。
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              管理员信息
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminName">管理员姓名</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">管理员邮箱</Label>
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
            <div className="mt-4 space-y-2">
              <Label htmlFor="password">初始密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                minLength={8}
                required
              />
            </div>
          </div>

          <DialogFooter>
            {successData ? (
              <>
                <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="mb-2 text-sm font-medium text-green-800">
                    客户账户已创建
                  </p>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>
                      登录地址：
                      <a
                        href={successData.loginUrl}
                        target="_blank"
                        rel="noopener"
                        className="font-medium underline"
                      >
                        {successData.loginUrl}
                      </a>
                    </p>
                    <p>管理员邮箱：{successData.email}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  完成
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "创建中..." : "确认创建"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
