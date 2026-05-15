import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  // En Prisma 7 los datasource URLs se setean acá (afuera del schema).
  // El runtime del cliente usa el adapter (ver `lib/prisma.ts`); esta
  // URL se usa solo para los comandos de Migrate (migrate dev/deploy/status).
  datasource: {
    url: env("DATABASE_URL"),
  },
});
