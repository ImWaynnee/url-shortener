<ProjectLayout>
- Backend: NestJS in `/backend`. Entry: `src/main.ts`.
- Frontend: React/Vite in `/frontend`. Entry: `src/main.tsx`.
- DB: PostgreSQL via Prisma. Schema at `/backend/prisma/schema.prisma`.
- DevOps: EC2/RDS. Nginx config at `/infra/nginx.conf`.
</ProjectLayout>

<BuildInstructions>
- Always run `pnpm install` from the root (workspaces).
- Backend build docker container in dev: `pnpm dev:backend`.
- Backend tests: `pnpm --filter backend test`.
- Frontend dev server: `pnpm dev:frontend`.
- Create database migration if schema changes: `pnpm --filter backend migrate:dev`.
</BuildInstructions>

# Memory Rule
- **Primary Source**: `.memory-bank/.md`.
- **Constraint**: Every time a significant architectural choice is made (e.g., changing a library, adding a DB index, modifying the Nginx flow), update the **Decision Log** section in that file.
- **Efficiency**: Don't worry about tracking tiny sub-tasks; focus on the big picture "Why" and "How."