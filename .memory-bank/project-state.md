# Project State: URL Shortener

## Overview
A URL shortener (like bit.ly) built as a take-home assignment for a Fullstack Developer role.
Monorepo with NestJS backend, React+Vite+Tailwind frontend, PostgreSQL via Prisma.

## Tech Stack
- Backend: NestJS, Prisma, PostgreSQL
- Frontend: React, Vite, TypeScript, Tailwind CSS, Axios
- Local dev: Docker Compose (postgres)
- Deployment: Cloudflare Pages (frontend) + AWS EC2/PM2 + RDS PostgreSQL

## Architecture
Cloudflare Pages (React SPA)          → www.domain.com
        ↓  HTTPS (VITE_API_BASE_URL = https://api.domain.com)
AWS EC2 — Nginx (two server blocks)
  sc-api.domain.com  → NestJS :3000  (POST /urls/shorten)
  sc.domain.com    → NestJS :3000  (GET /:shortUrl → 302)
        ↓  Prisma
AWS RDS PostgreSQL

## Decision Log

### [2026-05-09] Routing: subdomain-based (not path-prefix)
- Why: Path-prefix routing (/api/*) risks colliding with short codes that begin with "api" (e.g. /apifoo). Subdomain routing eliminates all ambiguity.
- How: Two Nginx server blocks — api.domain.com (API) and s.domain.com (redirects).
- NestJS global prefix removed; routes are /urls/shorten not /api/urls/shorten.
- VITE_API_BASE_URL = https://api.domain.com
- Cloudflare Pages serves www.domain.com (or the root domain).

### [2026-05-08] Short code generation: nanoid(7)
- Use nanoid to generate and ensure we have auto-retry upon collisions.
- We choose this over sequential so there's no need to keep instances in sync.

### [2026-05-08] Frontend deployment: Cloudflare Pages
- I'm familiar with Cloudflare, free CDN + HTTPS, preview deployments per branch
- How: Static React build deployed from Git repo to Cloudflare Pages
- Wiring: `VITE_API_BASE_URL` env var in Cloudflare dashboard → EC2 backend URL

### [2026-05-08] CORS: explicit origins only
- NestJS main.ts origin: [CLOUDFLARE_PAGES_DOMAIN, 'http://localhost:5173']