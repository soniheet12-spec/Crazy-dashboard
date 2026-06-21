"use client";

import {
  Dumbbell,
  Brain,
  BrainCircuit,
  Coins,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Flame,
  Gem,
  Shield,
  Feather,
  Medal,
  Map,
  Swords,
  BookOpen,
  Crown,
  Heart,
  Users,
  Compass,
  Sunrise,
  Handshake,
  Trophy,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Dumbbell, Brain, BrainCircuit, Coins, MessagesSquare, ShieldCheck, Sparkles,
  Flame, Gem, Shield, Feather, Medal, Map, Swords, BookOpen, Crown, Heart,
  Users, Compass, Sunrise, Handshake, Trophy,
};

/** Render a lucide icon by its registry name, with a safe fallback. */
export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Cmp = REGISTRY[name] ?? HelpCircle;
  return <Cmp size={size} className={className} />;
}
