/** Human-readable labels for capability strings */
export const CAPABILITY_LABELS: Record<string, { icon: string; label: string }> = {
  "data:own": { icon: "Database", label: "Own Data" },
  "network:fetch": { icon: "Globe", label: "Network Fetch" },
  "storage:write": { icon: "HardDrive", label: "Storage Write" },
  "storage:read": { icon: "BookOpen", label: "Storage Read" },
  "ui:detail-panel": { icon: "PanelRight", label: "Detail Panel" },
  "ui:sidebar": { icon: "PanelLeft", label: "Sidebar" },
  "ui:toolbar": { icon: "Wrench", label: "Toolbar" },
  "ui:settings": { icon: "Settings", label: "Settings" },
  "globe:overlay": { icon: "Globe", label: "Globe Overlay" },
  "globe:camera": { icon: "Video", label: "Camera Control" },
};
