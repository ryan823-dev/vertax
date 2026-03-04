"use server";

/**
 * 内容增长流水线状态 Server Actions
 */

import { headers } from 'next/headers';
import { getGrowthPipelineStatus as getPipelineStatus } from '@/lib/marketing/growth-pipeline';
import { getTenantFromHeaders } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';

export async function getGrowthPipelineStatus() {
  const headersList = await headers();
  const tenantInfo = getTenantFromHeaders(headersList);
  
  if (!tenantInfo.tenantSlug) {
    throw new Error('Tenant not found');
  }
  
  // Get tenant ID from slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantInfo.tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  return getPipelineStatus(tenant.id);
}
