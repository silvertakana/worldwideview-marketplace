# Ecosystem Survey: What UI overhaul changes exist in feat/instance-picker that haven't been ported?

**Date:** 2026-05-30
**Branch compared:** `feat/instance-picker` worktree vs current `feat/phase-2-auth-gate`
**Agents run:** 5 parallel
**Concerns:** ui-components, api-routes, pages, data-models, global-styles

---

## Conflicts Detected

| Type | Detail | Severity |
|------|--------|----------|
| API URL mismatch | feat uses `/api/instances` (401 for anon), main uses `/api/me/instances` (200+empty for anon) — same resource, different contract | conflict |
| SavedInstance interface | feat adds `createdAt: string` and `lastUsedAt: string`; main has only `id, url, nickname?` | conflict |
| fetchUserInstances endpoint | calls `/api/instances` in feat vs `/api/me/instances` in main | conflict |
| Browse page install state | feat drops `useMyInstalls` + Installed badges + `isAuthed` prop; main keeps them (Phase 14 work) | conflict |
| PluginCardActions | main is AHEAD: has multi-instance picker flow; feat does not (we just added this via quick task) | info |

---

## Findings by Category

### New in feat/instance-picker — not yet in main

| Component/File | What it does |
|---|---|
| `AvatarInitials.tsx` + `.module.css` | Deterministic circular avatar with initials, HSL hue derived from name/email hash — for user menu/account |
| `LinkedInstancesPanel.tsx` + `.module.css` | Manage panel: lists saved instances, inline nickname rename (Enter/Escape/blur), Remove with confirm, "+ Add another" button |
| `src/lib/instanceValidation.ts` | Server-side URL validator: parses, normalises to origin, rejects non-http(s) and marketplace self-loops. Returns discriminated union `InstanceValidationResult` |
| `src/lib/instanceValidation.spec.ts` | 8 Vitest cases covering all validation paths |
| `GET /api/instances` | Replaces `/api/me/instances`; returns `createdAt` + `lastUsedAt`; 401 for anon (not 200+empty) |
| `POST /api/instances/link` | Idempotently upserts a `LinkedInstance` row; bumps `lastUsedAt` on repeat; uses `validateInstanceUrl` |
| `DELETE /api/instances/[id]` | Ownership-checked instance removal (404 for wrong owner, not 403) |
| `PATCH /api/instances/[id]` | Nickname rename, trimmed to 80 chars, null-clears |

### Changed — feat version is better than main

| Component | Current (main) | feat version | Verdict |
|---|---|---|---|
| `InstancePicker.tsx` | `<ul>/<li>` layout, separate "Use This" button per row, raw URL shown, two stacked full-width buttons at bottom | Full-row `<button>` (entire row clickable), `displayLabel()` shows nickname-or-hostname, `formatLastUsed()` shows "3h ago", scrollable list (max-height 320px), "Use a different URL" link + "Cancel" secondary button side by side | Port feat version |
| `InstanceCapture.tsx` | localStorage only | After capture: fire-and-forget POST to `/api/instances/link` for cross-device sync | Port feat version |
| `InstanceConfig.tsx` | localStorage only | After save: fire-and-forget POST to `/api/instances/link` | Port feat version |
| `InstanceHydrator.tsx` | Minimal | On mount: always overwrites localStorage with server's most-recently-used instance (server is authoritative, 401 silently skipped) | Port feat version |
| `manage/page.tsx` | No error/empty states, no management UI | + LinkedInstancesPanel at bottom, + error state (AlertTriangle + Retry/Reconfigure), + empty state (Inbox icon), + Settings icon on Change Instance button | Port feat version |
| `account/page.tsx` | No linked instances or API keys sections | + server-rendered Linked Instances section (from Prisma), + API Keys section | Port feat version |
| `WipBanner.module.css` | Dark overlay `::before` pseudo-element + text-shadow | Simplified — overlay and text-shadow removed | Debatable (cosmetic) |
| `layout.tsx` | Raw `<script>` tag for theme init | Uses Next.js `<Script>` component + `ThemeProvider` wrapping | Port feat version |
| `Header.module.css` | `.userChip` hover with bg/border change | `.avatarChip` with glow effect using `--color-accent-subtle` box-shadow | Port feat version (goes with AvatarInitials) |

