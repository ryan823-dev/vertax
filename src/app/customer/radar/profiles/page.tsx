import { redirect } from 'next/navigation';

/**
 * v2.0: 扫描计划页面已合并到自动搜索页
 * 旧路径重定向到新版
 */
export default function ProfilesPage() {
  redirect('/customer/radar/search');
}