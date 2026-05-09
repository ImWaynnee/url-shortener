<ProjectLayout>
- Backend: NestJS in `/backend`. Entry: `main.ts`.
- Frontend: React/Vite in `/frontend`. Entry: `main.tsx`.
- DB: PostgreSQL via Prisma. Schema at `/backend/prisma/schema.prisma`.
- DevOps: EC2/RDS. Nginx config at `/infra/nginx.conf`.
</ProjectLayout>

<BuildInstructions>
- Always run `pnpm install` from the root (workspaces).
- Backend: `docker compose up --build -d`.
- Database: `pnpm --filter backend migrate:dev` after schema changes.
- TODO :: Tests: `pnpm --filter backend test`.
</BuildInstructions>

# Memory Rule
- **Primary Source**: `.memory-bank/.md`.
- **Constraint**: Every time a significant architectural choice is made (e.g., changing a library, adding a DB index, modifying the Nginx flow), update the **Decision Log** section in that file.
- **Efficiency**: Don't worry about tracking tiny sub-tasks; focus on the big picture "Why" and "How."