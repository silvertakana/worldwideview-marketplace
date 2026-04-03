# WorldWideView Marketplace — Agent Rules

## 1. Project Identity

This repository (`worldwideview-marketplace`) is the **Plugin Marketplace** for the WorldWideView engine. It is a standalone web application where users can discover, browse, and securely install third-party plugins (data layers, static geojson, microservices) into their local instance of WorldWideView.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5, strict mode |
| Database | SQLite via Prisma (`better-sqlite3` adapter) |
| Styling | Vanilla CSS (`.module.css`) — **no Tailwind** |
| Icons | `lucide-react` |
| Package Manager | pnpm |

---

## 3. Architecture & Core Workflows

### 3.1 The Marketplace Bridge
The marketplace interfaces with the user's running WorldWideView instance (usually at `http://localhost:3000`) via a bridging mechanism. 
When a user clicks "Install":
1. The marketplace generates a secure, short-lived JWT token.
2. The user is redirected to the main engine with the token.
3. The main engine validates the token and installs the plugin manifest into its own local database.

### 3.2 Database & Registry
The marketplace uses a local SQLite database (`registry.db`) managed by Prisma to store the public directory of available plugins.

---

## 4. Critical Conventions

1. **File Size Limit**: If a file exceeds **150 lines**, modularize it.
2. **Styling Rules**: Use strictly vanilla CSS. No Tailwind or inline styles for layout.
3. **Bridge Security**: Any changes to the installation handoff process must strictly adhere to the Token/CORS validation logic established between this repo and the main engine.

---

## 5. Development & Deployment

```bash
pnpm dev    # Start the Dev Server
pnpm build  # Build the Next.js app
```

- **Deployment**: Deploys via Docker multi-stage build (`Dockerfile`).
- **Database**: Database state is contained in `registry.db`. Ensure migrations are synced if schema changes are made.
