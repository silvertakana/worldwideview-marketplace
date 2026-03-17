"use client";

import type { LucideIcon } from "lucide-react";
import {
  Plane, Ship, Shield, Flame, Camera, Map, Swords, Wrench,
  Atom, Landmark, Package, Database, Globe, HardDrive,
  BookOpen, PanelRight, PanelLeft, Settings, Video,
  Plug, ShieldCheck, Zap,
} from "lucide-react";

/** Map of lucide icon name strings → React components. */
const ICON_MAP: Record<string, LucideIcon> = {
  Plane, Ship, Shield, Flame, Camera, Map, Swords, Wrench,
  Atom, Landmark, Package, Database, Globe, HardDrive,
  BookOpen, PanelRight, PanelLeft, Settings, Video,
  Plug, ShieldCheck, Zap,
};

interface PluginIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Renders a lucide-react icon by name string.
 * Falls back to the Package icon for unrecognised names.
 */
export default function PluginIcon({
  name,
  size = 20,
  className,
}: PluginIconProps) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon size={size} className={className} />;
}
