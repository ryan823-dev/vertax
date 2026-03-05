"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Clock, 
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send, 
  RefreshCw,
  Loader2,
  ChevronRight,
  Zap,
  Target,
} from 'lucide-react';
import { useRoleContext } from '@/contexts/role-context';
import { DISPLAY_MODES } from '@/lib/constants';
import {
  getDashboardStats,
  getPendingActions,
  getTenantInfo,
  generateAIBriefing,
  type DashboardStats,
  type PendingAction,
  type TenantInfo,
  type AIBriefing,
} from '@/actions/dashboard';
import {
  createConversation,
  sendMessage,
  type MessageData,
} from '@/actions/chat';

// ============================================
// 快捷指令（动词开头，更紧凑）
// ============================================
const quickCommands = [
  { label: '一分钟汇报', icon: Clock, recommended: true },
  { label: '本周战果', icon: TrendingUp },
  { label: '商机概览', icon: Target },
  { label: '待您审批', icon: CheckCircle2 },
  { label: '增长瓶颈', icon: AlertTriangle },
];

// ============================================
// 主页面
// ============================================
export default function CEOCockpitPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Chat
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // 从 RoleContext 读取角色与显示模式
  const { displayMode, isDecider } = useRoleContext();
  const isSecretaryMode = displayMode === DISPLAY_MODES.SECRETARY;

  // ============================================
  // 数据加载
  // ============================================
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, actionsData, tenantData, briefingData] = await Promise.all([
        getDashboardStats(),
        getPendingActions(),
        getTenantInfo(),
        generateAIBriefing().catch(() => null),
      ]);
      setStats(statsData);
      setActions(actionsData);
      setTenantInfo(tenantData);
      if (briefingData) setBriefing(briefingData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Chat
  // ============================================
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    setIsSending(true);
    const content = inputValue;
    setInputValue('');

    try {
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(content.slice(0, 20) + '...');
        convId = conv.id;
        setConversationId(convId);
      }
      const response = await sendMessage(convId, content);
      setMessages(prev => [...prev, 
        { id: `user-${Date.now()}`, conversationId: convId!, role: 'user', content, createdAt: new Date() },
        response
      ]);
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, conversationId]);

  const handleQuickCommand = (label: string) => {
    setInputValue(label);
  };

  // ============================================
  // 渲染
  // ============================================
  return (
    <div className="min-h-full bg-cream">
      <div className="max-w-[1720px] mx-auto">
        {/* 主内容区：9:3 栅格 */}
        <div className="grid grid-cols-12 gap-5">
          {/* 左侧：驾驶舱主容器（8栏） */}
          <main className="col-span-12 lg:col-span-8 xl:col-span-9">
            {/* CEO驾驶舱大容器 - 增加高度 */}
            <div className="cockpit-container-v2 p-6 lg:p-7">
              {/* 容器头部 */}
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-navy-elevated rounded-xl flex items-center justify-center border border-[var(--border-navy)]">
                    <ChevronRight size={16} className="text-gold" />
                  </div>
                  <div>
                    <h1 className="text-light text-xl font-bold tracking-tight">
                      VertaX AI · <span className="text-gold">出海获客智能体</span>
                    </h1>
                    <p className="text-light-muted text-xs flex items-center gap-2 mt-1">
                      <span className="status-dot status-dot-success" />
                      AI驱动 · 全球市场情报 · 智能外贸决策
                    </p>
                  </div>
                </div>
                <button 
                  onClick={loadData}
                  className="flex items-center gap-2 px-3 py-1.5 text-light-muted hover:text-light border border-[var(--border-navy)] rounded-lg transition-colors text-xs"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  <span>{lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </button>
              </div>

              {/* 主内容区：左侧快报 + 右侧指令 */}
              <div className="flex gap-5 relative z-10">
                {/* CEO专属增长快报（奶油白卡片）- 更大更突出 */}
                <div className="flex-1 report-card-v2 p-5 lg:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={18} className="text-gold" />
                    <h2 className="text-dark font-bold text-base">CEO专属增长快报</h2>
                    <span className="ml-auto text-dark-muted text-xs font-tabular">
                      {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* 核心结论 - 三段式结构 */}
                      <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
                        <span className="text-dark-secondary text-sm font-medium pt-0.5">核心结论</span>
                        <p className="text-dark text-[15px] leading-relaxed">
                          {briefing?.summary || (
                            <>推进正常：资料结构化与内容校正进入关键阶段；站点与社媒数据接入中。</>
                          )}
                        </p>
                      </div>
                      
                      {/* 关键成果 */}
                      <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-dark-secondary text-sm font-medium">关键成果</span>
                          <span className="badge-gold text-[9px] py-0.5 px-1.5">V0.2</span>
                        </div>
                        <div className="space-y-2">
                          {briefing?.highlights?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[15px] text-dark">
                              <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </div>
                          )) || (
                            <>
                              <div className="flex items-start gap-2 text-[15px] text-dark">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>已生成内容草稿 <span className="text-gold font-semibold">1 篇</span>（待你确认 1 篇）</span>
                              </div>
                              <div className="flex items-start gap-2 text-[15px] text-dark">
                                <CheckCircle2 size={15} className="text-success mt-0.5 shrink-0" />
                                <span>已完成知识结构化：OfferingCard 1 项、ProofCard 1 项...</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 当前阻塞点 - 更明显的警示块 */}
                      <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
                        <span className="text-dark-secondary text-sm font-medium pt-1">阻塞卡点</span>
                        <div className="space-y-2">
                          {actions.length > 0 ? actions.slice(0, 2).map((action, idx) => (
                            <div key={idx} className="alert-block-warning p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-dark text-sm font-medium">{action.title}</p>
                                  <p className="text-dark-muted text-xs mt-0.5">影响：{action.module}</p>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <>
                              <div className="alert-block-warning p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-dark text-sm font-medium">渠道授权未完成</p>
                                    <p className="text-dark-muted text-xs mt-0.5">影响：LinkedIn 自动发布排程已挂起</p>
                                  </div>
                                </div>
                              </div>
                              <div className="alert-block-danger p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-dark text-sm font-medium">关键参数缺失</p>
                                    <p className="text-dark-muted text-xs mt-0.5">影响 2 项选型指南生成精度</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 右侧快捷指令区 - 更紧凑 */}
                <div className="w-36 space-y-1.5 shrink-0">
                  <p className="text-light-muted text-xs mb-2 px-1">快捷预案</p>
                  {quickCommands.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => handleQuickCommand(cmd.label)}
                      className="btn-cockpit-v2 flex items-center gap-2"
                    >
                      {cmd.recommended && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                      <cmd.icon size={13} />
                      <span className="truncate">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 底部大输入框 - 更高更气派 */}
              <div className="mt-5 relative z-10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="董事长您请吩咐：想查看本周商机、内容进度，或需要我给出下一步建议？"
                    className="input-cockpit-v2 flex-1"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending}
                    className="btn-gold-v2 px-6 flex items-center justify-center"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 底部：待决策区 - 间距缩小 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-gold" />
                  <h2 className="text-dark font-bold text-sm">AI 缺口识别与待您决策</h2>
                </div>
                <span className="text-dark-muted text-xs">P0 优先级：{actions.filter(a => a.priority === 'P0').length}</span>
              </div>

              {actions.slice(0, 2).map((action) => (
                <div key={action.id} className="secretary-card-v2 p-4 flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    action.priority === 'P0' ? 'bg-[rgba(239,68,68,0.1)] text-danger' : 'bg-[rgba(245,158,11,0.1)] text-warning'
                  }`}>
                    {action.priority === 'P0' ? '发布审批' : '权限连接'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark font-medium text-sm">{action.title}</p>
                    <p className="text-dark-muted text-xs mt-0.5 truncate">内容已根据"旧线改造案例"生成，需校实涂料节省数据准确性</p>
                  </div>
                  <Link
                    href={action.actionLink}
                    className="btn-gold-sm px-4 py-2 text-sm shrink-0"
                  >
                    {action.action || '立即审批'}
                  </Link>
                </div>
              ))}
            </div>
          </main>

          {/* 右侧：秘书台（4栏）- 重构为汇报清单 */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-3">
            {/* A) 秘书汇报主卡（置顶） */}
            <div className="secretary-card-v2 p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-cream)]">
                <FileText size={14} className="text-dark-secondary" />
                <span className="text-dark font-bold text-sm">秘书汇报</span>
                <span className="ml-auto text-dark-muted text-[10px]">实时</span>
              </div>
              
              {/* KPI清单 - 更像汇报条目 */}
              <div className="space-y-0">
                <SecretaryRow 
                  label="知识完整度" 
                  value={`${stats?.knowledgeCompleteness || 78}%`}
                  status="progress"
                  href="/c/knowledge/assets"
                />
                <SecretaryRow 
                  label="内容库存" 
                  value="1.2GB"
                  status="progress"
                  href="/c/knowledge/assets"
                />
                <SecretaryRow 
                  label="待您确认" 
                  value={`${actions.length} 项`}
                  status={actions.length > 0 ? 'attention' : 'progress'}
                  href="/c/hub"
                />
                <SecretaryRow 
                  label="VOC 合规" 
                  value="A+"
                  subtext="行业领先"
                  status="progress"
                  href="/c/radar"
                  isLast
                />
              </div>
            </div>

            {/* B) AI执行官消息（缩小，更像秘书建议） */}
            <div className="highlight-card-v2 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-gold" />
                <span className="text-gold text-xs font-semibold">AI 执行官建议</span>
              </div>
              <p className="text-dark-secondary text-sm leading-relaxed">
                {briefing?.recommendations?.[0]?.slice(0, 60) || '识别到喷涂工作站参数缺口。补齐将提升选型手册质量。'}
                {(briefing?.recommendations?.[0]?.length || 0) > 60 && '...'}
              </p>
              <button className="mt-3 flex items-center gap-1.5 text-gold text-xs font-medium hover:underline">
                <FileText size={12} />
                立即补齐资料
              </button>
            </div>

            {/* C) 待您审批列表（若有） */}
            {isSecretaryMode && (
              <div className="secretary-card-v2 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={14} className="text-dark-secondary" />
                  <span className="text-dark font-bold text-sm">待您审批</span>
                  {actions.length > 0 && (
                    <span className="ml-auto badge-attention text-[10px]">{actions.length}</span>
                  )}
                </div>
                
                {actions.length > 0 ? (
                  <div className="space-y-2">
                    {actions.slice(0, 3).map((action, idx) => (
                      <Link 
                        key={action.id} 
                        href={action.actionLink}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-cream-warm transition-colors group"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          action.priority === 'P0' ? 'bg-danger' : 'bg-warning'
                        }`} />
                        <span className="text-dark text-sm truncate flex-1">{action.title}</span>
                        <ChevronRight size={12} className="text-dark-muted group-hover:text-gold transition-colors" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-muted text-sm py-2">已为您处理完毕，暂无需确认事项。</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 子组件：秘书汇报行
// ============================================
function SecretaryRow({ 
  label, 
  value, 
  subtext,
  status, 
  href,
  isLast = false,
}: { 
  label: string; 
  value: string; 
  subtext?: string;
  status: 'progress' | 'attention';
  href: string;
  isLast?: boolean;
}) {
  return (
    <Link 
      href={href}
      className={`flex items-center justify-between py-2.5 group hover:bg-cream-warm -mx-2 px-2 rounded-lg transition-colors ${
        !isLast ? 'border-b border-[var(--border-cream)]' : ''
      }`}
    >
      <span className="text-dark-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="text-dark font-bold font-tabular text-sm">{value}</span>
          {subtext && <span className="text-dark-muted text-[10px] ml-1">{subtext}</span>}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          status === 'attention' 
            ? 'bg-[rgba(245,158,11,0.12)] text-warning' 
            : 'bg-[rgba(34,197,94,0.12)] text-success'
        }`}>
          {status === 'attention' ? '需关注' : '稳步'}
        </span>
        <ChevronRight size={12} className="text-dark-muted group-hover:text-gold transition-colors" />
      </div>
    </Link>
  );
}
