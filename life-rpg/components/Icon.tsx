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
  Snowflake,
  FlaskConical,
  Gift,
  HelpCircle,
  Briefcase,
  Palette,
  Music,
  Leaf,
  Globe,
  Code,
  Target,
  Activity,
  Zap,
  Sun,
  Moon,
  Rocket,
  Mountain,
  Pencil,
  Camera,
  Utensils,
  Bike,
  Wallet,
  GraduationCap,
  Star,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Dumbbell, Brain, BrainCircuit, Coins, MessagesSquare, ShieldCheck, Sparkles,
  Flame, Gem, Shield, Feather, Medal, Map, Swords, BookOpen, Crown, Heart,
  Users, Compass, Sunrise, Handshake, Trophy, Snowflake, FlaskConical, Gift,
  Briefcase, Palette, Music, Leaf, Globe, Code, Target, Activity, Zap, Sun,
  Moon, Rocket, Mountain, Pencil, Camera, Utensils, Bike, Wallet, GraduationCap,
  Star,
};

/** Curated icon names offered in the per-stat icon picker. */
export const STAT_ICON_CHOICES = [
  "Dumbbell", "Brain", "Coins", "MessagesSquare", "ShieldCheck", "Heart",
  "Briefcase", "Palette", "Music", "Leaf", "Globe", "Code", "Target",
  "Activity", "Zap", "Sun", "Moon", "Rocket", "Mountain", "Pencil", "Camera",
  "Utensils", "Bike", "Wallet", "GraduationCap", "BookOpen", "Flame", "Gem",
  "Sparkles", "Users", "Compass", "Trophy", "Star",
];

/** Render a lucide icon by its registry name, with a safe fallback. */
export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Cmp = REGISTRY[name] ?? HelpCircle;
  return <Cmp size={size} className={className} />;
}
