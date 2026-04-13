import { redirect } from 'next/navigation';

/**
 * v2.0: 渠道地图页面已合并到自动搜索页
 * 旧路径重定向到新版
 */
export default function ChannelsPage() {
  redirect('/customer/radar/search');
}