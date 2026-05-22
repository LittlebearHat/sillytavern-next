import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { userService } from "@/lib/services/user-service";

const loginSchema = z.object({
  handle: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        handle: { label: "Handle", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await userService.authenticate(parsed.data.handle, parsed.data.password);
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          handle: user.handle,
          admin: user.admin,
        } as unknown as { id: string; name: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时将 user 信息写入 token
      if (user) {
        token.id = user.id;
        token.handle = (user as unknown as { handle: string }).handle;
        token.admin = (user as unknown as { admin: boolean }).admin;
      }
      return token;
    },
    async session({ session, token }) {
      // 将 token 中的信息传递到 session
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = (token.id || token.sub) as string;
        u.handle = token.handle as string;
        u.admin = token.admin as boolean;
      }
      return session;
    },
  },
});
