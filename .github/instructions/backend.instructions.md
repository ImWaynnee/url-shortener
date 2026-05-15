---
applyTo: "backend/**/*"
---
# NestJS & Prisma Standards
- **Architecture**: Follow the `Module -> Controller -> Service` pattern strictly.
- **Prisma**: 
    - Always use the injected `PrismaService`.
    - When modifying `schema.prisma`, remind the user to run `npx prisma migrate dev`.
    - **Transactions**: Any service method that spans more than one Prisma call (read-then-write, or multiple writes) MUST use `this.prisma.$transaction(async (tx) => { ... })`. Use the interactive (callback) form so conditional logic works correctly inside the transaction. Pass `tx` instead of `this.prisma` to every call inside. Never leave multi-step DB logic outside a transaction.
- **Validation**: 
    - All user inputs must be validated via DTOs using `class-validator` and `class-transformer`.
- **Error Handling**: Use built-in NestJS exceptions (e.g., `NotFoundException`, `BadRequestException`).
- **Logic**: Use nanoid(7) to generate shortUrls, and ensure auto-retry on collision.
- **Schema**: Refer to the ERD diagram for all table structure and types.
- **DTO**: For DTOs, use Request (for input) and Response (for output) suffixes instead.
- **Path Alias**: I'm using path alias, make sure tsconfig.js; jest.config.js is aligned.
- **Testing**: Use Jest for unit and integration tests. 
    - Spec files should be co-located with the code they test, named `*.spec.ts`. 
    - Integration tests should be written for all controllers, in the src/test/integration folder and named `*.integration-spec.ts`. We need cases for all valid and unhappy paths, and assert DB state for mutations, deep-dive into the controller and all possible variants and document necessary coverage concisely as a .md adjacent to the file `*.integration-spec.md`.