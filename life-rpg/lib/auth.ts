import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export const GOOGLE_ENABLED =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const CALENDAR_SCOPE =
  "openid email profile https://www.googleapis.com/auth/calendar.readonly";

/** Use a Google refresh token to obtain a fresh access token. */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) return { ...token, error: "NoRefreshToken" };
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      // Google may not return a new refresh token; keep the old one.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  // Only register the Google provider when credentials are present so the app
  // builds and runs with zero calendar setup.
  providers: GOOGLE_ENABLED
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: {
            params: {
              scope: CALENDAR_SCOPE,
              access_type: "offline",
              prompt: "consent",
            },
          },
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist the tokens from Google.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        return token;
      }
      // Subsequent calls: refresh if the access token has expired.
      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
