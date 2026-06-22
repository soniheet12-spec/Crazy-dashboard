import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Life RPG — Character Sheet",
  description:
    "Turn your goals and habits into a video-game character sheet. Earn XP, level up your stats, and slay your boss goals.",
  applicationName: "Life RPG",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Life RPG" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${pixel.variable}`}>
      <body>
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
            <Nav />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
