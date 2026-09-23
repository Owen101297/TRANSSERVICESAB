export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function requireDatabaseInProduction(): void {
  if (isProductionRuntime() && !process.env.DATABASE_URL) {
    throw new Error("Base de datos no configurada en producción.");
  }
}

export function fallbackOrThrow<T>(error: unknown, fallback: T, context: string): T {
  if (isProductionRuntime()) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: ${detail}`);
  }
  return fallback;
}

export function rethrowMutationInProduction(error: unknown, context: string): void {
  if (isProductionRuntime()) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: ${detail}`);
  }
}
