import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible auth config (no Node.js APIs)
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        handle: { label: "Handle", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // authorize is handled in the full auth.ts
      authorize: () => null,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as unknown as Record<string, unknown>).id;
        token.handle = (user as unknown as Record<string, unknown>).handle;
        token.admin = (user as unknown as Record<string, unknown>).admin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = (token.id || token.sub) as string;
        u.handle = token.handle as string;
        u.admin = token.admin as boolean;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");
      // 公开端点（不需鉴权）：健康检查供 Docker / K8s 调用
      const isPublicApi = request.nextUrl.pathname === "/api/health";
      if (isAuthApi || isLoginPage || isPublicApi) return true;
      return isLoggedIn;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};
