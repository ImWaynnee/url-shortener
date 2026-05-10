---
applyTo: "infra/**/*, docker-compose.yml, **/main.ts"
---
# AWS & DevOps Standards
- **Reverse Proxy**: Nginx uses **subdomain-based** routing via two `server` blocks (do NOT use path-prefix `/api/*` — a short code beginning with "api" would collide):
    - `server_name api.domain.com` -> proxy_pass NestJS (Port 3000) — handles all API calls (e.g. `POST /urls/shorten`)
    - `server_name s.domain.com` -> proxy_pass NestJS (Port 3000) — handles all redirect calls (`GET /:shortUrl`)
- **NestJS global prefix**: Do NOT set a global `/api` prefix in `main.ts`. The subdomain already provides API context. Routes are `/urls/shorten`, not `/api/urls/shorten`.
- **CORS**: In NestJS `main.ts`, only allow the specific frontend production domain or `localhost:7777`.
- **Environment**: 
    - Database connection string must use the RDS endpoint in production.
    - Use `PM2` to manage the NestJS process on EC2.
- **Frontend Deployment**: The React app is deployed to Cloudflare Pages. Set `VITE_API_BASE_URL` as an environment variable in the Cloudflare Pages dashboard pointing to the EC2 backend domain.
- **CORS Origins**: Explicitly list the Cloudflare Pages production URL and `http://localhost:7777`. No wildcards permitted.