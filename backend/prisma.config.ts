// https://pris.ly/d/config-datasource
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seeds/index.ts",
  },
  datasource: {
    // https://github.com/prisma/prisma/issues/28607 - Placeholder to allow initialization without env vars, actual URL should be set in docker-compose.override.yml
    url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});