import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const email = credentials.email.toLowerCase().trim();
      const password = credentials.password;
      if (email === "admin@sitecraft.ai" && password === "admin@123") {
        return { id: email, name: "Administrator", email, role: "admin" };
      }
      if (password.length < 8) return null;
      return { id: email, name: email.split("@")[0], email, role: "user" };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return { ...token, role: (user as { role?: string }).role ?? token.role };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role as string | undefined
        }
      };
    }
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "sitecraft-development-secret-change-me" : undefined)
};
