import { execSync } from "child_process";

async function runDeployDb() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL no configurada. Omitiendo sincronización de base de datos.");
    return;
  }

  console.log("DATABASE_URL detectada. Sincronizando esquema de base de datos con Prisma...");
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("✓ Esquema de base de datos sincronizado con éxito.");

    console.log("Asegurando base de datos limpia con catálogos normativos...");
    execSync("npx tsx scripts/clean-db.ts", { stdio: "inherit" });
    console.log("✓ Base de datos limpia y lista para operación real.");
  } catch (err) {
    console.error("Error durante deploy de base de datos:", err);
  }
}

runDeployDb();
