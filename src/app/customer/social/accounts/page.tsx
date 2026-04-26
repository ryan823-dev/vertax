"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  TestTube,
  Save,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import {
  getSocialAccounts,
  saveSocialCredentials,
  testSocialConnection,
  deleteSocialAccountHard,
} from '@/actions/social';
import { toast } from 'sonner';

// Platform definitions
type PlatformField = { key: string; label: string; placeholder: string };
type PlatformDef = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  available: boolean;
  fields?: PlatformField[];
  helpUrl?: string;
  helpText?: string;
  comingSoonNote?: string;
  shareMode?: boolean;
  oauthMode?: boolean;
};

const PLATFORMS: PlatformDef[] = [
  {
    id: 'x',
    name: 'X (Twitter)',
    color: 'bg-slate-800',
    textColor: 'text-slate-800',
    available: true,
    fields: [
      { key: 'apiKey', label: 'API Key（开发者公钥）', placeholder: 'xxxxxxxxxxxxxxxxxxx' },
      { key: 'apiKeySecret', label: 'API Key Secret（密钥）', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'accessToken', label: '访问令牌', placeholder: 'xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'accessTokenSecret', label: '访问令牌 Secret', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
    helpUrl: 'https://developer.x.com/en/portal/dashboard',
    helpText: '前往 X 开发者平台创建应用并获取发布所需凭证。',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    available: true,
    fields: [
      { key: 'pageId', label: '页面 ID', placeholder: '123456789012345' },
      { key: 'pageAccessToken', label: '页面访问令牌', placeholder: 'EAAxxxxxxxxxxxxxxxxxx...' },
    ],
    helpUrl: 'https://developers.facebook.com/tools/explorer/',
    helpText: '在 Graph API Explorer 生成长期有效的页面访问令牌。',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'bg-blue-700',
    textColor: 'text-blue-700',
    available: true,
    shareMode: true,
    comingSoonNote: '分享模式无需配置即可发布：直接在 LinkedIn 分享弹窗里提交内容。',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: 'bg-red-600',
    textColor: 'text-red-600',
    available: true,
    oauthMode: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'bg-neutral-950',
    textColor: 'text-neutral-900',
    available: true,
    oauthMode: true,
    helpUrl: 'https://developers.tiktok.com/products/content-posting-api',
    helpText: 'TikTok 直发需完成内容发布接口与视频发布资质开通。',
  },
];

type SocialAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
};

export default function SocialAccountsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [configuringPlatform, setConfiguringPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; accountName?: string; accountId?: string; error?: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSocialAccounts();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAccounts((data || []).filter((a: any) => a.isActive) as SocialAccount[]);
    } catch {
      toast.error('加载发布渠道失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const getConnectedAccount = (platformId: string): SocialAccount | undefined => {
    return accounts.find(a => a.platform === platformId && a.isActive);
  };

  const handleStartConfig = (platformId: string) => {
    setConfiguringPlatform(platformId);
    setCredentials({});
    setTestResult(null);
    setShowFields({});
  };

  const handleCancel = () => {
    setConfiguringPlatform(null);
    setCredentials({});
    setTestResult(null);
    setShowFields({});
  };

  const handleTest = async () => {
    if (!configuringPlatform) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSocialConnection({
        platform: configuringPlatform,
        credentials,
      });
      setTestResult(result);
      if (result.success) {
        toast.success(`渠道可用，已绑定 ${result.accountName}`);
      } else {
        toast.error(result.error || '渠道校验未通过');
      }
    } catch (err) {
      setTestResult({ success: false, error: err instanceof Error ? err.message : '校验失败' });
      toast.error('渠道可用性校验失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!configuringPlatform || !testResult?.success) return;
    setIsSaving(true);
    try {
      const result = await saveSocialCredentials({
        platform: configuringPlatform,
        accountName: testResult.accountName || configuringPlatform,
        credentials: {
          ...credentials,
          accountId: testResult.accountId || '',
        },
      });
      if (result.success) {
        toast.success('通道接入已保存，回到声量枢纽即可发布');
        handleCancel();
        loadAccounts();
      } else {
        toast.error(result.error || '保存失败，请重试');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('确定要停止该渠道的发布连接吗？')) return;
    try {
      await deleteSocialAccountHard(accountId);
      toast.success('该渠道已移除，可继续用其他渠道发布');
      loadAccounts();
    } catch {
      toast.error('停止渠道失败，请稍后重试');
    }
  };

  const _maskValue = (val: string) => {
    if (val.length <= 8) return '********';
    return val.slice(0, 4) + '****' + val.slice(-4);
  };

  const isFormComplete = () => {
    if (!configuringPlatform) return false;
    const platform = PLATFORMS.find(p => p.id === configuringPlatform);
    if (!platform?.fields) return false;
    return platform.fields.every(f => credentials[f.key]?.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[var(--ci-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{
        background: 'var(--ci-sidebar-shell)',
        boxShadow: 'var(--ci-shadow-soft)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'transparent',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <KeyRound size={24} className="text-[var(--ci-accent)]" />
              发布通道接入
            </h1>
            <p className="text-sm text-slate-400 mt-1">先让关键渠道可用，再回到声量枢纽持续推进发布。</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customer/social"
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors text-slate-400 hover:text-[var(--ci-accent)]"
            >
              <ArrowLeft size={16} />
              返回声量枢纽
            </Link>
            <button
              onClick={loadAccounts}
              className="p-2 text-slate-400 hover:text-[var(--ci-accent)] transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-700 uppercase">
                  待接入
                </span>
                <p className="text-sm font-semibold text-amber-900">尚未有可发布渠道</p>
              </div>
              <p className="text-sm text-amber-800">
                先让至少一个渠道通过可用性校验，才能在声量枢纽继续推进内容发布。
              </p>
              <p className="text-xs text-amber-700">
                建议先完成 1 个渠道接入，再返回发布中心进入创建、排期、执行。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-800">
            当前可直接发布 {accounts.length} 个渠道
          </p>
        </div>
      )}

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const connected = getConnectedAccount(platform.id);
          const isConfiguring = configuringPlatform === platform.id;

          return (
            <div
              key={platform.id}
              className={`bg-[var(--ci-surface-strong)] rounded-xl border transition-all ${
                isConfiguring
                  ? 'border-[var(--ci-accent)] col-span-1 md:col-span-2 lg:col-span-3'
                  : connected
                    ? 'border-emerald-300'
                    : 'border-[var(--ci-border)]'
              }`}
            >
              <div className="p-5">
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${platform.color} rounded-xl flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">
                        {platform.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-bold ${platform.textColor}`}>{platform.name}</h3>
                      {connected && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          {connected.accountName}
                        </p>
                      )}
                    </div>
                  </div>

                  {!platform.available && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{
                    background: 'rgba(79,141,246,0.12)',
                      color: 'var(--ci-accent)',
                      border: '1px solid rgba(79,141,246,0.25)',
                    }}>
                      即将开放
                    </span>
                  )}

                  {platform.available && connected && !isConfiguring && !platform.shareMode && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <button
                        onClick={() => handleDisconnect(connected.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="移除渠道"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {platform.shareMode && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                      已接通
                    </span>
                  )}
                </div>

                {/* Share Mode Platform */}
                {platform.shareMode && (
                  <div className="mt-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <p className="text-xs font-medium text-emerald-800">分享接入，可直接用于传播</p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      发布时可直接打开分享窗口，一键带出内容，适合作为补充传播通道。
                    </p>
                  </div>
                )}

                {/* Action Button - API Keys mode */}
                {platform.available && !isConfiguring && !platform.shareMode && !platform.oauthMode && (
                  <button
                    onClick={() => handleStartConfig(platform.id)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={connected
                      ? { background: '#0B1220', color: 'var(--ci-accent)' }
                      : { background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }
                    }
                  >
                    <KeyRound size={14} />
                    {connected ? '更新接入' : '开始接入'}
                  </button>
                )}

                {/* OAuth Connect Button */}
                {platform.oauthMode && !connected && (
                  <a
                    href={`/api/oauth/${platform.id}/authorize`}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 block"
                    style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                  >
                    <ExternalLink size={14} />
                    去接通
                  </a>
                )}

                {/* OAuth Reconnect Button */}
                {platform.oauthMode && connected && (
                  <a
                    href={`/api/oauth/${platform.id}/authorize`}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 block"
                    style={{ background: '#0B1220', color: 'var(--ci-accent)' }}
                  >
                    <RefreshCw size={14} />
                    重新接通
                  </a>
                )}

                {/* Not Available Description */}
                {!platform.available && (
                  <p className="text-xs text-slate-400 mt-1">
                    {platform.comingSoonNote || '该渠道接入能力正在开发中，尽快补充中。'}
                  </p>
                )}

                {/* Configuration Form */}
                {isConfiguring && platform.fields && (
                  <div className="mt-4 pt-4 border-t border-[var(--ci-border)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {platform.fields.map((field) => (
                        <div key={field.key}>
                          <label className="text-xs text-slate-500 mb-1 block font-medium">
                            {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type={showFields[field.key] ? 'text' : 'password'}
                              value={credentials[field.key] || ''}
                              onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-2.5 border border-[var(--ci-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--ci-accent)] bg-[#FFFFFF] pr-10 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showFields[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Help Text */}
                    {platform.helpUrl && (
                      <a
                        href={platform.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 text-xs text-[var(--ci-accent)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={10} />
                        {platform.helpText}
                      </a>
                    )}

                    {/* Test Result */}
                    {testResult && (
                      <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-emerald-800">该渠道可发布</p>
                              <p className="text-xs text-emerald-600">账号名：{testResult.accountName}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-800">该渠道不可用</p>
                              <p className="text-xs text-red-600">{testResult.error}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={handleTest}
                        disabled={!isFormComplete() || isTesting}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                        style={{ background: '#0B1220', color: 'var(--ci-accent)' }}
                      >
                        {isTesting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            校验中...
                          </>
                        ) : (
                          <>
                            <TestTube size={14} />
                            校验可用性
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSave}
                        disabled={!testResult?.success || isSaving}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                        style={{ background: 'var(--ci-accent)', color: '#FFFFFF', boxShadow: '0 4px 16px -2px rgba(79,141,246,0.35)' }}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            保存并启用
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCancel}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        暂不设置
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="rounded-xl p-6 relative overflow-hidden" style={{
        background: 'var(--ci-sidebar-shell)',
        boxShadow: 'var(--ci-shadow-soft)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'transparent',
        }} />
        <div className="relative">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Globe size={18} className="text-[var(--ci-accent)]" />
              快速上手
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p>1. 先确认目标平台的发布方式：OAuth 直连或 API 直发。</p>
              <p>2. 完成接入并校验成功后，即可在首页继续推进发布。</p>
              <p>3. 将内容推进到该渠道后，先看“发布结果”再决定是否扩量到下一个渠道。</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-4">
              说明：凭证仅用于已授权内容发布，并会安全存储。
            </p>
          </div>
        </div>
    </div>
  );
}
