import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon serverless 冷启动优化
    connectionTimeoutMillis: 10000, // 10s 连接超时（冷启动需要更长时间）
    idleTimeoutMillis: 30000,       // 30s 空闲回收
    max: 5,                          // 最大连接数（Vercel serverless 保持低值）
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const _db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _db;

// Cast to any-extended type so models added in schema but not yet generated
// (due to Node version constraint with Prisma v7) are accessible at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = _db as typeof _db & Record<string, any>;
