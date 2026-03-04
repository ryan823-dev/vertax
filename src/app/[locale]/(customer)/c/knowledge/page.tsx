import { redirect } from 'next/navigation';

export default function KnowledgeEnginePage() {
  // 重定向到资料库（流水线第一步）
  redirect('/c/knowledge/assets');
}
