"use server";

/**
 * 获客雷达流水线状态 Server Actions
 */

import { headers } from 'next/headers';
import { getRadarPipelineStatus as getPipelineStatus } from '@/lib/radar/pipeline';
import { getTenantFromHeaders } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';

export async function getRadarPipelineStatus() {
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
