<div align="center">

# OpenClaw Context Doctor

**See how much of your AI agent's context window is already gone — before the conversation even starts.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-00ff88)](./LICENSE)
[![Website](https://img.shields.io/badge/Website-voxyz.space-00d4ff)](https://www.voxyz.space/)

[English](./README.md) | [中文](./README.zh-CN.md)

<br />

<img src="./docs/screenshot.png" alt="OpenClaw Context Doctor — token budget visualization" width="820" />

<br />

</div>

---

Part of the [OpenClaw](https://www.voxyz.space/) ecosystem — open-source tooling for AI agent operators.

## The Problem

Every agent platform silently loads system prompts, workspace files, tool schemas, and skill definitions into the context window before the user says a word. When that invisible overhead grows too large, conversation quality degrades — and there's no dashboard to tell you.

**Context Doctor makes that pressure visible.**

## Features

| | Feature | Description |
|---|---------|-------------|
| **1** | Dual data modes | Switch between bundled demo data and live filesystem scans |
| **2** | Bootstrap inspection | Scans 8 standard OpenClaw files with truncation detection |
| **3** | Skill discovery | Finds `SKILL.md` across the workspace plus common repo, Codex, Claude, and system skill directories |
| **4** | Budget visualization | Animated donut chart + segment bars showing overhead vs. free tokens |
| **5** | Health classification | Auto-labels Healthy / Moderate / Heavy based on bootstrap % |
| **6** | Snapshot comparison | View and compare multiple workspaces when the loaded snapshot includes them |
| **7** | Secure scanning | Path whitelist enforcement — no unrestricted directory browsing |

## Quick Start

```bash
git clone https://github.com/Heyvhuang/openclaw-context-doctor.git
cd openclaw-context-doctor
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). **Demo Snapshot works immediately** — no configuration needed.

## Environment Variables

To enable **Local Scan**, edit `.env.local`:

```env
CONTEXT_DOCTOR_ALLOWED_ROOTS=/Users/you/projects,/Users/you/.openclaw/workspace
CONTEXT_DOCTOR_WORKSPACE=/Users/you/projects/my-agent
CONTEXT_DOCTOR_CTX_SIZE=200000
```

| Variable | Required | Description |
|----------|:--------:|-------------|
| `CONTEXT_DOCTOR_ALLOWED_ROOTS` | Local Scan | Comma-separated absolute paths the scan API will accept |
| `CONTEXT_DOCTOR_WORKSPACE` | — | Default path when scan request omits `workspacePath` |
| `CONTEXT_DOCTOR_CTX_SIZE` | — | Context window size in tokens (default: `200000`) |

## Data Modes

| Mode | Endpoint | What it does |
|------|----------|-------------|
| **Demo Snapshot** | `GET /api/context-doctor/mock` | Returns bundled mock data — two workspaces, one healthy, one with warnings |
| **Local Scan** | `POST /api/context-doctor/scan` | Reads the real filesystem, requires `CONTEXT_DOCTOR_ALLOWED_ROOTS`, best used locally or on a trusted private deployment |

## API Reference

<details>
<summary><code>GET /api/context-doctor/mock</code></summary>

Returns a bundled `ContextDoctorSnapshot`. No auth, no config.

```bash
curl http://localhost:3000/api/context-doctor/mock
```

</details>

<details>
<summary><code>POST /api/context-doctor/scan</code></summary>

Scans a real workspace directory.

```bash
curl -X POST http://localhost:3000/api/context-doctor/scan \
  -H "Content-Type: application/json" \
  -d '{"workspacePath":"/Users/you/projects/my-agent","ctxSize":200000}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `workspacePath` | `string` | — | Absolute path. Falls back to `CONTEXT_DOCTOR_WORKSPACE`. |
| `ctxSize` | `number` | — | Context window size override |

**Error codes:** `400` invalid body, `403` outside allowed roots, `404` path missing, `500` scan error.

</details>

For public preview deployments, keep `Local Scan` disabled unless the deployment is private and you are comfortable exposing workspace metadata to its users.

## Health Classification

```
Healthy     bootstrap < 10%    ████░░░░░░  Plenty of room
Moderate    bootstrap 10–15%   ██████░░░░  Worth monitoring
Heavy       bootstrap > 15%    █████████░  Context pressure is real
```

## Project Structure

```
app/
  api/context-doctor/
    mock/route.ts ·············· GET  — bundled demo snapshot
    scan/route.ts ·············· POST — live filesystem scan
  globals.css ·················· Dark theme, CSS variables, chamfer clip-paths
  layout.tsx ··················· Root layout + Google Fonts
  page.tsx ····················· Home page
components/
  ContextDoctorDemo.tsx ········ Donut chart, file table, skill list, badges
  ContextDoctorExperience.tsx ·· Data mode switch, scan form, status bar
lib/
  context-doctor.ts ············ Core scanning logic
  context-doctor-snapshot.ts ··· TypeScript types + builders
  context-doctor-mock.ts ······· Mock data generator
  context-doctor-security.ts ··· Env parsing + path validation
  utils.ts ····················· cn() class utility
test/
  context-doctor.test.js ······· Unit tests
  context-doctor-api.test.js ··· API route tests
```

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 · Tailwind CSS v4 · Framer Motion |
| **Icons** | Lucide React |
| **Fonts** | Orbitron · JetBrains Mono · Share Tech Mono |
| **Testing** | Node.js built-in test runner |
| **Package manager** | pnpm |

## Development

```bash
pnpm dev        # dev server at localhost:3000
pnpm build      # production build
pnpm test       # run tests
```

## What This Repo Is Not

This is a clean extraction — a portable reference implementation. It intentionally **does not** include Supabase, remote VPS fetching, the broader operator product surface, or marketing pages.

## License

[MIT](./LICENSE)

## Contributing

Issues and PRs welcome — [github.com/Heyvhuang/openclaw-context-doctor](https://github.com/Heyvhuang/openclaw-context-doctor)

Learn more about the OpenClaw project at [voxyz.space](https://www.voxyz.space/).
