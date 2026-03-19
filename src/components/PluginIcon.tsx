"use client";

import { icons, type LucideIcon } from "lucide-react";

const FallbackIcon = icons.Package;

interface PluginIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Renders a lucide-react icon by name string.
 * Resolves any valid lucide icon name dynamically (1700+ icons),
 * so new plugins can use any icon without updating this component.
 * Falls back to the Package icon for unrecognised names.
 */
export default function PluginIcon({
  name,
  size = 20,
  className,
}: PluginIconProps) {
  const Icon = (icons[name as keyof typeof icons] as LucideIcon | undefined) ?? FallbackIcon;
  return <Icon size={size} className={className} />;
}
