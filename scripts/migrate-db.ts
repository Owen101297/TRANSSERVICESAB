import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const BASELINE = "00000000000000_baseline";
const prisma = new PrismaClient();

function runPrisma(args: string[]) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, ["prisma", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} terminó con código ${result.status}`);
  }
}

async function main() {
  const [state] = await prisma.$queryRawUnsafe<
    Array<{ persona_table: string | null; migrations_table: string | null }>
  >(`
    SELECT
      to_regclass('"Persona"')::text AS persona_table,
      to_regclass('"_prisma_migrations"')::text AS migrations_table
  `);

  if (state?.persona_table && !state.migrations_table) {
    console.log("Base existente detectada; registrando baseline de Prisma Migrate...");
    runPrisma(["migrate", "resolve", "--applied", BASELINE]);
  }

  runPrisma(["migrate", "deploy"]);
}

main()
  .catch((error) => {
    console.error("No fue posible aplicar las migraciones:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
