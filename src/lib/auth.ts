import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const loginWindowMs = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const key = createHash("sha256")
          .update(`${email}:${ip}`)
          .digest("hex");
        const now = new Date();
        const attempt = await db.loginAttempt.findUnique({ where: { key } });

        if (attempt?.blockedUntil && attempt.blockedUntil > now) return null;

        const user = await db.user.findUnique({ where: { email } });
        const validPassword =
          user?.isActive === true &&
          (await bcrypt.compare(parsed.data.password, user.passwordHash));

        if (!user || !user.isActive || !validPassword) {
          const windowExpired =
            !attempt || now.getTime() - attempt.windowStartedAt.getTime() >= loginWindowMs;
          const attempts = windowExpired ? 1 : attempt.attempts + 1;
          const blockedUntil =
            attempts >= 5 ? new Date(now.getTime() + loginWindowMs) : null;

          await db.loginAttempt.upsert({
            where: { key },
            create: { key, attempts, windowStartedAt: now, blockedUntil },
            update: windowExpired
              ? { attempts, windowStartedAt: now, blockedUntil }
              : { attempts, blockedUntil },
          });
          return null;
        }

        await db.loginAttempt.deleteMany({ where: { key } });
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
});
