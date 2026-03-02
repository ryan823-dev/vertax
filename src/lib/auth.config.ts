import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Cross-platform JWT configuration (shared with Vertax)
// Both Tower and Vertax must use the same JWT_SECRET
export const CROSS_PLATFORM_JWT_CONFIG = {
  secret: process.env.JWT_SECRET || "vertax-jwt-secret-change-in-production",
  issuer: "vertax.top",
  audience: "vertax-platform",
};

// This config is safe for Edge runtime (no Prisma imports)
// The actual authorize logic is in auth.ts
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/zh-CN/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is defined in auth.ts (Node.js runtime)
      authorize: () => null,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as Record<string, unknown>).tenantId as string;
        token.tenantName = (user as Record<string, unknown>).tenantName as string;
        token.tenantSlug = (user as Record<string, unknown>).tenantSlug as string;
        token.roleId = (user as Record<string, unknown>).roleId as string;
        token.roleName = (user as Record<string, unknown>).roleName as string;
        token.permissions = (user as Record<string, unknown>).permissions as string[];
        
        // Store cross-platform compatible payload for Vertax
        // This makes the token work with Vertax's middleware/auth.ts
        token.userId = user.id; // Vertax uses 'userId' instead of 'id'
        token.role = (user as Record<string, unknown>).roleName as string; // Vertax uses 'role' instead of 'roleName'
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.roleId = token.roleId as string;
        session.user.roleName = token.roleName as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
};