### Changed — main is AHEAD of feat (keep main's version)

| Component | What main added that feat doesn't have |
|---|---|
| `PluginCardActions.tsx` | Multi-instance picker flow (just added via quick task 260530-gji) |
| `PluginCardActions.module.css` | `.signIn` style for unauthenticated state |
| `InstallButton.module.css` | Auth-gate UI (`.authPrompt`, `.authIcon`, `.authMessage`, `.authSignIn`) |
| `browse/page.tsx` | `useMyInstalls` hook + Installed badges + `isAuthed` prop passed to cards (Phase 14) |
| `GET /api/me/installs` | Returns installed pluginIds — powers the Installed badge (Phase 14) |
| `GET /api/me/instances` | Phase 16 implementation — keep, or rename to `/api/instances` if we adopt feat's URL |

### No changes needed (identical or cosmetic only)

- `globals.css` — identical
- `next.config.ts` — identical
- `package.json` — same deps, feat is just one patch version behind
- `src/data/types.ts` — identical
- `src/hooks/usePlugins.ts` — identical
- `browse/[id]/page.tsx`, `submit/page.tsx` — line-ending diffs only

---

## Synthesis

The `feat/instance-picker` branch represents a coherent feature arc: server-persisted instances, cross-device sync via `InstanceHydrator`, instance management UI (`LinkedInstancesPanel`), and richer account/manage pages. The InstancePicker itself was also redesigned to be more polished (full-row clickable, relative timestamps).

The current `feat/phase-2-auth-gate` branch has independently advanced further in two areas that `feat/instance-picker` doesn't have: the multi-instance picker flow in `PluginCardActions` (just added), and the Phase 14 Installed badges on browse cards (`useMyInstalls`). These must not be regressed.

The central decision is the **API URL conflict**: feat uses `/api/instances` (strict 401 for anon), current uses `/api/me/instances` (permissive 200+empty). Renaming to `/api/instances` and switching to 401 is cleaner but breaks existing tests. Keeping `/api/me/instances` while adding the new CRUD sub-routes under `/api/instances/[id]` is a possible middle path.

---

## Recommended Port Order (by value/risk)

| Priority | Item | Risk | Why |
|---|---|---|---|
| 1 | `InstancePicker` UX redesign | Low | Pure UI improvement, no logic change, isolated component |
| 2 | `SavedInstance.lastUsedAt` + update API select | Low-Med | Needed for the picker's relative time display; small interface change |
| 3 | `instanceValidation.ts` + tests | Low | New server utility, no conflicts |
| 4 | `POST /api/instances/link` | Low | New route, enables fire-and-forget in InstanceCapture/Config |
| 5 | `InstanceCapture` + `InstanceConfig` fire-and-forget link call | Low | Depends on #4 |
| 6 | `InstanceHydrator` server-authoritative overwrite | Med | Changes existing behaviour; requires `/api/instances` to return 401 (or adapt to `/api/me/instances` 200+empty) |
| 7 | `DELETE/PATCH /api/instances/[id]` | Low | New routes, no conflicts |
| 8 | `LinkedInstancesPanel` component | Low | New component, no conflicts |
| 9 | `manage/page.tsx` improvements | Low-Med | Depends on #7 + #8 |
| 10 | `account/page.tsx` sections | Low | Server-rendered, additive |
| 11 | `AvatarInitials` + Header avatar chip | Low | Cosmetic, isolated |
| 12 | `layout.tsx` Script + ThemeProvider | Low | Infrastructure cleanup |
| 13 | API URL rename `/api/me/instances` → `/api/instances` | High | Test breakage, auth contract change — do last or skip |
