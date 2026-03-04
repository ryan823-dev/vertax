"use server";

/**
 * 知识引擎流水线状态 Server Actions
 */

import { headers } from 'next/headers';
import { getKnowledgePipelineStatus as getPipelineStatus } from '@/lib/knowledge/pipeline';
import { getTenantFromHeaders } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';

export async function getKnowledgePipelineStatus() {
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
