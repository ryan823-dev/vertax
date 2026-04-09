"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RefreshCw, Check, X, ExternalLink } from "lucide-react";

// ==================== 服务配置 ====================

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
  // === AI Provider ===
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

  // === 搜索 API ===
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
    service: "serper",
    name: "Serper",
    category: "搜索 API",
    description: "便宜的 Google 搜索 API",
    docUrl: "https://serper.dev",
    pricing: "$0.3-1/1000次",
  },

  // === 企业数据 API ===
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

  // === 政府采购 API ===
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

// ==================== 主组件 ====================

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

export default function ApiKeysPage() {
  const [configs, setConfigs] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // 加载配置
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
    } catch (error) {
      console.error("Failed to load API key configs:", error);
      toast.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (service: string, apiKey: string, apiSecret?: string) => {
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

  const getConfig = (service: string): ApiKeyConfig | undefined => {
    return configs.find((c) => c.service === service);
  };

  // 按类别分组
  const groupedServices = SERVICE_CONFIGS.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ServiceConfig[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API 密钥管理"
        description="配置第三方服务的 API 密钥，用于获客雷达和数据丰富化"
      />

      {Object.entries(groupedServices).map(([category, services]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold">{category}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((serviceConfig) => {
              const config = getConfig(serviceConfig.service);
              const isConfigured = !!config?.apiKey;
              const showKey = showKeys[serviceConfig.service];

              return (
                <Card key={serviceConfig.service} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{serviceConfig.name}</CardTitle>
                        {isConfigured ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />已配置
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />未配置
                          </Badge>
                        )}
                      </div>
                      {config && (
                        <Switch
                          checked={config.isEnabled}
                          onCheckedChange={(checked) => toggleEnabled(serviceConfig.service, checked)}
                        />
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {serviceConfig.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* API Key 输入 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>API Key</Label>
                        {serviceConfig.docUrl && (
                          <a
                            href={serviceConfig.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            获取 API Key <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey ? "text" : "password"}
                            placeholder="输入 API Key"
                            defaultValue={config?.apiKey || ""}
                            id={`key-${serviceConfig.service}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() =>
                              setShowKeys((prev) => ({
                                ...prev,
                                [serviceConfig.service]: !prev[serviceConfig.service],
                              }))
                            }
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* API Secret（如果需要）*/}
                    {serviceConfig.requiresSecret && (
                      <div className="space-y-2">
                        <Label>API Secret</Label>
                        <Input
                          type="password"
                          placeholder="输入 API Secret"
                          defaultValue={config?.apiSecret || ""}
                          id={`secret-${serviceConfig.service}`}
                        />
                      </div>
                    )}

                    {/* 配额信息 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {serviceConfig.freeQuota && (
                        <span>免费额度: {serviceConfig.freeQuota}</span>
                      )}
                      {serviceConfig.pricing && (
                        <span>价格: {serviceConfig.pricing}</span>
                      )}
                    </div>

                    {/* 使用量 */}
                    {config && config.currentUsage > 0 && (
                      <div className="text-xs text-muted-foreground">
                        本月使用: {config.currentUsage} 次
                        {config.monthlyLimit && ` / ${config.monthlyLimit} 次`}
                      </div>
                    )}

                    {/* 保存按钮 */}
                    <Button
                      className="w-full"
                      onClick={() => {
                        const keyInput = document.getElementById(
                          `key-${serviceConfig.service}`
                        ) as HTMLInputElement;
                        const secretInput = document.getElementById(
                          `secret-${serviceConfig.service}`
                        ) as HTMLInputElement;

                        saveConfig(
                          serviceConfig.service,
                          keyInput?.value || "",
                          secretInput?.value
                        );
                      }}
                      disabled={saving === serviceConfig.service}
                    >
                      {saving === serviceConfig.service ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      保存配置
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
