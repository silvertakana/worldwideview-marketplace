---
phase: quick-260530-gji
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/PluginCardActions.tsx
autonomous: true
requirements: [QUICK-260530-GJI]
must_haves:
  truths:
    - "Clicking Install on a browse-page card with a cached instance URL redirects immediately"
    - "Clicking Install with no cached URL and exactly one linked instance auto-selects it and redirects"
    - "Clicking Install with 2+ linked instances opens the InstancePicker modal"
    - "Clicking Install with 0 linked instances opens the InstanceConfig modal"
    - "Selecting an instance in the picker saves the URL and redirects"
    - "Choosing 'Add New Instance' in the picker hides the picker and shows InstanceConfig"
  artifacts:
    - path: "src/components/PluginCardActions.tsx"
      provides: "Browse-card Install button wired to the multi-instance picker flow"
      contains: "fetchUserInstances"
  key_links:
    - from: "src/components/PluginCardActions.tsx"
      to: "src/lib/instanceStore.ts"
      via: "fetchUserInstances / setInstanceUrl / getInstanceUrl"
      pattern: "fetchUserInstances\\("
    - from: "src/components/PluginCardActions.tsx"
      to: "src/components/InstancePicker.tsx"
      via: "conditional render when pickerInstances is set"
      pattern: "<InstancePicker"
---

<objective>
Wire the browse-page card Install button (`PluginCardActions`) to use the same
multi-instance picker logic already implemented in the detail-page Install button
(`InstallButton`).

Currently `PluginCardActions.handleInstall` only reads the cached `getInstanceUrl()`
and, when empty, jumps straight to `InstanceConfig` — it never calls
`fetchUserInstances()`, so users with linked instances are forced to re-enter a URL
instead of picking from their saved instances.

Purpose: consistent install UX across the browse page and the detail page; users with
one or more linked WWV instances get the silent / picker path instead of the config modal.
Output: updated `PluginCardActions.tsx` with picker state, picker handlers, async
`handleInstall`, and a conditionally-rendered `InstancePicker`.
</objective>

<execution_context>
@C:/dev/wwv/worldwideview/.claude/get-shit-done/workflows/execute-plan.md
@C:/dev/wwv/worldwideview/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/dev/wwv/worldwideview-marketplace/AGENTS.md
@C:/dev/wwv/worldwideview-marketplace/src/components/PluginCardActions.tsx
@C:/dev/wwv/worldwideview-marketplace/src/components/InstallButton.tsx
@C:/dev/wwv/worldwideview-marketplace/src/components/InstancePicker.tsx
@C:/dev/wwv/worldwideview-marketplace/src/lib/instanceStore.ts

<interfaces>
<!-- Contracts the executor needs. Extracted from the codebase — no exploration required. -->

From src/lib/instanceStore.ts:
```typescript
export interface SavedInstance { id: string; url: string; nickname?: string | null; }
export function getInstanceUrl(): string | null;
export function setInstanceUrl(url: string): void;
export function fetchUserInstances(): Promise<SavedInstance[]>; // never throws, [] on failure/unauth
```

From src/components/InstancePicker.tsx (props):
```typescript
interface Props {
    instances: SavedInstance[];
    onSelect: (instance: SavedInstance) => void;
    onAddNew: () => void;
    onCancel: () => void;
}
```

Reference flow from src/components/InstallButton.tsx (handleInstall / handlePickerSelect /
handlePickerAddNew, lines 129-162) — replicate this exact ordering: cached URL → redirect;
else fetch instances; length===1 auto-select+redirect; length>1 setPickerInstances;
length===0 setShowConfig(true).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire multi-instance picker flow into PluginCardActions</name>
  <files>src/components/PluginCardActions.tsx</files>
  <action>
Transplant the multi-instance install logic from `InstallButton` into `PluginCardActions`,
preserving PluginCardActions' existing card-specific concerns (the `e.preventDefault()` /
`e.stopPropagation()` calls — these matter because the button lives inside a clickable card
link — and the `trackEvent("plugin_install_click", ...)` call).

1. Imports: extend the `@/lib/instanceStore` import to also bring in `setInstanceUrl`,
   `fetchUserInstances`, and the `SavedInstance` type (currently only `getInstanceUrl` is
   imported). Add `import InstancePicker from "./InstancePicker";`.

2. State: add `const [pickerInstances, setPickerInstances] = useState<SavedInstance[] | null>(null);`
   alongside the existing `showConfig` state.

3. Convert `handleInstall` to `async function handleInstall(e: MouseEvent)`. Keep the existing
   `e.preventDefault()`, `e.stopPropagation()`, and `trackEvent(...)` at the top. Replace the
   body after tracking with the InstallButton ordering:
   - `const cached = getInstanceUrl();` — if truthy, `window.location.href = buildInstallStartUrl(cached); return;`
   - `const instances = await fetchUserInstances();`
   - if `instances.length === 1`: `setInstanceUrl(instances[0].url); window.location.href = buildInstallStartUrl(instances[0].url); return;`
   - if `instances.length > 1`: `setPickerInstances(instances); return;`
   - otherwise: `setShowConfig(true);`

4. Add two handlers mirroring InstallButton:
   - `handlePickerSelect(instance: SavedInstance)`: `setInstanceUrl(instance.url); setPickerInstances(null); window.location.href = buildInstallStartUrl(instance.url);`
   - `handlePickerAddNew()`: `setPickerInstances(null); setShowConfig(true);`

5. JSX: render `InstancePicker` conditionally when `pickerInstances` is set, immediately after
   the existing `showConfig && <InstanceConfig .../>` block. Pass `instances={pickerInstances}`,
   `onSelect={handlePickerSelect}`, `onAddNew={handlePickerAddNew}`,
   `onCancel={() => setPickerInstances(null)}`.

Do NOT change the `isAuthed === false` sign-in branch, the `buildInstallStartUrl` body, the
`handleConfigured` logic, or the installed / pending badge rendering. Keep the `MouseEvent`
type import from "react" intact (handleInstall still receives the click event).
  </action>
  <verify>
    <automated>cd C:/dev/wwv/worldwideview-marketplace; npx tsc --noEmit 2>&1 | Select-String "PluginCardActions"</automated>
  </verify>
  <done>
`tsc --noEmit` reports no errors for PluginCardActions.tsx. The file imports
`fetchUserInstances`, `setInstanceUrl`, `SavedInstance`, and `InstancePicker`; declares
`pickerInstances` state; `handleInstall` is async and calls `fetchUserInstances()` with the
1 / 2+ / 0 branch logic; `handlePickerSelect` and `handlePickerAddNew` exist; and
`<InstancePicker .../>` is conditionally rendered. The card's `preventDefault`/`stopPropagation`
and `trackEvent` calls are preserved.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no new type errors).
- `grep` confirms `fetchUserInstances(` and `<InstancePicker` both appear in PluginCardActions.tsx.
- Manual smoke (optional, post-merge): on the browse page, an authed user with 2+ linked
  instances sees the picker; with exactly 1 instance the install redirects without a modal;
  with 0 instances the config modal appears.
</verification>

<success_criteria>
The browse-page card Install button follows the identical instance-resolution path as the
detail-page Install button: cached URL → silent redirect; single linked instance →
auto-select + redirect; multiple → picker; none → config modal. No regression to the
sign-in, badge, or config-completion behavior.
</success_criteria>

<output>
Create `.planning/quick/260530-gji-wire-plugincardactions-browse-page-insta/260530-gji-SUMMARY.md` when done.
</output>
