'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateCSVString, CSVColumn } from '@/lib/utils/csv-export';

/**
 * 导出内容库为 CSV
 */
export async function exportContentsToCSV() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  const contents = await db.contentPiece.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    include: {
      brief: {
        select: {
          title: true,
          topic: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (contents.length === 0) {
    return { success: false, error: '没有可导出的内容' };
  }

  type ContentExportRow = (typeof contents)[number];

  const columns: CSVColumn<ContentExportRow>[] = [
    { header: '标题', key: 'title' },
    {
      header: '类型',
      key: 'type',
      transform: (value: unknown) => {
        const typeMap: Record<string, string> = {
          blog_post: '博客文章',
          social_post: '社媒帖子',
          whitepaper: '白皮书',
          case_study: '案例研究',
          landing_page: '落地页',
          email: '邮件',
        };
        return typeMap[String(value)] || String(value);
      }
    },
    {
      header: '状态',
      key: 'status',
      transform: (value: unknown) => {
        const statusMap: Record<string, string> = {
          draft: '草稿',
          review: '待审核',
          approved: '已批准',
          awaiting_publish: '待发布',
          published: '已发布',
        };
        return statusMap[String(value)] || String(value);
      }
    },
    {
      header: '关联Brief',
      key: 'brief',
      transform: (value: unknown) => {
        const brief = value as { title?: string } | null;
        return brief?.title || '无';
      }
    },
    {
      header: '字数',
      key: 'wordCount',
      transform: (value: unknown) => String(value || 0)
    },
    {
      header: 'SEO关键词',
      key: 'seoKeywords',
      transform: (value: unknown) => {
        const keywords = value as string[] | null;
        return keywords?.join(', ') || '无';
      }
    },
    {
      header: '创建时间',
      key: 'createdAt',
      transform: (value: unknown) => value instanceof Date ? value.toISOString().split('T')[0] : ''
    },
    {
      header: '发布时间',
      key: 'publishedAt',
      transform: (value: unknown) => value instanceof Date ? value.toISOString().split('T')[0] : '未发布'
    },
  ];

  const csvContent = generateCSVString(contents, columns);

  return {
    success: true,
    csvContent,
    filename: `Vertax_Contents_${new Date().toISOString().split('T')[0]}.csv`
  };
}

/**
 * 导出社媒帖子为 CSV
 */
export async function exportSocialPostsToCSV() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  const posts = await db.socialPost.findMany({
    where: {
      tenantId: session.user.tenantId,
      deletedAt: null,
    },
    include: {
      versions: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (posts.length === 0) {
    return { success: false, error: '没有可导出的帖子' };
  }

  type PostExportRow = (typeof posts)[number];

  const columns: CSVColumn<PostExportRow>[] = [
    {
      header: '平台',
      key: 'versions',
      transform: (value: unknown) => {
        const versions = value as Array<{ platform: string }> | null;
        if (!versions || versions.length === 0) return '无';
        return versions.map(v => v.platform.toUpperCase()).join(', ');
      }
    },
    {
      header: '状态',
      key: 'status',
      transform: (value: unknown) => {
        const statusMap: Record<string, string> = {
          draft: '草稿',
          scheduled: '已排期',
          published: '已发布',
          failed: '发布失败',
        };
        return statusMap[String(value)] || String(value);
      }
    },
    {
      header: '内容预览',
      key: 'versions',
      transform: (value: unknown) => {
        const versions = value as Array<{ content: string }> | null;
        if (!versions || versions.length === 0) return '无内容';
        const content = versions[0].content;
        return content.length > 100 ? content.slice(0, 100) + '...' : content;
      }
    },
    {
      header: '排期时间',
      key: 'scheduledAt',
      transform: (value: unknown) => value instanceof Date ? value.toISOString() : '未排期'
    },
    {
      header: '发布时间',
      key: 'publishedAt',
      transform: (value: unknown) => value instanceof Date ? value.toISOString() : '未发布'
    },
    {
      header: '创建时间',
      key: 'createdAt',
      transform: (value: unknown) => value instanceof Date ? value.toISOString().split('T')[0] : ''
    },
  ];

  const csvContent = generateCSVString(posts, columns);

  return {
    success: true,
    csvContent,
    filename: `Vertax_SocialPosts_${new Date().toISOString().split('T')[0]}.csv`
  };
}