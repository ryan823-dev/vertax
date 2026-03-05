"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  RefreshCw,
  Brain,
  Radar,
  FileText,
  Globe,
  Activity,
  ChevronRight,
  Zap,
  TrendingUp,
  X,
  MessageSquare,
  ListTodo,
  LayoutGrid,
  Check,
  Play,
  Pause,
} from 'lucide-react';
import {
  getSystemTodos,
  getHubStats,
  getModuleHealth,
  getRecentActivity,
  type TodoItem,
  type HubStats,
  type ModuleHealth,
  type RecentActivity,
} from '@/actions/hub';
import {
  getAllTasks,
  getAllComments,
  updateTaskStatus,
  resolveComment,
  getCollaborationStats,
  type TaskData,
  type CommentData,
} from '@/actions/collaboration';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Icon mapping
const MODULE_ICONS: Record<string, typeof Brain> = {
  brain: Brain,
  radar: Radar,
  'file-text': FileText,
  globe: Globe,
};

type ActiveTab = 'todos' | 'tasks' | 'comments';

export default function HubPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('todos');
  
  // System data
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [stats, setStats] = useState<HubStats>({ pending: 0, blocked: 0, inProgress: 0, completed: 0 });
  const [moduleHealth, setModuleHealth] = useState<ModuleHealth[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  
  // Collaboration data
  const [tasks, setTasks] = useState<Array<TaskData & { entityType: string; entityId: string }>>([]);
  const [comments, setComments] = useState<Array<CommentData & { entityType: string; entityId: string }>>([]);
  const [collabStats, setCollabStats] = useState({ openComments: 0, openTasks: 0, inProgressTasks: 0, completedTasksToday: 0 });

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [todosData, statsData, healthData, activityData, tasksData, commentsData, collabStatsData] = await Promise.all([
        getSystemTodos(),
        getHubStats(),
        getModuleHealth(),
        getRecentActivity(5),
        getAllTasks({ status: 'all' }),
        getAllComments(20),
        getCollaborationStats(),
      ]);
      setTodos(todosData);
      setStats(statsData);
      setModuleHealth(healthData);
      setActivities(activityData);
      setTasks(tasksData);
      setComments(commentsData);
      setCollabStats(collabStatsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskData['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('任务状态已更新');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    }
  };

  // Handle resolve comment
  const handleResolveComment = async (commentId: string) => {
    try {
      await resolveComment(commentId);
      toast.success('评论已解决');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, string> = {
      P0: 'bg-red-100 text-red-600',
      P1: 'bg-amber-100 text-amber-600',
      P2: 'bg-blue-100 text-blue-600',
      P3: 'bg-slate-100 text-slate-600',
      urgent: 'bg-red-100 text-red-600',
      high: 'bg-amber-100 text-amber-600',
      medium: 'bg-blue-100 text-blue-600',
      low: 'bg-slate-100 text-slate-600',
    };
    return styles[priority] || styles.P3;
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    const styles: Record<string, { label: string; color: string }> = {
      pending: { label: '待处理', color: 'bg-amber-50 text-amber-600' },
      in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
      completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-600' },
      open: { label: '待处理', color: 'bg-amber-50 text-amber-600' },
      done: { label: '已完成', color: 'bg-emerald-50 text-emerald-600' },
      cancelled: { label: '已取消', color: 'bg-[#F7F3E8] text-slate-600' },
    };
    return styles[status] || styles.pending;
  };

  // 获取健康状态样式
  const getHealthStyle = (status: string) => {
    const styles: Record<string, string> = {
      healthy: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
    };
    return styles[status] || styles.warning;
  };

  // 获取模块图标
  const getModuleIcon = (iconName: string) => {
    return MODULE_ICONS[iconName] || ClipboardList;
  };

  // 获取实体类型标签
  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      SeoContent: '内容',
      Evidence: '证据',
      CompanyProfile: '企业画像',
      BrandGuideline: '品牌规范',
      Persona: '人设',
      ContentBrief: '内容规划',
    };
    return labels[entityType] || entityType;
  };

  // 获取活动描述
  const getActivityDescription = (activity: RecentActivity) => {
    const actionMap: Record<string, string> = {
      create: '创建了',
      update: '更新了',
      delete: '删除了',
      publish: '发布了',
      analyze: '分析了',
      'evidence.created': '创建了',
      'evidence.updated': '更新了',
      'version.created': '创建了版本',
      'comment.added': '添加了评论',
      'task.created': '创建了任务',
    };
    const entityMap: Record<string, string> = {
      lead: '线索',
      content: '内容',
      post: '社媒帖子',
      profile: '企业画像',
      asset: '素材',
      Evidence: '证据',
      ArtifactVersion: '版本',
      ArtifactComment: '评论',
      ArtifactTask: '任务',
    };
    return `${actionMap[activity.action] || activity.action} ${entityMap[activity.entityType] || activity.entityType}`;
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
      {/* Header - 指令台 深蓝舞台风格 */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">推进中台</h1>
            <p className="text-sm text-slate-400 mt-1">任务协作、评论审批、进度跟踪</p>
          </div>
          <button 
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '待办事项', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: '待处理任务', value: collabStats.openTasks, icon: ListTodo, color: 'text-blue-500' },
          { label: '进行中任务', value: collabStats.inProgressTasks, icon: Play, color: 'text-purple-500' },
          { label: '待解决评论', value: collabStats.openComments, icon: MessageSquare, color: 'text-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#F7F3E8] rounded-xl border border-[#E8E0D0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0B1B2B]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs - 指令台风格 */}
      <div className="rounded-xl p-1.5 flex gap-1" style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.35)',
      }}>
        {[
          { id: 'todos' as const, label: '系统待办', icon: ClipboardList, count: todos.length },
          { id: 'tasks' as const, label: '协作任务', icon: ListTodo, count: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length },
          { id: 'comments' as const, label: '评论审批', icon: MessageSquare, count: comments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'text-[#0B1220]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { background: '#D4AF37', boxShadow: '0 2px 8px -2px rgba(212,175,55,0.4)' } : {}}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id ? 'bg-[#0B1220]/20 text-[#0B1220]' : 'bg-white/10 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0]">
          <div className="px-6 py-4 border-b border-[#E8E0D0]" style={{ background: '#F0EBD8' }}>
          {/* System Todos Tab */}
          {activeTab === 'todos' && (
            <h3 className="font-bold text-[#0B1B2B] flex items-center gap-2">
              <ClipboardList size={18} className="text-[#D4AF37]" />
              系统待办事项
            </h3>
          )}
          {activeTab === 'tasks' && (
            <h3 className="font-bold text-[#0B1B2B] flex items-center gap-2">
              <ListTodo size={18} className="text-[#D4AF37]" />
              协作任务
            </h3>
          )}
          {activeTab === 'comments' && (
            <h3 className="font-bold text-[#0B1B2B] flex items-center gap-2">
              <MessageSquare size={18} className="text-[#D4AF37]" />
              待解决评论
            </h3>
          )}
          </div>
          <div className="p-6">
          {/* System Todos Tab */}
          {activeTab === 'todos' && (
              <>
              {todos.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 size={48} className="text-emerald-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0B1B2B] mb-2">太棒了！</p>
                  <p className="text-slate-500">没有待处理事项</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {todos.map((todo) => {
                    const Icon = getModuleIcon(todo.moduleIcon);
                    const statusInfo = getStatusStyle(todo.status);
                    return (
                      <div 
                        key={todo.id} 
                        className="flex items-center gap-4 p-4 bg-[#FFFCF7] border border-[#E8E0D0] rounded-xl hover:border-[#D4AF37]/30 transition-colors"
                      >
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${getPriorityStyle(todo.priority)}`}>
                          {todo.priority}
                        </span>
                        <div className="w-8 h-8 bg-[#F0EBD8] rounded-lg flex items-center justify-center">
                          <Icon size={16} className="text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#0B1B2B]">{todo.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{todo.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">来自：{todo.module}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {todo.actionLink ? (
                          <Link 
                            href={todo.actionLink}
                            className="px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            style={{ background: '#D4AF37', color: '#0B1220' }}
                          >
                            {todo.action}
                            <ChevronRight size={12} />
                          </Link>
                        ) : (
                          <button className="px-4 py-2 text-xs font-bold rounded-lg transition-colors" style={{ background: '#D4AF37', color: '#0B1220' }}>
                            {todo.action}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <>
              {tasks.length === 0 ? (
                <div className="text-center py-16">
                  <ListTodo size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0B1B2B] mb-2">暂无任务</p>
                  <p className="text-slate-500">在内容编辑器中创建协作任务</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {tasks.map((task) => {
                    const statusInfo = getStatusStyle(task.status);
                    return (
                      <div 
                        key={task.id} 
                        className="flex items-center gap-4 p-4 bg-[#FFFCF7] border border-[#E8E0D0] rounded-xl hover:border-[#D4AF37]/30 transition-colors"
                      >
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${getPriorityStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#0B1B2B]">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 bg-[#F0EBD8] px-1.5 py-0.5 rounded">
                              {getEntityLabel(task.entityType)}
                            </span>
                            {task.assigneeName && (
                              <span className="text-[10px] text-slate-500">
                                指派给: {task.assigneeName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                              className="text-blue-500 hover:bg-blue-50"
                            >
                              <Play size={14} />
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTaskStatusChange(task.id, 'open')}
                                className="text-amber-500 hover:bg-amber-50"
                              >
                                <Pause size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTaskStatusChange(task.id, 'done')}
                                className="text-emerald-500 hover:bg-emerald-50"
                              >
                                <Check size={14} />
                              </Button>
                            </>
                          )}
                          {task.status === 'done' && (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <>
              {comments.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0B1B2B] mb-2">暂无评论</p>
                  <p className="text-slate-500">所有评论已解决</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className="flex items-start gap-4 p-4 bg-[#FFFCF7] border border-[#E8E0D0] rounded-xl hover:border-[#D4AF37]/30 transition-colors"
                    >
                      <div className="w-8 h-8 bg-[#F0EBD8] rounded-full flex items-center justify-center shrink-0">
                        <MessageSquare size={14} className="text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0B1B2B]">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-500">
                            {comment.authorName || '未知用户'}
                          </span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleString('zh-CN')}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-[#F0EBD8] px-1.5 py-0.5 rounded">
                            {getEntityLabel(comment.entityType)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveComment(comment.id)}
                        className="text-emerald-500 hover:bg-emerald-50 shrink-0"
                      >
                        <Check size={14} className="mr-1" />
                        解决
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Module Health */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <Activity size={18} className="text-[#D4AF37]" />
              模块健康度
            </h3>
            <div className="space-y-3">
              {moduleHealth.map((module, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getHealthStyle(module.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1B2B]">{module.module}</p>
                    <p className="text-xs text-slate-400 truncate">{module.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#F7F3E8] rounded-2xl border border-[#E8E0D0] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <Zap size={18} className="text-[#D4AF37]" />
              最近活动
            </h3>
            {activities.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">暂无活动记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#F0EBD8] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp size={12} className="text-[#D4AF37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#0B1B2B]">
                        {activity.userName || '系统'} {getActivityDescription(activity)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(activity.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #0B1220 0%, #0A1018 60%, #0D1525 100%)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.45)',
          }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% -20%, rgba(212,175,55,0.14) 0%, transparent 65%)',
            }} />
            <div className="relative">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Zap size={12} className="text-[#D4AF37]" />
                </div>
                今日建议
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {collabStats.openTasks > 0 
                  ? `您有 ${collabStats.openTasks} 个待处理任务，${collabStats.openComments} 条待解决评论。建议及时处理以推进协作进度。`
                  : todos.length > 0 
                    ? `您有 ${todos.filter(t => t.priority === 'P0' || t.priority === 'P1').length} 个高优先级待办事项待处理。`
                    : '所有任务已完成！可以考虑通过AI调研发掘新的潜在客户。'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
