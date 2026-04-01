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
  X,
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
      { key: 'apiKey', label: 'API Key (Consumer Key)', placeholder: 'xxxxxxxxxxxxxxxxxxx' },
      { key: 'apiKeySecret', label: 'API Key Secret', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'accessTokenSecret', label: 'Access Token Secret', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
    helpUrl: 'https://developer.x.com/en/portal/dashboard',
    helpText: 'Visit X Developer Portal to create an app and obtain API credentials.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    available: true,
    fields: [
      { key: 'pageId', label: 'Page ID', placeholder: '123456789012345' },
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAAxxxxxxxxxxxxxxxxxx...' },
    ],
    helpUrl: 'https://developers.facebook.com/tools/explorer/',
    helpText: 'Use Graph API Explorer to generate a long-lived Page Access Token.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'bg-blue-700',
    textColor: 'text-blue-700',
    available: true,
    shareMode: true,
    comingSoonNote: 'Share URL mode - no credentials needed. Content will open LinkedIn share dialog.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: 'bg-red-600',
    textColor: 'text-red-600',
    available: true,
    oauthMode: true,
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
      toast.error('Failed to load accounts');
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
        toast.success(`Connected as ${result.accountName}`);
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err) {
      setTestResult({ success: false, error: err instanceof Error ? err.message : 'Test failed' });
      toast.error('Connection test failed');
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
        toast.success('Credentials saved');
        handleCancel();
        loadAccounts();
      } else {
        toast.error(result.error || 'Save failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await deleteSocialAccountHard(accountId);
      toast.success('Account disconnected');
      loadAccounts();
    } catch {
      toast.error('Disconnect failed');
    }
  };

  const maskValue = (val: string) => {
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
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <KeyRound size={24} className="text-[#D4AF37]" />
              Account Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">Configure social media API credentials</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customer/social"
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors text-slate-400 hover:text-[#D4AF37]"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <button
              onClick={loadAccounts}
              className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-800">
            {accounts.length} account(s) connected
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
              className={`bg-[#F7F3E8] rounded-2xl border transition-all ${
                isConfiguring
                  ? 'border-[#D4AF37] col-span-1 md:col-span-2 lg:col-span-3'
                  : connected
                    ? 'border-emerald-300'
                    : 'border-[#E8E0D0]'
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
                      background: 'rgba(212,175,55,0.12)',
                      color: '#D4AF37',
                      border: '1px solid rgba(212,175,55,0.25)',
                    }}>
                      Coming Soon
                    </span>
                  )}

                  {platform.available && connected && !isConfiguring && !platform.shareMode && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <button
                        onClick={() => handleDisconnect(connected.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Disconnect"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {platform.shareMode && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Ready
                    </span>
                  )}
                </div>

                {/* Share Mode Platform */}
                {platform.shareMode && (
                  <div className="mt-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <p className="text-xs font-medium text-emerald-800">Share URL Mode - No setup needed</p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      When publishing, content will open in a LinkedIn share dialog for one-click posting. No API credentials required.
                    </p>
                  </div>
                )}

                {/* Action Button - API Keys mode */}
                {platform.available && !isConfiguring && !platform.shareMode && !platform.oauthMode && (
                  <button
                    onClick={() => handleStartConfig(platform.id)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={connected
                      ? { background: '#0B1220', color: '#D4AF37' }
                      : { background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }
                    }
                  >
                    <KeyRound size={14} />
                    {connected ? 'Update Credentials' : 'Configure'}
                  </button>
                )}

                {/* OAuth Connect Button */}
                {platform.oauthMode && !connected && (
                  <a
                    href={`/api/oauth/${platform.id}/authorize`}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 block"
                    style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                  >
                    <ExternalLink size={14} />
                    Connect with OAuth
                  </a>
                )}

                {/* OAuth Reconnect Button */}
                {platform.oauthMode && connected && (
                  <a
                    href={`/api/oauth/${platform.id}/authorize`}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 block"
                    style={{ background: '#0B1220', color: '#D4AF37' }}
                  >
                    <RefreshCw size={14} />
                    Reconnect
                  </a>
                )}

                {/* Not Available Description */}
                {!platform.available && (
                  <p className="text-xs text-slate-400 mt-1">
                    {platform.comingSoonNote || 'API integration is under development.'}
                  </p>
                )}

                {/* Configuration Form */}
                {isConfiguring && platform.fields && (
                  <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
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
                              className="w-full px-4 py-2.5 border border-[#E8E0D0] rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] bg-[#FFFCF7] pr-10 font-mono"
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
                        className="mt-3 text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
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
                              <p className="text-sm font-medium text-emerald-800">Connected successfully</p>
                              <p className="text-xs text-emerald-600">Account: {testResult.accountName}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Connection failed</p>
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
                        style={{ background: '#0B1220', color: '#D4AF37' }}
                      >
                        {isTesting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <TestTube size={14} />
                            Test Connection
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSave}
                        disabled={!testResult?.success || isSaving}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                        style={{ background: '#D4AF37', color: '#0B1220', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.35)' }}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            Save Credentials
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCancel}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
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
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Globe size={18} className="text-[#D4AF37]" />
            Instructions
          </h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p>1. Create a developer account on the respective social media platform</p>
            <p>2. Create an application and obtain API credentials</p>
            <p>3. Enter the credentials above and click "Test Connection" to verify</p>
            <p>4. After successful verification, click "Save Credentials" to complete the setup</p>
          </div>
          <p className="text-[10px] text-slate-500 mt-4">
            Note: Credentials are securely stored and only used for authorized content publishing.
          </p>
        </div>
      </div>
    </div>
  );
}
