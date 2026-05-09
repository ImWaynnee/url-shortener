# Project State: URL Shortener

## Overview
A URL shortener (like bit.ly) built as a take-home assignment for a Fullstack Developer role.
Monorepo with NestJS backend, React+Vite+Tailwind frontend, PostgreSQL via Prisma.

## Tech Stack
- Backend: NestJS, Prisma v7 (https://www.prisma.io/docs/guides/frameworks/nestjs), PostgreSQL
- Frontend: React, Vite, TypeScript, Tailwind CSS, Axios
- Local dev: Docker Compose (postgres)
- Deployment: Cloudflare Pages (frontend) + AWS EC2/PM2 + RDS PostgreSQL
- Package Manager: PNPM
- Secrets: NestJSConfigModule (https://docs.nestjs.com/techniques/configuration)

## Architecture
Cloudflare Pages (React SPA)          → url.wyzwyz.xyz
        ↓  HTTPS (VITE_API_BASE_URL = https://sh-api.wyzwyz.xyz)
AWS EC2 — Nginx (two server blocks)
  sh-api.wyzwyz.xyz  → NestJS :3000  (all API routes: POST /urls/shorten, GET /ping, etc.)
  sh.wyzwyz.xyz      → NestJS :3000  (short-link redirects ONLY: GET /:shortUrl → 302)
        ↓  Prisma
AWS RDS PostgreSQL

Local dev equivalents (Cloudflare DNS A records → 127.0.0.1, proxied through Docker Nginx):
  sh-api-dev.wyzwyz.xyz  → API
  sh-dev.wyzwyz.xyz      → Redirects

Subdomain separation rationale:
  sh-api.*  = all reads/writes via the frontend (shorten, ping, future CRUD)
  sh.*      = ALWAYS a redirect, no other routes — zero path collision risk

## Decision Log

### [2026-05-09] Routing: subdomain-based (not path-prefix)
- Why: Path-prefix routing (/api/*) risks colliding with short codes that begin with "api" (e.g. /apifoo). Subdomain routing eliminates all ambiguity.
- How: Two Nginx server blocks — sh-api.wyzwyz.xyz (API) and sh.wyzwyz.xyz (redirects only).
- sh-api.* handles ALL API traffic — frontend always calls this explicitly.
- sh.* is ONLY ever used for short-link redirects (GET /:shortUrl → 302). No other routes exist here.
- NestJS has no global prefix; routes are /urls/shorten, /ping, etc.
- VITE_API_BASE_URL = https://sh-api.wyzwyz.xyz
- Frontend served from url.wyzwyz.xyz (Cloudflare Pages).

### [2026-05-08] Short code generation: nanoid(7)
- Use nanoid to generate and ensure we have auto-retry upon collisions.
- We choose this over sequential so there's no need to keep instances in sync.

### [2026-05-08] Frontend deployment: Cloudflare Pages
- I'm familiar with Cloudflare, free CDN + HTTPS, preview deployments per branch
- How: Static React build deployed from Git repo to Cloudflare Pages
- Wiring: `VITE_API_BASE_URL` env var in Cloudflare dashboard → EC2 backend URL

### [2026-05-08] CORS: explicit origins only
- NestJS main.ts origin: [FRONTEND_URL env var (url.wyzwyz.xyz in prod), 'http://localhost:7777']