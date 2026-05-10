---
applyTo: "backend/**/*"
---
# NestJS & Prisma Standards
- **Architecture**: Follow the `Module -> Controller -> Service` pattern strictly.
- **Prisma**: 
    - Always use the injected `PrismaService`.
    - When modifying `schema.prisma`, remind the user to run `npx prisma migrate dev`.
- **Validation**: 
    - Use `class-validator` and `class-transformer` in DTOs.
    - All `POST /api/urls/shorten` requests must be validated against a `CreateUrlRequest`.
- **Error Handling**: Use built-in NestJS exceptions (e.g., `NotFoundException`, `BadRequestException`).
- **Logic**: Use nanoid(7) to generate shortUrls, and ensure auto-retry on collision.
- **Schema**: Refer to the ERD diagram for all table structure and types.
- **DTO**: For DTOs, use Request (for input) and Response (for output) suffixes instead.
- **Path Alias**: I'm using path alias, make sure tsconfig.js; jest.config.js is aligned.