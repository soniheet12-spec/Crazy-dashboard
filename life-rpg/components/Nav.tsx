"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  CalendarDays,
  Award,
  Skull,
  Settings,
  Swords,
  Sparkles,
  BarChart3,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/quests", label: "Quests", short: "Quests", icon: ScrollText },
  { href: "/calendar", label: "Calendar", short: "Cal", icon: CalendarDays },
  { href: "/achievements", label: "Achievements", short: "Awards", icon: Award },
  { href: "/bosses", label: "Bosses", short: "Bosses", icon: Skull },
  { href: "/skills", label: "Skills", short: "Skills", icon: Sparkles },
  { href: "/insights", label: "Insights", short: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", short: "More", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-line/70 px-4 py-8 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Swords className="text-accent" size={22} />
          <span className="font-pixel text-xs leading-tight text-slate-100">
            LIFE<span className="text-accent"> RPG</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/15 text-accent shadow-glow"
                    : "text-slate-400 hover:bg-bg-hover hover:text-slate-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-[10px] leading-relaxed text-slate-600">
          Single-player mode. Your data lives in this browser.
        </p>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Swords className="text-accent" size={18} />
          <span className="font-pixel text-[10px] text-slate-100">
            LIFE<span className="text-accent"> RPG</span>
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line/70 bg-bg/95 px-0.5 py-1.5 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {LINKS.map(({ href, label, short, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1 text-[10px] ${
                active ? "text-accent" : "text-slate-500"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="w-full truncate text-center">{short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
