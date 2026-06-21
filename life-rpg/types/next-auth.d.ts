import type { DefaultSession } from "next-auth";

// Augment NextAuth types so we can carry the Google access token through.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
