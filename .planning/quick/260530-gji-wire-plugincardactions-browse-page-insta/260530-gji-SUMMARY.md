---
phase: quick-260530-gji
plan: "01"
subsystem: marketplace-frontend
tags: [install-flow, instance-picker, browse-page, plugin-card]
dependency_graph:
  requires: []
  provides: [browse-page-multi-instance-install]
  affects: [src/components/PluginCardActions.tsx]
tech_stack:
  added: []
  patterns: [async-event-handler, conditional-modal-render]
key_files:
  modified:
    - src/components/PluginCardActions.tsx
decisions:
  - "Preserved e.preventDefault/stopPropagation in handleInstall since card lives inside a clickable link"
  - "Preserved trackEvent call position (before async work) so analytics fires even if user navigates away"
  - "handleConfigured kept its existing getInstanceUrl logic unchanged (not affected by picker path)"
metrics:
  duration: "5 minutes"
  completed: "2026-05-30"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase quick-260530-gji Plan 01: Wire PluginCardActions Multi-Instance Picker Flow Summary

**One-liner:** Browse-page card Install button now resolves instances via fetchUserInstances with cached-URL redirect, single-instance auto-select, multi-instance picker, and zero-instance config-modal paths -- matching InstallButton's detail-page flow exactly.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Wire multi-instance picker flow into PluginCardActions | f41055a | src/components/PluginCardActions.tsx |

## Changes Made

### src/components/PluginCardActions.tsx

**Imports added:**
- `setInstanceUrl`, `fetchUserInstances`, `SavedInstance` from `@/lib/instanceStore`
- `InstancePicker` from `./InstancePicker`

**State added:**
- `pickerInstances: SavedInstance[] | null` (initialized `null`)

**handleInstall refactored (sync -> async):**
1. `e.preventDefault()`, `e.stopPropagation()`, `trackEvent(...)` preserved at top
2. Cached URL check: `getInstanceUrl()` -> immediate redirect if found
3. `await fetchUserInstances()` when no cached URL
4. `length === 1`: auto-select, `setInstanceUrl`, redirect
5. `length > 1`: `setPickerInstances(instances)`
6. `length === 0`: `setShowConfig(true)`

**Handlers added:**
- `handlePickerSelect(instance)`: saves URL, clears picker, redirects
- `handlePickerAddNew()`: clears picker, opens config modal

**JSX added:**
- `{pickerInstances && <InstancePicker ... />}` rendered after existing InstanceConfig block

## Verification

- `tsc --noEmit` reports no errors for PluginCardActions.tsx
- `grep` confirms `fetchUserInstances(` and `<InstancePicker` both appear in the file
- Test suite: 65/66 tests pass; 1 pre-existing failure in `oauth/authorize/actions.spec.ts` (unrelated to this change)

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None -- no new network endpoints, auth paths, or trust-boundary changes introduced.

## Self-Check: PASSED

- `src/components/PluginCardActions.tsx` exists and contains all required changes
- Commit `f41055a` exists in git log
