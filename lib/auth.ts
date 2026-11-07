import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/schemas";

// Used only to burn the same bcrypt time when the email doesn't exist.
const DUMMY_HASH = bcrypt.hashSync("unused-placeholder", 10);

/**
 * NextAuth configuration.
 *
 * Session flow (for interview discussion):
 *  1. POST /api/auth/callback/credentials with email + password.
 *  2. `authorize` looks up the user and compares the password against the
 *     stored bcrypt hash. A timing-safe comparison is built into bcrypt.
 *  3. On success, NextAuth issues a signed JWT (keyed by NEXTAUTH_SECRET)
 *     and stores it in an HTTP-only session cookie. The JWT is the session;
 *     there is no session table.
 *  4. Middleware reads that cookie on every request and redirects or
 *     returns 401 when it is missing or invalid.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          // Still run a compare so response timing doesn't reveal which
          // emails exist.
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
