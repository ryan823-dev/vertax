import { redirect } from 'next/navigation';

/**
 * v2.0: 线索收集任务页面已合并到自动搜索页
 * 旧路径重定向到新版
 */
export default function TasksPage() {
  redirect('/customer/radar/search');
}