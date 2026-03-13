/** Human-readable labels for capability strings */
export const CAPABILITY_LABELS: Record<string, { emoji: string; label: string }> = {
  "data:own": { emoji: "📊", label: "Own Data" },
  "network:fetch": { emoji: "🌐", label: "Network Fetch" },
  "storage:write": { emoji: "💾", label: "Storage Write" },
  "storage:read": { emoji: "📖", label: "Storage Read" },
  "ui:detail-panel": { emoji: "🖼️", label: "Detail Panel" },
  "ui:sidebar": { emoji: "📐", label: "Sidebar" },
  "ui:toolbar": { emoji: "🔧", label: "Toolbar" },
  "ui:settings": { emoji: "⚙️", label: "Settings" },
  "globe:overlay": { emoji: "🌍", label: "Globe Overlay" },
  "globe:camera": { emoji: "🎥", label: "Camera Control" },
};
