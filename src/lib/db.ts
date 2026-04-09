import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  pool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

const _db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = _db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = _db as typeof _db & Record<string, any>;
