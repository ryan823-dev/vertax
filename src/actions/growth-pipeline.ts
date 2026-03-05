"use server";

/**
 * 内容增长流水线状态 Server Actions
 */

import { auth } from '@/lib/auth';
import { getGrowthPipelineStatus as getPipelineStatus } from '@/lib/marketing/growth-pipeline';

export async function getGrowthPipelineStatus() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized');
  }

  return getPipelineStatus(session.user.tenantId);
}
