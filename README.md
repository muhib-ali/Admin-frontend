# Admin Frontend (Admin Dashboard)

A modern admin dashboard built with Next.js (App Router), TypeScript, Tailwind CSS, and RBAC.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- NextAuth (Credentials/JWT)
- pnpm workspaces (monorepo)

## Repository Structure

This repo is a monorepo:

- `apps/admin-portal` = the main Next.js app
- `packages/*` = shared packages

```
final-upgraded-frontend/
├─ apps/
│  └─ admin-portal/         # Next.js app
├─ packages/                # Shared packages
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
└─ package.json             # Repo-level scripts (forwards to apps/admin-portal)
```

## Prerequisites

- Node.js (LTS recommended)
- pnpm (recommended version is defined in root `package.json` via `packageManager`)

Install pnpm if you don’t have it:

```bash
npm i -g pnpm
```

If `pnpm` is not recognized on Windows, ensure npm global bin is in PATH (commonly `C:\Users\<YOU>\npm-global`).

## Setup (Local Development)

### 1) Clone

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd final-upgraded-frontend
```

### 2) Install dependencies

```bash
pnpm install
```

### 3) Configure environment variables

Create `apps/admin-portal/.env.local` and set at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:5005

NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3005
AUTH_URL=http://localhost:3005
```

Notes:
- `NEXT_PUBLIC_API_URL` must point to your backend.
- `NEXTAUTH_URL` must match the frontend URL/port you run locally, otherwise login/logout redirects can go to the wrong port.

### 4) Run the dev server

From repo root:

```bash
pnpm run dev
```

App runs at:
- http://localhost:3005

## Production Build

From repo root:

```bash
pnpm run build
pnpm run start
```

## Scripts (Repo Root)

- `pnpm run dev` starts `apps/admin-portal` (Next dev on port 3005)
- `pnpm run build` builds `apps/admin-portal`
- `pnpm run start` runs the production server for `apps/admin-portal`
- `pnpm run lint` lints `apps/admin-portal`

## Common Troubleshooting

### Port already in use (3005)

Stop any running node processes and retry:

```powershell
taskkill /IM node.exe /F
```

### Logout redirects to wrong port

Make sure in `apps/admin-portal/.env.local`:

```env
NEXTAUTH_URL=http://localhost:3005
AUTH_URL=http://localhost:3005
```

Then restart `pnpm run dev`.

### Windows EPERM issues (file locks)

Stop node processes, remove app build output, and retry:

```powershell
taskkill /IM node.exe /F
Remove-Item -Recurse -Force .\apps\admin-portal\.next
pnpm run dev
```

## License

Private
