import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const _db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _db;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = _db as typeof _db & Record<string, any>;
