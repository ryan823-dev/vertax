"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RefreshCw, Check, X, ExternalLink } from "lucide-react";

// ==================== Service Configs ====================

interface ServiceConfig {
  service: string;
  name: string;
  category: string;
  description: string;
  requiresSecret?: boolean;
  docUrl?: string;
  freeQuota?: string;
  pricing?: string;
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  // AI Provider
  {
    service: "dashscope",
    name: "DashScope (千问百炼)",
    category: "AI Provider",
    description: "阿里云 AI 服务，主要 AI 提供商",
    docUrl: "https://dashscope.console.aliyun.com/",
    freeQuota: "有免费额度",
  },
  {
    service: "openrouter",
    name: "OpenRouter",
    category: "AI Provider",
    description: "多模型聚合 API，备用 AI 提供商",
    docUrl: "https://openrouter.ai/keys",
    freeQuota: "按模型计费",
  },
  {
    service: "gemini",
    name: "Google Gemini",
    category: "AI Provider",
    description: "Google AI 服务，用于 Lead Discovery",
    docUrl: "https://aistudio.google.com/apikey",
    freeQuota: "有免费额度",
  },
  // Search API
  {
    service: "brave_search",
    name: "Brave Search",
    category: "搜索 API",
    description: "隐私优先的搜索 API，B2B 发现",
    docUrl: "https://brave.com/search/api/",
    freeQuota: "2000次/月",
    pricing: "$5/1000次",
  },
  {
    service: "tavily",
    name: "Tavily",
    category: "搜索 API",
    description: "AI 原生搜索，专为 RAG 和 Agent 设计",
    docUrl: "https://tavily.com",
    freeQuota: "1000次/月",
    pricing: "$8/1000次",
  },
  {
    service: "exa",
    name: "Exa",
    category: "搜索 API",
    description: "神经语义搜索，研究友好",
    docUrl: "https://exa.ai",
    freeQuota: "1000次/月",
    pricing: "$1.5/1000次",
  },
  {
    service: "firecrawl",
    name: "Firecrawl",
    category: "网页抓取",
    description: "LLM-ready web scraping and extraction",
    docUrl: "https://www.firecrawl.dev/",
    freeQuota: "按套餐计费",
  },
  {
    service: "serper",
    name: "Serper",
    category: "搜索 API",
    description: "便宜的 Google 搜索 API",
    docUrl: "https://serper.dev",
    pricing: "$0.3-1/1000次",
  },
  // Enterprise Data
  {
    service: "google_places",
    name: "Google Places",
    category: "企业数据",
    description: "Google Maps 企业发现 API",
    docUrl: "https://console.cloud.google.com/apis/credentials",
    freeQuota: "$200/月额度",
  },
  {
    service: "hunter",
    name: "Hunter.io",
    category: "企业数据",
    description: "邮箱查找和验证",
    docUrl: "https://hunter.io/api-keys",
    freeQuota: "25次/月",
    pricing: "$49/月起",
  },
  {
    service: "pdl",
    name: "People Data Labs",
    category: "企业数据",
    description: "联系人和公司数据丰富化",
    docUrl: "https://www.peopledatalabs.com/dashboard",
    pricing: "按查询计费",
  },
  {
    service: "apollo",
    name: "Apollo.io",
    category: "企业数据",
    description: "公司+联系人数据丰富化",
    docUrl: "https://app.apollo.io/#/settings/integrations/api",
    freeQuota: "50次/月",
  },
  {
    service: "skrapp",
    name: "Skrapp.io",
    category: "企业数据",
    description: "LinkedIn 邮箱查找",
    docUrl: "https://skrapp.io/dashboard/api",
    freeQuota: "100次/月",
  },
  // Government
  {
    service: "sam_gov",
    name: "SAM.gov",
    category: "政府采购",
    description: "美国联邦政府采购",
    docUrl: "https://sam.gov",
    freeQuota: "免费（需注册）",
  },
  {
    service: "ungm",
    name: "UNGM",
    category: "政府采购",
    description: "联合国采购平台",
    docUrl: "https://developer.ungm.org/",
    requiresSecret: true,
  },
];

// ==================== Types ====================

interface ApiKeyConfig {
  id: string;
  service: string;
  apiKey: string | null;
  apiSecret: string | null;
  isEnabled: boolean;
  lastUsedAt: string | null;
  monthlyLimit: number | null;
  currentUsage: number;
  usageResetAt: string | null;
  notes: string | null;
}

// ==================== Main Component ====================

export default function TowerApiKeysPage() {
  const [configs, setConfigs] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch("/api/admin/api-keys");
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      }
    } catch {
      toast.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (
    service: string,
    apiKey: string,
    apiSecret?: string
  ) => {
    setSaving(service);
    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, apiKey, apiSecret }),
      });
      if (response.ok) {
        toast.success(`${service} 配置已保存`);
        loadConfigs();
      } else {
        toast.error("保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = async (service: string, isEnabled: boolean) => {
    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, isEnabled }),
      });
      if (response.ok) {
        toast.success(`${service} 已${isEnabled ? "启用" : "禁用"}`);
        loadConfigs();
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const getConfig = (service: string) =>
    configs.find((c) => c.service === service);

  const grouped = SERVICE_CONFIGS.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, ServiceConfig[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const configuredCount = configs.filter((c) => c.apiKey).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API 密钥管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          配置第三方服务密钥 · 已配置 {configuredCount}/{SERVICE_CONFIGS.length} 个服务
        </p>
      </div>

      {Object.entries(grouped).map(([category, services]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((sc) => {
              const config = getConfig(sc.service);
              const isConfigured = !!config?.apiKey;
              const showKey = showKeys[sc.service];

              return (
                <div
                  key={sc.service}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-gray-900">
                          {sc.name}
                        </span>
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">
                            <Check className="h-2.5 w-2.5" />
                            已配置
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                            <X className="h-2.5 w-2.5" />
                            未配置
                          </span>
                        )}
                      </div>
                      {config && (
                        <Switch
                          checked={config.isEnabled}
                          onCheckedChange={(checked) =>
                            toggleEnabled(sc.service, checked)
                          }
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {sc.description}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">API Key</Label>
                        {sc.docUrl && (
                          <a
                            href={sc.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                          >
                            获取 <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey ? "text" : "password"}
                            placeholder="输入 API Key"
                            defaultValue={config?.apiKey || ""}
                            id={`key-${sc.service}`}
                            className="text-xs h-9"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() =>
                              setShowKeys((prev) => ({
                                ...prev,
                                [sc.service]: !prev[sc.service],
                              }))
                            }
                          >
                            {showKey ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {sc.requiresSecret && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Secret</Label>
                        <Input
                          type="password"
                          placeholder="输入 API Secret"
                          defaultValue={config?.apiSecret || ""}
                          id={`secret-${sc.service}`}
                          className="text-xs h-9"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        {sc.freeQuota && <span>免费: {sc.freeQuota}</span>}
                        {sc.pricing && <span>价格: {sc.pricing}</span>}
                        {config && config.currentUsage > 0 && (
                          <span>
                            本月: {config.currentUsage}次
                            {config.monthlyLimit &&
                              ` / ${config.monthlyLimit}次`}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const keyEl = document.getElementById(
                            `key-${sc.service}`
                          ) as HTMLInputElement;
                          const secretEl = document.getElementById(
                            `secret-${sc.service}`
                          ) as HTMLInputElement;
                          saveConfig(
                            sc.service,
                            keyEl?.value || "",
                            secretEl?.value
                          );
                        }}
                        disabled={saving === sc.service}
                      >
                        {saving === sc.service ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        保存
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
